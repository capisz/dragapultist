"use client"
import { useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import { cardResponseSchema, CARD_ID_PATTERN, type ImportedCard } from '@/lib/card-contract'
import { CardDetail } from './card-detail'

const matchesSchema = z.object({ cards: z.array(z.object({ name: z.string().max(200), code: z.string().max(40), set: z.string().max(200).optional(), number: z.string().max(40).optional() })).max(12) })
type Match = z.infer<typeof matchesSchema>['cards'][number]
export function CardSearch({ onAdd }: { onAdd: (card: ImportedCard) => void }) {
  const [query, setQuery] = useState(''), [matches, setMatches] = useState<Match[]>([])
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1), [status, setStatus] = useState('')
  const [card, setCard] = useState<ImportedCard | null>(null), [missing, setMissing] = useState(false)
  const [detailError, setDetailError] = useState(''), [selectedId, setSelectedId] = useState(''), [loading, setLoading] = useState(false)
  const detailRequest = useRef<AbortController | null>(null)
  const id = useId()
  useEffect(() => () => detailRequest.current?.abort(), [])
  useEffect(() => {
    setMatches([]); setActive(-1); setStatus('')
    if (query.trim().length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('Searching…')
      try {
        const exactId = query.trim().toLowerCase().replace(/\s+/, '-')
        if (CARD_ID_PATTERN.test(exactId)) { setMatches([{ name: 'Exact card printing', code: exactId.replace('-', ' ').toUpperCase() }]); setStatus(''); return }
        const response = await fetch(`/api/cards?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        if (!response.ok) throw Error()
        const data = matchesSchema.parse(await response.json())
        if (controller.signal.aborted) return
        setMatches(data.cards); setStatus(data.cards.length ? '' : 'No matching cards.')
      } catch { if (!controller.signal.aborted) setStatus('Card search is unavailable. Try again.') }
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query])
  useEffect(() => { if (open && active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, open, id])
  async function select(code: string) {
    const cardId = code.toLowerCase().replace(/\s+/, '-')
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller
    setSelectedId(cardId); setCard(null); setDetailError(''); setLoading(true); setOpen(false)
    try {
      const response = await fetch('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [cardId] }), signal: controller.signal })
      if (!response.ok) throw Error()
      const data = cardResponseSchema.parse(await response.json())
      if (controller.signal.aborted) return
      const match = data.cards.find(card => card.id === cardId)
      if (!match) throw Error()
      setCard(match); setMissing(data.missingIds.includes(cardId))
    } catch { if (!controller.signal.aborted) setDetailError('Card details are unavailable.') }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <section className="card-search-tool" aria-label="Card search">
    <div className="card-search-combobox" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <input role="combobox" aria-label="Find a card" aria-autocomplete="list" aria-expanded={open && query.trim().length >= 2} aria-controls={open ? id : undefined} aria-activedescendant={open && active >= 0 && matches[active] ? `${id}-${active}` : undefined} value={query} maxLength={80} placeholder="Find a card by name or set / number…" onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true) }} onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false)
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, matches.length - 1)) }
        if (event.key === 'ArrowUp' && matches.length) { event.preventDefault(); setActive(index => Math.max(0, index - 1)) }
        if (event.key === 'Enter' && matches[active]) { event.preventDefault(); void select(matches[active].code) }
      }} />
      {open && query.trim().length >= 2 && <div className="card-search-results"><ul id={id} role="listbox" aria-label="Card matches">{matches.map((match, index) => <li key={match.code} id={`${id}-${index}`} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => select(match.code)}><span>{match.name}</span><small>{match.set ? `${match.set} · ${match.number ?? match.code}` : match.code}</small></li>)}</ul>{status && <p>{status}</p>}</div>}
    </div>
    <span className="sr-only" role="status">{status}</span>
    {loading && <p role="status">Loading card details…</p>}
    {detailError && <div role="alert"><p>{detailError}</p><button className="secondary" onClick={() => select(selectedId)}>Retry card details</button></div>}
    {card && <div><CardDetail card={card} missing={missing} onAdd={() => onAdd(card)} /><button type="button" className="secondary card-detail-close" onClick={() => setCard(null)}>Close card details</button></div>}
  </section>
}
