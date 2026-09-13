"use client"

import { useEffect, useRef, useState } from 'react'
import { canonicalizeArchetypeId, formatArchetypeLabel } from '@/utils/archetype-mapping'
import { playerResults, playerBreakdown, type PublicPlayer, type PublicBreakdown } from '@/utils/public-player-view'
import { ArchetypeIconPair } from './archetype-icon-pair'

const canonical = (id: string | null) => canonicalizeArchetypeId(id) ?? id
const deckKey = (username: string, id: string | null) => `${username}::${id ?? '__unknown__'}`

export function PlayerDatabasePanel() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [players, setPlayers] = useState<PublicPlayer[]>([])
  const [status, setStatus] = useState<'idle'|'loading'|'results'|'unavailable'|'error'>('idle')
  const [selected, setSelected] = useState<string | null>(null)
  const [compare, setCompare] = useState<string[]>([])
  const [breakdown, setBreakdown] = useState<PublicBreakdown | null>(null)
  const [deckStatus, setDeckStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle')
  const [deckId, setDeckId] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const deckRequest = useRef<AbortController | null>(null)
  const cache = useRef(new Map<string, PublicBreakdown | null>())
  const pendingDeck = useRef<string | null>(null)

  useEffect(() => () => { request.current?.abort(); deckRequest.current?.abort() }, [])

  function closeDeck() {
    deckRequest.current?.abort()
    pendingDeck.current = null
    setDeckStatus('idle')
    setBreakdown(null)
  }

  async function search(value = query) {
    const term = value.trim()
    request.current?.abort()
    closeDeck()
    setPlayers([]); setSelected(null); setCompare([]); setSubmitted(term)
    if (!term) { setStatus('idle'); return }
    const controller = new AbortController()
    request.current = controller
    setStatus('loading')
    try {
      const response = await fetch(`/api/player-search?query=${encodeURIComponent(term)}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!response.ok) { setStatus(response.status >= 500 ? 'unavailable' : 'error'); return }
      const data = playerResults.parse(await response.json())
      if (controller.signal.aborted) return
      cache.current.clear()
      setPlayers(data.players)
      setSelected(data.players[0]?.username ?? null)
      setStatus('results')
    } catch { if (!controller.signal.aborted) setStatus('unavailable') }
  }

  async function loadDeck(username: string, id: string | null, retry = false) {
    const key = deckKey(username, id)
    if (pendingDeck.current === key && !retry) return
    deckRequest.current?.abort()
    setDeckId(id)
    if (cache.current.has(key) && !retry) {
      pendingDeck.current = null
      setBreakdown(cache.current.get(key) ?? null); setDeckStatus('ready'); return
    }
    const controller = new AbortController()
    deckRequest.current = controller
    pendingDeck.current = key
    setDeckStatus('loading'); setBreakdown(null)
    try {
      const response = await fetch(`/api/player-deck-breakdown?username=${encodeURIComponent(username)}&archetypeId=${encodeURIComponent(id ?? '__unknown__')}`, { signal: controller.signal })
      if (!response.ok) throw new Error('unavailable')
      const data = playerBreakdown.parse(await response.json())
      if (controller.signal.aborted) return
      cache.current.set(key, data.breakdown)
      setBreakdown(data.breakdown); setDeckStatus('ready')
    } catch { if (!controller.signal.aborted) setDeckStatus('error') }
    finally { if (deckRequest.current === controller) pendingDeck.current = null }
  }

  const player = players.find(value => value.username === selected)
  const decks = player?.deckStats.map(deck => ({ ...deck, archetypeId: canonical(deck.archetypeId) })).sort((a, b) => b.games - a.games) ?? []

  return <section className="player-explorer" aria-label="Player Database">
    <form className="player-search" onSubmit={event => { event.preventDefault(); search() }}>
      <label htmlFor="player-query" className="sr-only">PTCGL username</label>
      <input id="player-query" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} placeholder="Search a PTCGL username" />
      <button className="action">{status === 'loading' ? 'Searching…' : 'Search players'}</button>
    </form>
    {status === 'loading' && <p role="status">Searching recorded players…</p>}
    {(status === 'unavailable' || status === 'error') && <div className="tool-status" role="alert">
      <p>{status === 'unavailable' ? 'Player data is unavailable.' : 'This search could not be completed.'}</p>
      <button className="secondary" onClick={() => search(submitted)}>Retry search</button>
    </div>}
    {status === 'results' && !players.length && <p role="status">No players found for “{submitted}”.</p>}
    {status === 'results' && !!players.length && <>
      <div className="player-workspace">
        <aside className="player-roster" aria-label="Returned players">
          <p className="result-count">{players.length} players</p>
          {players.map(value => <div key={value.username} className="player-roster-row">
            <button aria-pressed={selected === value.username} onClick={() => { closeDeck(); setSelected(selected === value.username ? null : value.username) }}>
              <strong>{value.username}</strong><span>{value.wins} W · {value.losses} L · {value.totalGames} games</span>
            </button>
            <label><input type="checkbox" checked={compare.includes(value.username)} disabled={compare.length >= 2 && !compare.includes(value.username)}
              onChange={event => setCompare(previous => event.target.checked ? [...previous, value.username] : previous.filter(name => name !== value.username))} />Compare {value.username}</label>
          </div>)}
        </aside>
        {player && <div className="player-profile">
          <header className="player-summary"><div><h3>{player.username}</h3><p>Last played: {player.lastPlayed ?? 'Not available'}</p></div>
            <div className="compact-record"><strong>{player.winRate.toFixed(1)}%</strong><span>{player.wins} W · {player.losses} L · {player.totalGames} games</span></div>
          </header>
          <div className="player-detail-grid">
            <section className="player-decks" aria-label="Deck archetypes"><h4>Archetypes</h4>
              {!decks.length && <p>No deck history recorded.</p>}
              {decks.map((deck, index) => <button key={`${deck.archetypeId}-${index}`} className="distribution-row"
                aria-expanded={deckStatus !== 'idle' && deckId === deck.archetypeId}
                aria-pressed={deckStatus !== 'idle' && deckId === deck.archetypeId}
                onClick={() => deckStatus !== 'idle' && deckId === deck.archetypeId ? closeDeck() : loadDeck(player.username, deck.archetypeId)}>
                <ArchetypeIconPair archetypeId={deck.archetypeId} />
                <span className="deck-name">{formatArchetypeLabel(deck.archetypeId)}<small>{deck.games} games · {deck.wins} W · {deck.games - deck.wins} L</small></span>
                <strong>{deck.winRate.toFixed(1)}%</strong>
              </button>)}
            </section>
            {deckStatus !== 'idle' && <section className="matchup-breakdown" aria-label="Deck matchups" aria-live="polite">
              <header><div className="archetype-label"><ArchetypeIconPair archetypeId={deckId} /><h4>{formatArchetypeLabel(deckId)}</h4></div><button className="icon-button" aria-label="Close matchup breakdown" onClick={closeDeck}>×</button></header>
              {deckStatus === 'loading' && <p>Loading matchup breakdown…</p>}
              {deckStatus === 'error' && <div role="alert"><p>Matchup data is unavailable.</p><button className="secondary" onClick={() => loadDeck(player.username, deckId, true)}>Retry breakdown</button></div>}
              {deckStatus === 'ready' && breakdown && <p className="breakdown-record">{breakdown.wins}/{breakdown.games} wins · {breakdown.losses} losses · {breakdown.winRate.toFixed(1)}%</p>}
              {deckStatus === 'ready' && (!breakdown || !breakdown.matchups.length) && <p>No matchup records were returned for this deck.</p>}
              {deckStatus === 'ready' && breakdown?.matchups.map((match, index) => <div className="matchup-line" key={index}>
                <ArchetypeIconPair archetypeId={canonical(match.opponentArchetypeId)} size={26} />
                <span>vs {formatArchetypeLabel(canonical(match.opponentArchetypeId))}</span>
                <strong>{match.winRate.toFixed(1)}%<small>{match.wins}/{match.games} wins</small></strong>
              </div>)}
            </section>}
          </div>
        </div>}
      </div>
      {!!compare.length && <section className="player-comparison" aria-label="Player comparison"><h3>Compare players <small>{compare.length}/2 selected</small></h3><div>
        {players.filter(value => compare.includes(value.username)).map(value => <article key={value.username}><h4>{value.username}</h4><strong>{value.winRate.toFixed(1)}%</strong><p>{value.wins} W · {value.losses} L / {value.totalGames} games</p><p>Last activity: {value.lastPlayed ?? 'Not available'}</p></article>)}
      </div></section>}
    </>}
  </section>
}
