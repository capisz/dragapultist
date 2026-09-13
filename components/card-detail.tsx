"use client"
import { useState } from 'react'
import { copyDeckText } from '@/lib/deck-text'
import type { ImportedCard } from '@/lib/card-contract'

export function CardImage({ card, name, missing = false }: { card?: ImportedCard; name: string; missing?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <div className="exact-card-image">{card?.image && !missing && !failed ? <img src={card.image} alt={name} onError={() => setFailed(true)} /> : <div className="card-image-fallback"><strong>{name}</strong><small>{missing ? 'Exact printing not found' : failed ? 'Image unavailable' : 'Text-only card'}</small></div>}</div>
}
export function CardDetail({ card, missing, onAdd }: { card: ImportedCard; missing: boolean; onAdd?: () => void }) {
  const [copyStatus, setCopyStatus] = useState('')
  async function copyCode() { const code = card.id.replace('-', ' ').toUpperCase(); try { await copyDeckText(code); setCopyStatus('Code copied.') } catch { setCopyStatus(`Copy manually: ${code}`) } }
  return <article className="hydrated-card-detail" aria-label="Card details"><CardImage key={card.id} card={card} name={card.name} missing={missing} /><div><h4>{card.name}</h4><p>{card.set} · {card.number}</p><code>{card.id.toUpperCase()}</code>{!card.id.startsWith('text:') && <button type="button" className="secondary" onClick={copyCode}>Copy card code</button>}{copyStatus && <p role="status">{copyStatus}</p>}{missing && <p role="status">This exact printing is missing from the local index.</p>}{onAdd && <button type="button" className="secondary" onClick={onAdd}>Add one copy</button>}</div></article>
}
