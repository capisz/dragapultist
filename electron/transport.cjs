// Only a successful authenticated server acknowledgement can remove a queued log.
async function syncEntry({ fetch, queue, entry, game, base, auth }) {
  if (!auth?.user || auth.user.uid !== entry.owner || game?.rawLog !== entry.rawLog) return { saved:false, authExpired:true }
  try {
    const response = await fetch(base+'/api/games', {
      method:'POST', signal:AbortSignal.timeout(30000),
      headers:{'Content-Type':'application/json','Origin':base,'X-CSRF-Token':auth.csrfToken,'X-Desktop-Owner':entry.owner},
      body:JSON.stringify({game,idempotencyKey:entry.id}),
    })
    const payload = await response.json().catch(()=>null)
    if(response.ok && payload?.saveState==='saved' && typeof payload?.game?.id==='string') {
      await queue.acknowledge(entry.id,entry.owner)
      return {saved:true,duplicate:!!payload.duplicate}
    }
    if(response.status===401) return {saved:false,authExpired:true}
    await queue.fail(entry.id,entry.owner,response.status===400?'The server rejected this log; review it before retrying.':'Sync failed; the log is retained.',response.status===400)
  } catch { await queue.fail(entry.id,entry.owner,'Connection interrupted; retrying.') }
  return {saved:false}
}
module.exports={syncEntry}
