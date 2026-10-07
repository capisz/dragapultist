const { app, BrowserWindow, clipboard, ipcMain, Tray, Menu, nativeImage, shell, Notification, safeStorage, session, screen, globalShortcut } = require('electron')
const path = require('node:path')
const { createHash } = require('node:crypto')
const clipboardHash = text => createHash('sha256').update(text).digest('hex')
const { pathToFileURL } = require('node:url')
const { syncEntry } = require('./transport.cjs')
const { DurableQueue, looksLikeLog } = require('./queue.cjs')
const { GameOverlay } = require('./overlay.cjs')
const { readGameFocus, returnGameFocus } = require('./game-focus.cjs')
const PRODUCTION = 'https://dragapultist.vercel.app'
const requested = process.env.DRAGAPULTIST_URL
const base = !app.isPackaged && requested && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(requested) ? requested.replace(/\/$/,'') : PRODUCTION
const offlineURL = pathToFileURL(path.join(__dirname, 'offline.html')).href
let window, tray, queue, webSession, overlay, quitting = false, fatal = '', online = false, identity = null, lastClipboardHash = '', polling = false, submitting = false, syncingIdentity = null
let timers = []
function trusted(event) { return window && event.sender === window.webContents && event.senderFrame === event.sender.mainFrame && new URL(event.senderFrame.url).origin === base }
function snapshot() {
  const settings = queue?.data.settings || {}
  const owner = identity?.uid || settings.owner
  const entries = queue?.data.entries.filter(e => e.owner === owner) || []
  return { version:1, signedIn:!!identity, accountId:identity?.uid || null, enabled:!!settings.enabled, username:settings.username || '', notifications:settings.notifications !== false, launchAtLogin:!!settings.launchAtLogin, queued:entries.length,
    state:fatal ? 'Paused' : !online ? 'Offline—queued' : !identity ? 'Sign-in required' : entries.some(e=>e.state==='review') ? 'Needs review' : !settings.enabled ? 'Paused' : !entries.length && queue?.data.lastSynced && Date.now()-queue.data.lastSynced < 6000 ? 'Synced' : 'Capturing',
    error:fatal || null, overlay:overlay?.status(), review: identity ? entries.filter(e=>e.state==='review').map(({id,reason,capturedAt,username})=>({id,reason,capturedAt,username})) : [] }
}
function notify(message) { if (queue?.data.settings.notifications && Notification.isSupported()) new Notification({ title:'Dragapultist', body:message }).show() }
function emit() {
  const value = snapshot()
  overlay?.setCaptureStatus(value.state)
  if (window && !window.isDestroyed() && window.webContents.getURL().startsWith(base+'/')) window.webContents.send('desktop:status', value)
  if (tray) { tray.setToolTip(`Dragapultist: ${value.state} (${value.queued} queued)`); tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Open Dragapultist',click:()=>{window.show();window.focus()}},
    {label:queue?.data.settings.enabled?'Pause capture':'Resume capture',enabled:!!queue&&!fatal,click:async()=>{try{await configure({enabled:!queue.data.settings.enabled})}catch(e){notify(e.message)}emit()}},
    {label:'Game overlay',submenu:[
      {label:'Enable overlay',type:'checkbox',checked:!!overlay?.settings.enabled,enabled:!!queue&&!fatal,click:async item=>{try{await overlay.configure({enabled:item.checked})}catch(e){notify(e.message)}}},
      {label:overlay?.hidden?'Show when game is focused':'Hide overlay',enabled:!!overlay?.settings.enabled,click:()=>overlay.toggleVisibility()},
      {label:overlay?.interactive?'Return control to game':'Interact with overlay',enabled:!!overlay?.settings.enabled&&!!overlay?.gameBounds,click:()=>void overlay.interactFromTray().catch(()=>notify('Focus Pokémon TCG Live, then use Interact with overlay.'))},
      {label:'Reset overlay position',enabled:!!overlay?.settings.enabled,click:()=>void overlay.configure({position:null}).then(()=>overlay.poll()).catch(e=>notify(e.message))},
      {label:'Idle opacity',enabled:!!overlay,submenu:[...new Set([0,35,65,100,Math.round((overlay?.settings.idleOpacity??0.35)*100)])].sort((a,b)=>a-b).map(percent=>({label:percent===0?'0% — invisible':`${percent}%`,type:'radio',checked:Math.round((overlay?.settings.idleOpacity??0.35)*100)===percent,click:()=>void overlay.configure({idleOpacity:percent/100}).catch(e=>notify(e.message))}))},
      {label:'Edit overlay shortcuts in Dragapultist',click:()=>{window.show();window.focus()}},
    ]},
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
    } catch { online=false; identity=null; return null } finally { syncingIdentity=null; overlay?.setAccount(identity?.uid || null); emit() }
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
    const s=queue.data.settings;if(await queue.add(text,s.owner,s.username)){const entry=queue.data.entries.find(e=>e.owner===s.owner&&e.rawLog===text);if(entry)overlay?.notice('queued',entry.id,s.owner);notify(online?'Game log queued.':'Offline: game log saved to the queue.');emit()}
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
    if(result.authExpired){identity=null;overlay?.setAccount(null)}
    if(result.saved){overlay?.notice(result.duplicate?'duplicate':'saved',entry.id,entry.owner);notify(result.duplicate?'Game was already synced.':'Game synced to Dragapultist.')}
    else {const pending=queue.data.entries.find(e=>e.id===entry.id&&e.owner===entry.owner);overlay?.notice(pending?.state==='review'?'review':'failed',entry.id,entry.owner)}
    return result
  }catch{const entry=queue?.data.entries.find(e=>e.id===value?.id);if(entry)await queue.fail(entry.id,entry.owner,'Connection interrupted; retrying.');return {saved:false}}
  finally{submitting=false;emit()}
}
function createWindow(){
  window=new BrowserWindow({width:1280,height:800,show:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'persist:dragapultist',backgroundThrottling:false}})
  window.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))void shell.openExternal(url);return {action:'deny'}})
  const restrictNavigation=(event,url)=>{if(new URL(url).origin!==base){event.preventDefault();if(/^https?:/.test(url))void shell.openExternal(url)}}
  window.webContents.on('will-navigate',restrictNavigation)
  window.webContents.on('will-redirect',restrictNavigation)
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
  overlay=new GameOverlay({
    app,BrowserWindow,ipcMain,screen,globalShortcut,returnGameFocus,
    readFocus:async()=>{const focus=await readGameFocus();if(process.platform==='win32'&&focus.bounds)focus.bounds=screen.screenToDipRect(null,focus.bounds);return focus},
    settings:queue?.data.settings.overlay,
    saveSettings:async settings=>{if(!queue||fatal)throw Error('Overlay settings cannot be saved. Your existing queue is preserved.');await queue.configure({overlay:settings})},
    readStats:async accountId=>{
      if(identity?.uid!==accountId||!online)throw Error('Sign in to load overlay statistics.')
      const response=await webSession.fetch(base+'/api/statistics',{cache:'no-store',signal:AbortSignal.timeout(15000)})
      if(response.status===401){identity=null;overlay.setAccount(null);emit();throw Error('Sign-in required')}
      const data=await responseJSON(response)
      if(identity?.uid!==accountId||!online)throw Error('Account changed')
      return data
    },
    onChange:()=>emit(),
  })
  overlay.start()
  const icon=nativeImage.createFromPath(path.join(__dirname,'assets/icon.png')).resize({width:20,height:20})
  tray=new Tray(icon);tray.on('click',()=>{window.show();window.focus()});emit()
  ipcMain.handle('desktop:request',async(event,request)=>{
    if(!trusted(event)||request?.version!==1)throw Error('Untrusted desktop request')
    const {method,value}=request
    if(method==='status'){await refreshIdentity();return snapshot()}
    if(method==='configure')return configure(value)
    if(method==='overlay:configure')return overlay.configure(value)
    if(method==='overlay:refresh'){await refreshIdentity();await overlay.refreshStats();return overlay.status()}
    if(method==='overlay:import'){
      if(!identity||value?.accountId!==identity.uid||typeof value?.id!=='string'||!value.id||value.id.length>128||typeof value?.duplicate!=='boolean')throw Error('Invalid import confirmation')
      const owner=identity.uid;await refreshIdentity()
      if(identity?.uid!==owner)throw Error('Account changed')
      overlay.notice(value.duplicate?'duplicate':'saved',value.id,owner);return overlay.status()
    }
    if(!queue||fatal)return null
    if(method==='inspect'){const e=queue.data.entries.find(e=>e.id===value?.id&&e.owner===identity?.uid);if(!e)throw Error('Log unavailable');return e.rawLog}
    if(method==='next'){if(!identity||!online)return null;const e=queue.next(identity.uid);return e?{id:e.id,rawLog:e.rawLog,username:e.username,capturedAt:e.capturedAt}:null}
    if(method==='submit')return submit(value)
    if(method==='review'){if(identity&&typeof value?.reason==='string'){await queue.fail(value.id,identity.uid,value.reason.slice(0,240),true);overlay.notice('review',value.id,identity.uid)}emit();return snapshot()}
    if(method==='retry'){if(!identity||typeof value?.username!=='string'||!value.username.trim()||value.username.length>80)throw Error('Sign in and enter the correct PTCGL username.');await queue.review(value.id,identity.uid,value.username.trim());emit();return snapshot()}
    throw Error('Unknown desktop operation')
  })
  timers.push(setInterval(()=>void capture(),1000),setInterval(async()=>{await refreshIdentity();if(online&&window.webContents.getURL()===offlineURL)void window.loadURL(base).catch(()=>{})},30000))
  app.on('activate',()=>{if(overlay?.interactive)overlay.window?.focus();else window.show()})
 })
 app.on('before-quit',event=>{if(quitting)return;event.preventDefault();quitting=true;timers.forEach(clearInterval);overlay?.stop();Promise.all([queue?.tail,overlay?.tail]).finally(()=>app.quit())})
 app.on('window-all-closed',()=>{})
}
