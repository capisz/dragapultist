'use client'
import { useEffect, useRef, useState } from 'react'
import { prepareDesktopImport } from '@/lib/desktop-import'
import type { DesktopStatus, DesktopSettings, OverlaySettings } from '@/types/desktop'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function DesktopCompanion() {
 const [status,setStatus]=useState<DesktopStatus|null>(null)
 const [username,setUsername]=useState('')
 const [error,setError]=useState('')
 const [reviewLog,setReviewLog]=useState('')
 const accountRef=useRef<string|null>(null)
 const [visibilityShortcut,setVisibilityShortcut]=useState('')
 const [interactionShortcut,setInteractionShortcut]=useState('')
 const [idleOpacity,setIdleOpacity]=useState(35)
 useEffect(()=>{
  const api=window.dragapultistDesktop;if(!api||api.version!==1)return
  let busy=false, disposed=false
  const update=(s:DesktopStatus)=>{if(!disposed){accountRef.current=s.accountId;setStatus(s)}}
  const unsubscribe=api.onStatus(update)
  const drain=async()=>{if(busy||disposed)return;busy=true
   try{const item=await api.next();if(!item)return
    let game;try{game=prepareDesktopImport(item)}catch(e){await api.needsReview(item.id,e instanceof Error?e.message:'This log needs review.');return}
    const result=await api.submit(item.id,game)
    if(result.saved)window.dispatchEvent(new Event('dragapultist-games-changed'))
   }catch{if(!disposed)setError('Desktop sync is unavailable. Queued logs are retained.')}finally{busy=false}
  }
  const refresh=()=>{void api.status().then(update).catch(()=>{if(!disposed)setError('Could not read desktop status.')})}
  const refreshOverlay=()=>{void api.refreshOverlay?.().catch(()=>{if(!disposed)setError('Overlay statistics could not refresh. Your saved games are retained.')})}
  const imported=(event:Event)=>{const value=(event as CustomEvent<{id:string;duplicate:boolean}>).detail;const accountId=accountRef.current;if(accountId&&value)void api.reportImport?.({accountId,id:value.id,duplicate:value.duplicate}).catch(()=>{if(!disposed)setError('Game saved; overlay confirmation is unavailable.')})}
  refresh();const timer=setInterval(()=>void drain(),2000)
  window.addEventListener('dragapultist-auth-changed',refresh);window.addEventListener('online',refresh)
  window.addEventListener('dragapultist-games-changed',refreshOverlay);window.addEventListener('dragapultist-game-imported',imported)
  return()=>{disposed=true;clearInterval(timer);unsubscribe();window.removeEventListener('dragapultist-auth-changed',refresh);window.removeEventListener('online',refresh);window.removeEventListener('dragapultist-games-changed',refreshOverlay);window.removeEventListener('dragapultist-game-imported',imported)}
 },[])
 useEffect(()=>{setUsername(status?.username||'');setReviewLog('')},[status?.accountId,status?.username])
 useEffect(()=>{setVisibilityShortcut(status?.overlay?.visibilityShortcut||'');setInteractionShortcut(status?.overlay?.interactionShortcut||'')},[status?.overlay?.visibilityShortcut,status?.overlay?.interactionShortcut])
 useEffect(()=>{setIdleOpacity(Math.round((status?.overlay?.idleOpacity??0.35)*100))},[status?.overlay?.idleOpacity])
 if(!status)return null
 const configure=async(value:DesktopSettings)=>{try{setError('');setStatus(await window.dragapultistDesktop!.configure(value))}catch(e){setError(e instanceof Error?e.message:'Could not update settings.')}}
 const configureOverlay=async(value:OverlaySettings)=>{try{setError('');const overlay=await window.dragapultistDesktop!.configureOverlay!(value);setStatus(current=>current?{...current,overlay}:current)}catch(e){setError(e instanceof Error?e.message:'Could not update overlay settings.')}}
 return <aside className="desktop-companion" aria-label="Desktop capture">
  <details open={!status.enabled || !!status.error}>
   <summary>Desktop · {status.state} · {status.queued} queued{status.enabled?' · Clipboard capture on':''}</summary>
   <div className="desktop-settings">
    <p>When enabled, copied PTCGL logs are saved securely on this computer and imported into your signed-in account. Other clipboard text is ignored. Closing the window keeps capture running; Quit stops it.</p>
    {!status.signedIn&&<p>Sign in using the account menu to set up automatic import.</p>}
    <label htmlFor="desktop-username">Your Pokémon TCG Live username</label>
    <Input id="desktop-username" value={username} maxLength={80} onChange={e=>setUsername(e.target.value)} disabled={!status.signedIn}/>
    <div className="desktop-actions"><Button disabled={!status.signedIn||!username.trim()} onClick={()=>void configure({username,enabled:true})}>Save username & enable capture</Button><Button variant="outline" disabled={!status.enabled} onClick={()=>void configure({enabled:false})}>Pause capture</Button></div>
    <label><input type="checkbox" checked={status.notifications} onChange={e=>void configure({notifications:e.target.checked})}/> Import notifications</label>
    <label><input type="checkbox" checked={status.launchAtLogin} onChange={e=>void configure({launchAtLogin:e.target.checked})}/> Start Dragapultist when I sign in to this computer</label>
    {status.overlay&&window.dragapultistDesktop?.configureOverlay&&<fieldset className="overlay-settings">
     <legend>Game overlay</legend>
     <label><input type="checkbox" checked={status.overlay.enabled} onChange={e=>void configureOverlay({enabled:e.target.checked})}/> Show stats over Pokémon TCG Live</label>
     <p>Your latest deck’s record, recent results, and today’s record appear when the game is focused. Clicks pass through until you enable interaction. Today uses recorded game dates; copied desktop logs use the capture date.</p>
     {typeof status.overlay.idleOpacity==='number'&&<>
      <label htmlFor="overlay-idle-opacity">Idle opacity · {idleOpacity}%</label>
      <input id="overlay-idle-opacity" type="range" min={0} max={100} step={1} value={idleOpacity} aria-describedby="overlay-opacity-help" aria-valuetext={`${idleOpacity}% opacity`} onChange={e=>setIdleOpacity(Number(e.target.value))}/>
      <p id="overlay-opacity-help">0% hides the panel; 100% keeps it opaque. Hover, interaction, and import notices reveal it fully. Clicks still pass through in view mode.</p>
      <div className="desktop-actions"><Button variant="outline" disabled={idleOpacity===Math.round(status.overlay.idleOpacity*100)} onClick={()=>void configureOverlay({idleOpacity:idleOpacity/100})}>Save opacity</Button></div>
     </>}
     <label htmlFor="overlay-visibility-shortcut">Show / hide shortcut</label>
     <Input id="overlay-visibility-shortcut" value={visibilityShortcut} maxLength={80} onChange={e=>setVisibilityShortcut(e.target.value)}/>
     <label htmlFor="overlay-interaction-shortcut">Interact / return to game shortcut</label>
     <Input id="overlay-interaction-shortcut" value={interactionShortcut} maxLength={80} onChange={e=>setInteractionShortcut(e.target.value)}/>
     <div className="desktop-actions"><Button variant="outline" onClick={()=>void configureOverlay({visibilityShortcut,interactionShortcut})}>Save shortcuts</Button><Button variant="outline" onClick={()=>void configureOverlay({position:null})}>Reset position</Button><Button variant="outline" disabled={!status.overlay.selectedDeckKey} onClick={()=>void configureOverlay({selectedDeckKey:null})}>Follow latest game</Button></div>
     <p>Use the tray menu if a shortcut is unavailable. Press Escape while interacting to return control to the game.</p>
     {[status.overlay.error,status.overlay.statsError,...status.overlay.shortcutErrors].filter(Boolean).map(message=><p role="status" key={message}>{message}</p>)}
    </fieldset>}
    {(status.error||error)&&<p role="alert">{status.error||error}</p>}
    {!!status.review.length&&<section aria-label="Logs needing review"><h3>Needs review</h3>{status.review.map(item=><div key={item.id}><p>{new Date(item.capturedAt).toLocaleString()} — {item.reason}</p><Button variant="outline" onClick={()=>{void window.dragapultistDesktop!.inspect(item.id).then(setReviewLog).catch(()=>setError('Could not open queued log.'))}}>View log</Button> <Button variant="outline" onClick={()=>{void window.dragapultistDesktop!.retry(item.id,username).then(setStatus).catch(()=>setError('Check your username and sign-in before retrying.'))}}>Retry with entered username</Button></div>)}{reviewLog&&<textarea aria-label="Queued game log" value={reviewLog} readOnly rows={10}/>}</section>}
   </div>
  </details>
 </aside>
}
