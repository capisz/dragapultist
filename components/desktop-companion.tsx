'use client'
import { useEffect, useState } from 'react'
import { prepareDesktopImport } from '@/lib/desktop-import'
import type { DesktopStatus, DesktopSettings } from '@/types/desktop'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function DesktopCompanion() {
 const [status,setStatus]=useState<DesktopStatus|null>(null)
 const [username,setUsername]=useState('')
 const [error,setError]=useState('')
 const [reviewLog,setReviewLog]=useState('')
 useEffect(()=>{
  const api=window.dragapultistDesktop;if(!api||api.version!==1)return
  let busy=false, disposed=false
  const update=(s:DesktopStatus)=>{if(!disposed)setStatus(s)}
  const unsubscribe=api.onStatus(update)
  const drain=async()=>{if(busy||disposed)return;busy=true
   try{const item=await api.next();if(!item)return
    let game;try{game=prepareDesktopImport(item)}catch(e){await api.needsReview(item.id,e instanceof Error?e.message:'This log needs review.');return}
    const result=await api.submit(item.id,game)
    if(result.saved)window.dispatchEvent(new Event('dragapultist-games-changed'))
   }catch{if(!disposed)setError('Desktop sync is unavailable. Queued logs are retained.')}finally{busy=false}
  }
  const refresh=()=>{void api.status().then(update).catch(()=>{if(!disposed)setError('Could not read desktop status.')})}
  refresh();const timer=setInterval(()=>void drain(),2000)
  window.addEventListener('dragapultist-auth-changed',refresh);window.addEventListener('online',refresh)
  return()=>{disposed=true;clearInterval(timer);unsubscribe();window.removeEventListener('dragapultist-auth-changed',refresh);window.removeEventListener('online',refresh)}
 },[])
 useEffect(()=>{setUsername(status?.username||'');setReviewLog('')},[status?.accountId,status?.username])
 if(!status)return null
 const configure=async(value:DesktopSettings)=>{try{setError('');setStatus(await window.dragapultistDesktop!.configure(value))}catch(e){setError(e instanceof Error?e.message:'Could not update settings.')}}
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
    {(status.error||error)&&<p role="alert">{status.error||error}</p>}
    {!!status.review.length&&<section aria-label="Logs needing review"><h3>Needs review</h3>{status.review.map(item=><div key={item.id}><p>{new Date(item.capturedAt).toLocaleString()} — {item.reason}</p><Button variant="outline" onClick={()=>{void window.dragapultistDesktop!.inspect(item.id).then(setReviewLog).catch(()=>setError('Could not open queued log.'))}}>View log</Button> <Button variant="outline" onClick={()=>{void window.dragapultistDesktop!.retry(item.id,username).then(setStatus).catch(()=>setError('Check your username and sign-in before retrying.'))}}>Retry with entered username</Button></div>)}{reviewLog&&<textarea aria-label="Queued game log" value={reviewLog} readOnly rows={10}/>}</section>}
   </div>
  </details>
 </aside>
}
