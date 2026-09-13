"use client"
import { useEffect, useMemo, useState } from 'react'
import type { ReviewGame } from '@/utils/match-presentation'
import { sampleSeven, boundedRandom, emptyHandSession, addHands, type HandSession } from '@/utils/sample-hands'
import { parseLabDeck } from '@/lib/deck-lab-parser'
import { cardResponseSchema, type ImportedCard } from '@/lib/card-contract'
import { EXAMPLE_DECK } from '@/lib/example-deck'
import { HandStatisticsGroups } from './hand-statistics-groups'
import { CardSearch } from './card-search'
import { CardImage, CardDetail } from './card-detail'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'

export function SampleHandLab({ games, currentGameId }: { games: ReviewGame[]; currentGameId?: string }) {
  const [text, setText] = useState('')
  const parsed = useMemo(() => parseLabDeck(text), [text])
  const samplingCards = useMemo(() => parsed.cards.map(card => ({ name: card.id, count: card.count })), [parsed])
  const [hand, setHand] = useState<string[]>([])
  const [session, setSession] = useState<HandSession>(emptyHandSession([]))
  const [batch, setBatch] = useState(1)
  const [lastBatch, setLastBatch] = useState(1)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<Record<string, ImportedCard>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [hydration, setHydration] = useState<'idle'|'loading'|'ready'|'error'>('idle')
  const [revision, setRevision] = useState(0)
  const [inspected, setInspected] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(true)
  const saved = games.filter(game => game.deckList?.trim())
  const idsKey = parsed.valid ? parsed.exactIds.join('|') : ''

  useEffect(() => {
    setDetails({}); setMissing([])
    if (!idsKey) { setHydration('idle'); return }
    const controller = new AbortController()
    setHydration('loading')
    fetch('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: idsKey.split('|') }), signal: controller.signal })
      .then(async response => { if (!response.ok) throw Error(); return cardResponseSchema.parse(await response.json()) })
      .then(data => { if (!controller.signal.aborted) { setDetails(Object.fromEntries(data.cards.map(card => [card.id, card]))); setMissing(data.missingIds); setHydration('ready') } })
      .catch(() => { if (!controller.signal.aborted) setHydration('error') })
    return () => controller.abort()
  }, [idsKey, revision])

  function updateDeck(value: string) {
    setText(value); setHand([]); setSession(emptyHandSession(parseLabDeck(value).cards.map(card => ({ name: card.id, count: card.count })))); setError(''); setInspected(null)
  }
  function deal() {
    if (!parsed.valid) return
    try {
      const randomIndex = boundedRandom(() => crypto.getRandomValues(new Uint32Array(1))[0])
      const hands = Array.from({ length: batch }, () => sampleSeven(samplingCards, randomIndex))
      setLastBatch(batch); setHand(hands[hands.length - 1]); setSession(previous => addHands(previous.hands ? previous : emptyHandSession(samplingCards), hands)); setError(''); setEditorOpen(false)
    } catch { setError('This hand could not be generated. Try again.') }
  }
  function label(id: string) { return (!missing.includes(id) && details[id]?.name) || parsed.cards.find(card => card.id === id)?.name || id }
  function cardDetail(id: string): ImportedCard { return { ...details[id], id, name: label(id), set: details[id]?.set ?? (id.startsWith('text:') ? 'Name-only card' : id.split('-')[0].toUpperCase()), number: details[id]?.number ?? (id.startsWith('text:') ? '—' : id.split('-')[1]) } }
  function addCard(card: ImportedCard) { updateDeck(`1 ${card.name} ${card.id.replace('-', ' ').toUpperCase()}${text.trim() ? '\n' + text.trim() : ''}`); setEditorOpen(true) }

  return <div className="sample-lab"><div className="sample-main">
    <CardSearch onAdd={addCard} />
    <details className="sample-deck-panel" open={editorOpen} onToggle={event => setEditorOpen(event.currentTarget.open)}><summary>Deck list · {parsed.total}/60 cards</summary>
      <div className="deck-composer"><div><label htmlFor="sample-deck">Your 60-card list</label><p>Use “4 Charmander PAF 7” for exact cards, or count and name for text-only cards.</p></div><strong className="deck-total" aria-live="polite">{parsed.total}<small>/60 cards</small></strong></div>
      {!!saved.length && <div className="saved-deck-picker"><label htmlFor="saved-sample-deck">Reuse a saved match deck</label><select id="saved-sample-deck" value="" onChange={event => { const game = saved.find(game => game.id === event.target.value); if (game?.deckList) updateDeck(game.deckList) }}><option value="">Choose a saved deck…</option>{saved.map(game => <option key={game.id} value={game.id}>{game.id === currentGameId ? 'Current match · ' : ''}{game.deckName || game.userMainAttacker} · {game.date}</option>)}</select></div>}
      <textarea id="sample-deck" className="sample-deck-input" value={text} onChange={event => updateDeck(event.target.value)} placeholder="Paste a 60-card deck list…" maxLength={36001} spellCheck={false} />
      {!text && <button type="button" className="secondary" onClick={() => updateDeck(EXAMPLE_DECK)}>Load example deck</button>}
      <div className="deck-validation" aria-live="polite">{parsed.valid ? <p>60 cards ready · {parsed.exactIds.length} exact printings.</p> : <p>{text ? parsed.errors.slice(0, 3).join(' ') : 'Exactly 60 cards are required.'}</p>}</div>
    </details>
    {hydration === 'loading' && <p className="hydration-status" role="status">Loading exact card details…</p>}
    {hydration === 'error' && <div className="hydration-status" role="alert">Card images and details are unavailable; text sampling still works. <button className="secondary" onClick={() => setRevision(value => value + 1)}>Retry deck cards</button></div>}
    {!!missing.length && <p className="hydration-status" role="status">{missing.length} exact printing{missing.length === 1 ? '' : 's'} missing: {missing.map(id => id.toUpperCase()).join(', ')}. Text fallbacks retained.</p>}
    <div className="deal-controls"><button className="action" disabled={!parsed.valid} onClick={deal}>{session.hands ? 'Deal another hand' : 'Deal seven cards'}</button><label>Simulations <select aria-label="Simulations" value={batch} onChange={event => setBatch(Number(event.target.value))}>{[1, 10, 100, 1000].map(value => <option key={value} value={value}>{value.toLocaleString()}</option>)}</select></label><button className="secondary" disabled={!session.hands} onClick={() => { setHand([]); setSession(emptyHandSession(samplingCards)) }}>Reset session</button></div>
    {error && <p role="alert">{error}</p>}
    <div className="hand-tabletop" aria-label="Sampled hand"><div className="tabletop-label"><span>{session.hands && lastBatch > 1 ? 'Last sampled hand' : 'Seven-card sample'}</span><span>{session.hands ? `Hand ${session.hands.toLocaleString()}` : 'No hands generated'}</span></div>
      <div className="sample-hand" role="list" aria-label="Seven cards">{(hand.length ? hand : Array(7).fill('')).map((id, index) => <div className="sample-card" role="listitem" key={`${session.hands}-${index}-${id}`} style={{ '--card-angle': `${(index - 3) * 2}deg` } as React.CSSProperties}>
        {id ? <button type="button" className="sample-card-button" aria-label={`Card ${index + 1}: ${label(id)}${parsed.cards.find(card => card.id === id)?.code ? ', ' + parsed.cards.find(card => card.id === id)?.code : ''}`} onClick={() => setInspected(id)}>
          <CardImage key={id} card={details[id]} name={label(id)} missing={missing.includes(id)} /><strong>{label(id)}</strong><small>{parsed.cards.find(card => card.id === id)?.code ?? 'Name only'}</small>
        </button> : <><small>{index + 1}</small><span>Awaiting deal</span></>}
      </div>)}</div>
    </div>
    <details className="tool-info"><summary>Sampling method</summary><p>Raw sampling only: no legal-opening-hand, Basic Pokémon, mulligan or prize setup checks. Every physical copy has equal probability; sampling uses exact IDs when provided. Missing printings are never replaced. Changing the deck resets the session; batches show the last hand.</p><p>Card data: Pokémon TCG data index, revision 0af6250a22495e4a3e9f60ff45fc3fedc2e0563d, generated September 10, 2026.</p></details>
  </div><aside className="hand-statistics"><strong className="session-total" aria-live="polite">{session.hands.toLocaleString()}</strong><h3>hands generated</h3><details className="tool-info"><summary>Statistics definitions</summary><p>Appearance rate is the share of sampled hands containing at least one copy of this printing. Name-only entries are grouped by name. Card types follow your deck headings; cards without a heading remain uncategorized.</p></details>
    {!!session.hands && <HandStatisticsGroups session={session} cards={parsed.cards} label={label} />}
  </aside>
    <Dialog open={!!inspected} onOpenChange={open => { if (!open) setInspected(null) }}><DialogContent className="option-a-auth sample-card-dialog"><DialogHeader><DialogTitle>Card details</DialogTitle><DialogDescription className="sr-only">Exact printing from this sampled hand.</DialogDescription></DialogHeader>{inspected && <CardDetail card={cardDetail(inspected)} missing={missing.includes(inspected)} />}</DialogContent></Dialog>
  </div>
}
