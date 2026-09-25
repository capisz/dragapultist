const { app, BrowserWindow, clipboard, ipcMain, Tray, Menu, nativeImage, shell, Notification, safeStorage, session } = require('electron')
const path = require('node:path')
const { createHash } = require('node:crypto')
const clipboardHash = text => createHash('sha256').update(text).digest('hex')
const { pathToFileURL } = require('node:url')
const { syncEntry } = require('./transport.cjs')
const { DurableQueue, looksLikeLog } = require('./queue.cjs')
const PRODUCTION = 'https://dragapultist.vercel.app'
const requested = process.env.DRAGAPULTIST_URL
const base = !app.isPackaged && requested && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(requested) ? requested.replace(/\/$/,'') : PRODUCTION
const offlineURL = pathToFileURL(path.join(__dirname, 'offline.html')).href
let window, tray, queue, webSession, quitting = false, fatal = '', online = false, identity = null, lastClipboardHash = '', polling = false, submitting = false, syncingIdentity = null
let timers = []
function trusted(event) { return window && event.sender === window.webContents && event.senderFrame === event.sender.mainFrame && new URL(event.senderFrame.url).origin === base }
function snapshot() {
  const settings = queue?.data.settings || {}
  const owner = identity?.uid || settings.owner
  const entries = queue?.data.entries.filter(e => e.owner === owner) || []
  return { version:1, signedIn:!!identity, accountId:identity?.uid || null, enabled:!!settings.enabled, username:settings.username || '', notifications:settings.notifications !== false, launchAtLogin:!!settings.launchAtLogin, queued:entries.length,
    state:fatal ? 'Paused' : !online ? 'Offline—queued' : !identity ? 'Sign-in required' : entries.some(e=>e.state==='review') ? 'Needs review' : !settings.enabled ? 'Paused' : !entries.length && queue?.data.lastSynced && Date.now()-queue.data.lastSynced < 6000 ? 'Synced' : 'Capturing',
    error:fatal || null, review: identity ? entries.filter(e=>e.state==='review').map(({id,reason,capturedAt,username})=>({id,reason,capturedAt,username})) : [] }
}
function notify(message) { if (queue?.data.settings.notifications && Notification.isSupported()) new Notification({ title:'Dragapultist', body:message }).show() }
function emit() {
  const value = snapshot()
  if (window && !window.isDestroyed() && window.webContents.getURL().startsWith(base+'/')) window.webContents.send('desktop:status', value)
  if (tray) { tray.setToolTip(`Dragapultist: ${value.state} (${value.queued} queued)`); tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Open Dragapultist',click:()=>{window.show();window.focus()}},
    {label:queue?.data.settings.enabled?'Pause capture':'Resume capture',enabled:!!queue&&!fatal,click:async()=>{try{await configure({enabled:!queue.data.settings.enabled})}catch(e){notify(e.message)}emit()}},
    {label:`${value.queued} queued · ${value.state}`,enabled:false},
    {label:'Quit Dragapultist',click:()=>app.quit()},
  ])) }
}
async function responseJSON(response) { const body = await response.json().catch(()=>null); if (!response.ok || !body) throw Error('The server is unavailable. Queued logs are retained.'); return body }
async function refreshIdentity() {
  if (syncingIdentity) return syncingIdentity
  syncingIdentity = (async()=>{
    try {
      const response = await webSession.fetch(base+'/api/auth/session', {cache:'no-store',signal:AbortSignal.timeout(15000)})
      const data = await responseJSON(response)
      if (!Object.hasOwn(data,'user')) throw Error('The website needs the desktop sync update.')
      online = true; identity = data.user && typeof data.user.uid === 'string' ? data.user : null
      if (queue && identity && queue.data.settings.owner !== identity.uid) { await queue.configure({owner:identity.uid,username:'',enabled:false}); lastClipboardHash=clipboardHash(clipboard.readText()) }
      if (!identity && queue?.data.settings.enabled) await queue.configure({enabled:false})
      return data
    } catch { online=false; identity=null; return null } finally { syncingIdentity=null; emit() }
  })()
  return syncingIdentity
}
async function configure(value) {
  if (!queue || fatal) throw Error(fatal || 'Queue unavailable')
  const patch = {}
  if (typeof value?.username === 'string') { const name=value.username.trim();if(!name||name.length>80)throw Error('Enter your PTCGL username (1–80 characters).');patch.username=name }
  for(const k of ['enabled','notifications','launchAtLogin']) if(typeof value?.[k]==='boolean')patch[k]=value[k]
  if(patch.enabled===true){await refreshIdentity();if(!identity)throw Error('Sign in before enabling capture.');if(!(patch.username||queue.data.settings.username))throw Error('Enter your PTCGL username first.');patch.owner=identity.uid;lastClipboardHash=clipboardHash(clipboard.readText())}
  if (Object.hasOwn(patch,'launchAtLogin')) app.setLoginItemSettings({openAtLogin:patch.launchAtLogin})
  await queue.configure(patch);emit();return snapshot()
}
async function capture() {
  if(polling||fatal||!queue?.data.settings.enabled||!queue.data.settings.owner)return
  polling=true
  try{const text=clipboard.readText();const hash=clipboardHash(text);if(hash===lastClipboardHash)return;lastClipboardHash=hash;if(!looksLikeLog(text))return
    const s=queue.data.settings;if(await queue.add(text,s.owner,s.username)){notify(online?'Game log queued.':'Offline: game log saved to the queue.');emit()}
  }catch{fatal='Could not save the clipboard log. Capture paused. Your existing queue is preserved; restart and copy this log again.';notify(fatal);emit()}finally{polling=false}
}
async function submit(value) {
  if(submitting)return {saved:false}
  submitting=true
  try{
    const auth=await refreshIdentity();if(!auth?.user)return {saved:false}
    const entry=queue.data.entries.find(e=>e.id===value?.id&&e.owner===auth.user.uid)
    if(!entry||entry.rawLog!==value?.game?.rawLog)throw Error('Invalid queue delivery')
    const result=await syncEntry({fetch:(...args)=>webSession.fetch(...args),queue,entry,game:value.game,base,auth})
    if(result.authExpired)identity=null
    if(result.saved)notify(result.duplicate?'Game was already synced.':'Game synced to Dragapultist.')
    return result
  }catch{const entry=queue?.data.entries.find(e=>e.id===value?.id);if(entry)await queue.fail(entry.id,entry.owner,'Connection interrupted; retrying.');return {saved:false}}
  finally{submitting=false;emit()}
}
function createWindow(){
  window=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'persist:dragapultist',backgroundThrottling:false}})
  window.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))void shell.openExternal(url);return {action:'deny'}})
  window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==base){event.preventDefault();if(/^https?:/.test(url))void shell.openExternal(url)}})
  window.webContents.on('will-attach-webview',event=>event.preventDefault())
  window.webContents.on('did-fail-load',(_e,code,_desc,_url,main)=>{if(main&&code!==-3&&_url!==offlineURL)void window.loadFile(path.join(__dirname,'offline.html'))})
  window.webContents.on('did-finish-load',()=>{void refreshIdentity();emit()})
  window.on('close',event=>{if(!quitting){event.preventDefault();window.hide()}})
  window.once('ready-to-show',()=>window.show())
  void window.loadURL(base).catch(()=>{})
  if(!app.isPackaged&&process.env.DRAGAPULTIST_DEVTOOLS==='1')window.webContents.openDevTools({mode:'detach'})
}
if(!app.requestSingleInstanceLock())app.quit()
else {
 app.on('second-instance',()=>{window?.show();window?.focus()})
 app.whenReady().then(async()=>{
  // Stable per-user location: upgrades and uninstall must not erase queued logs.
  webSession=session.fromPartition('persist:dragapultist')
  webSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false))
  webSession.setPermissionCheckHandler(()=>false)
  try {
    if(!await safeStorage.isAsyncEncryptionAvailable())throw Error('OS encryption is unavailable. Capture is disabled.')
    queue=new DurableQueue(path.join(app.getPath('userData'),'capture-queue.enc'),{encrypt:s=>safeStorage.encryptStringAsync(s),decrypt:b=>safeStorage.decryptStringAsync(b)})
    await queue.load()
  }catch(e){fatal=e.message;queue=null}
  lastClipboardHash=clipboardHash(clipboard.readText())
  createWindow()
  const icon=nativeImage.createFromPath(path.join(__dirname,'assets/icon.png')).resize({width:20,height:20})
  tray=new Tray(icon);tray.on('click',()=>{window.show();window.focus()});emit()
  ipcMain.handle('desktop:request',async(event,request)=>{
    if(!trusted(event)||request?.version!==1)throw Error('Untrusted desktop request')
    const {method,value}=request
    if(method==='status'){await refreshIdentity();return snapshot()}
    if(method==='configure')return configure(value)
    if(!queue||fatal)return null
    if(method==='inspect'){const e=queue.data.entries.find(e=>e.id===value?.id&&e.owner===identity?.uid);if(!e)throw Error('Log unavailable');return e.rawLog}
    if(method==='next'){if(!identity||!online)return null;const e=queue.next(identity.uid);return e?{id:e.id,rawLog:e.rawLog,username:e.username,capturedAt:e.capturedAt}:null}
    if(method==='submit')return submit(value)
    if(method==='review'){if(identity&&typeof value?.reason==='string')await queue.fail(value.id,identity.uid,value.reason.slice(0,240),true);emit();return snapshot()}
    if(method==='retry'){if(!identity||typeof value?.username!=='string'||!value.username.trim()||value.username.length>80)throw Error('Sign in and enter the correct PTCGL username.');await queue.review(value.id,identity.uid,value.username.trim());emit();return snapshot()}
    throw Error('Unknown desktop operation')
  })
  timers.push(setInterval(()=>void capture(),1000),setInterval(async()=>{await refreshIdentity();if(online&&window.webContents.getURL()===offlineURL)void window.loadURL(base).catch(()=>{})},30000))
  app.on('activate',()=>window.show())
 })
 app.on('before-quit',event=>{if(quitting)return;event.preventDefault();quitting=true;timers.forEach(clearInterval);Promise.resolve(queue?.tail).finally(()=>app.quit())})
 app.on('window-all-closed',()=>{})
}
