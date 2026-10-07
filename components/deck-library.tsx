'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getUser } from '@/app/actions'
import { deckPersistence } from '@/lib/deck-persistence'
import { emptyDeckLibrary, type DeckLibrary, type CreateDeck, type SavedDeck } from '@/lib/deck-contract'
import { parseLabDeck } from '@/lib/deck-lab-parser'
import { Archive, Check, Layers3, Plus, Upload } from 'lucide-react'
import { ArchetypeIconPair } from './archetype-icon-pair'
import { ArchetypeSelector } from './archetype-selector'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import './deck-library.css'

type Seed = { name?: string; deckList?: string; archetypeId?: string | null }
type Context = DeckLibrary & {
  owner: string | null; loading: boolean; error: string; currentDeck: SavedDeck | null;
  openManager: (seed?: Seed) => void; refresh: () => void; isOwnerCurrent: (owner: string | null) => boolean;
  create: (input: CreateDeck, makeCurrent?: boolean) => Promise<SavedDeck>;
  update: (deck: SavedDeck, changes: { name?: string; archived?: true }) => Promise<SavedDeck>;
  setCurrent: (id: string | null) => Promise<void>;
}
const DeckContext = createContext<Context | null>(null)
export function useDeckLibrary() {
  const context = useContext(DeckContext)
  if (!context) throw new Error('DeckLibraryProvider is required.')
  return context
}
export function DeckLibraryProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<string | null>(null)
  const ownerRef = useRef(owner); ownerRef.current = owner
  const [state, setState] = useState<{ owner: string | null; library: DeckLibrary; loaded: boolean; error: string }>({ owner: null, library: emptyDeckLibrary(), loaded: false, error: '' })
  const [revision, setRevision] = useState(0)
  const [manager, setManager] = useState<Seed | null>(null)
  useEffect(() => {
    let disposed = false, sequence = 0
    const auth = async () => {
      const ticket = ++sequence
      // Invalidate synchronously, including in-flight mutations, on an account transition.
      ownerRef.current = null; setOwner(null); setManager(null)
      try {
        const user = await getUser()
        if (!disposed && ticket === sequence) setOwner(user && user.username !== 'Guest' ? `account:${user.id}` : 'guest')
      } catch { if (!disposed && ticket === sequence) setState({ owner: null, library: emptyDeckLibrary(), loaded: false, error: 'Could not check your account. Refresh to retry.' }) }
    }
    void auth()
    window.addEventListener('dragapultist-auth-changed', auth)
    return () => { disposed = true; window.removeEventListener('dragapultist-auth-changed', auth) }
  }, [])
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (!owner) return
    const controller = new AbortController()
    void deckPersistence(owner !== 'guest', owner.startsWith('account:') ? owner.slice(8) : undefined).list(controller.signal).then(library => {
      if (!controller.signal.aborted) setState({ owner, library, loaded: true, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous => ({ owner, library: previous.owner === owner ? previous.library : emptyDeckLibrary(), loaded: previous.owner === owner && previous.loaded, error: error instanceof Error ? error.message : 'Your deck library is unavailable.' }))
    })
    return () => controller.abort()
  }, [owner, revision])
  useEffect(() => {
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', visible); window.addEventListener('online', visible)
    window.addEventListener('dragapultist-games-changed', visible); window.addEventListener('dragapultist-decks-changed', visible)
    window.addEventListener('storage', visible); document.addEventListener('visibilitychange', visible)
    const timer = setInterval(visible, 60_000)
    return () => {
      clearInterval(timer); window.removeEventListener('focus', visible); window.removeEventListener('online', visible)
      window.removeEventListener('dragapultist-games-changed', visible); window.removeEventListener('dragapultist-decks-changed', visible)
      window.removeEventListener('storage', visible); document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh])
  const library = state.owner === owner && owner ? state.library : emptyDeckLibrary()
  const ready = !!owner && state.owner === owner && state.loaded
  async function commit(action: (api: ReturnType<typeof deckPersistence>) => Promise<DeckLibrary>) {
    if (!ready || !owner) throw new Error('Wait for your deck library to load, then retry.')
    const startingOwner = owner
    try {
      const result = await action(deckPersistence(owner !== 'guest', owner.startsWith('account:') ? owner.slice(8) : undefined))
      if (ownerRef.current !== startingOwner) throw new Error('Your account changed. Reopen the deck library.')
      setState({ owner, library: result, loaded: true, error: '' })
      window.dispatchEvent(new Event('dragapultist-decks-changed'))
      return result
    } catch (error) { refresh(); throw error }
  }
  const value: Context = { ...library, owner, loading: !ready, error: state.owner === owner ? state.error : '',
    currentDeck: library.decks.find(deck => deck.id === library.currentDeckId && !deck.archivedAt) ?? null,
    refresh, isOwnerCurrent: id => ownerRef.current === id && id !== null, openManager: seed => setManager(seed ?? {}),
    create: async (input, makeCurrent) => {
      const startingOwner = owner
      const result = await commit(async api => {
        const saved = await api.create(input)
        if (makeCurrent) {
          if (ownerRef.current !== startingOwner) throw new Error('Your account changed. Reopen the library.')
          return api.current(input.id, saved.revision)
        }
        return saved
      })
      return result.decks.find(deck => deck.id === input.id)!
    },
    update: async (deck, changes) => { const result = await commit(api => api.update(deck.id, { ...changes, expectedRevision: deck.revision })); return result.decks.find(value => value.id === deck.id)! },
    setCurrent: async id => { await commit(api => api.current(id, library.revision)) },
  }
  return <DeckContext.Provider value={value}>{children}{manager && <DeckManager key={`${owner}:${JSON.stringify(manager)}`} seed={manager} onClose={() => setManager(null)} />}</DeckContext.Provider>
}

export function CurrentDeckButton() {
  const library = useDeckLibrary()
  return <Button className="action current-deck-button" onClick={() => library.openManager()} disabled={library.loading && !library.error}>{library.currentDeck ? <ArchetypeIconPair archetypeId={library.currentDeck.archetypeId} size={22} localSprites /> : <Layers3 aria-hidden />}<span>Current deck · {library.loading ? 'Loading…' : library.currentDeck?.name ?? 'Not set'}</span></Button>
}

function DeckManager({ seed, onClose }: { seed: Seed; onClose: () => void }) {
  const library = useDeckLibrary()
  const [selected, setSelected] = useState(seed.deckList ? '' : library.currentDeckId ?? '')
  const initial = library.decks.find(deck => deck.id === selected)
  const [editingRevision, setEditingRevision] = useState(initial?.revision ?? 1)
  const [name, setName] = useState(seed.name ?? initial?.name ?? '')
  const [archetype, setArchetype] = useState(seed.archetypeId ?? initial?.archetypeId ?? '')
  const [text, setText] = useState(seed.deckList ?? initial?.deckList ?? '')
  const [makeCurrent, setMakeCurrent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [legacy, setLegacy] = useState<Array<{ name: string; list: string }>>([])
  const pendingCreate = useRef<CreateDeck | null>(null)
  const deck = library.decks.find(deck => deck.id === selected)
  const changedCards = !!deck && (text !== deck.deckList || archetype !== deck.archetypeId)
  const parsed = parseLabDeck(text)
  function choose(id: string) {
    const next = library.decks.find(deck => deck.id === id)
    setSelected(id); setEditingRevision(next?.revision ?? 1); setName(next?.name ?? ''); setArchetype(next?.archetypeId ?? ''); setText(next?.deckList ?? ''); setMakeCurrent(false); setMessage(''); pendingCreate.current = null
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save. Try again.') }
    finally { setBusy(false) }
  }
  async function save() {
    await run(async () => {
      if (deck && !changedCards) {
        const renamed = await library.update({ ...deck, revision: editingRevision }, { name: name.trim() }); setEditingRevision(renamed.revision)
        if (makeCurrent) { setMessage('Name saved. Choose “Use as current deck” below to activate it.'); return }
      } else {
        const input = { id: pendingCreate.current?.id ?? crypto.randomUUID(), name: name.trim(), archetypeId: archetype, deckList: text }
        if (!pendingCreate.current || pendingCreate.current.name !== input.name || pendingCreate.current.deckList !== input.deckList || pendingCreate.current.archetypeId !== input.archetypeId) input.id = crypto.randomUUID()
        pendingCreate.current = input
        const saved = await library.create(input, makeCurrent)
        setSelected(saved.id); setEditingRevision(saved.revision); setName(saved.name); setArchetype(saved.archetypeId); setText(saved.deckList); pendingCreate.current = null

      }
      setMessage(makeCurrent ? 'Saved and set as current deck.' : 'Deck list saved.'); setMakeCurrent(false)
    })
  }
  function readLegacy() {
    try {
      const data = JSON.parse(localStorage.getItem('pokemonDecks') ?? '[]')
      setLegacy(Array.isArray(data) ? data.filter(value => typeof value?.name === 'string' && typeof value?.list === 'string') : [])
      setMessage('Choose an old list to review and save into this library. It will not be imported automatically.')
    } catch { setMessage('The old saved-list cache could not be read. Its contents have been preserved.') }
  }
  const sections = ([['pokemon', 'Pokémon'], ['trainer', 'Trainer'], ['energy', 'Energy'], ['unknown', 'Other']] as const)
    .map(([id, label]) => ({ id, label, count: parsed.cards.filter(card => card.section === id).reduce((sum, card) => sum + card.count, 0) }))
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}><DialogContent className="deck-library-dialog">
    <DialogHeader className="deck-dialog-header"><div className="deck-dialog-heading"><span className="deck-dialog-identity">{archetype ? <ArchetypeIconPair archetypeId={archetype} size={30} localSprites /> : <Layers3 size={24} aria-hidden />}</span><div><DialogTitle>Current deck</DialogTitle><DialogDescription>{library.owner === 'guest' ? 'Saved on this browser.' : 'Synced with your account.'}</DialogDescription></div></div></DialogHeader>
    <div className="deck-dialog-body">
      {library.error && <div className="deck-feedback" role="alert">{library.error} <Button variant="outline" onClick={library.refresh}>Retry</Button></div>}
      <label className="deck-field">Saved decklist<select aria-label="Saved decklist" value={selected} onChange={event => choose(event.target.value)} disabled={busy}><option value="">New decklist</option>{library.decks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}{deck.archivedAt ? ' (archived)' : ''}{library.currentDeckId === deck.id ? ' · Current' : ''}</option>)}</select></label>
      <div className="deck-editor-fields"><label className="deck-field">Deck name<Input aria-label="Deck name" placeholder="Name this list…" value={name} onChange={event => setName(event.target.value)} maxLength={80} disabled={busy} /></label>
        <fieldset disabled={busy} className="deck-field"><legend>Deck archetype</legend><ArchetypeSelector value={archetype} onValueChange={setArchetype} label="Deck archetype" /></fieldset></div>
      <div className="deck-cards-editor"><div className="deck-cards-heading"><label htmlFor="library-deck-text">Decklist</label><span className="deck-card-count" data-ready={parsed.valid}>{parsed.valid && <Check size={13} aria-hidden />}{parsed.total}<span>/60 cards</span></span></div>
        <Textarea id="library-deck-text" aria-label="Decklist" aria-describedby="library-deck-validation" value={text} onChange={event => setText(event.target.value)} placeholder="Paste your 60-card decklist…" maxLength={36_000} rows={7} disabled={busy} spellCheck={false} />
        {!!parsed.cards.length && <div className="deck-section-counts">{sections.filter(section => section.id !== 'unknown' || section.count > 0).map(section => <span key={section.id}>{section.label} <strong>{section.count}</strong></span>)}</div>}
      </div>
      <p id="library-deck-validation" className="deck-validation" role="status">{text ? parsed.valid ? '60 cards · Ready to save' : parsed.errors[0] : 'Paste a Pokémon TCG Live export, or card counts and names.'}</p>
      {changedCards && <p className="deck-history-note">Card or archetype changes will be saved as a separate list, preserving this list’s games.</p>}
      {deck && !changedCards && <p className="deck-list-state">{deck.archivedAt ? <><Archive size={14} aria-hidden />Archived · Match history preserved</> : library.currentDeckId === deck.id ? <><Check size={14} aria-hidden />Your current deck</> : 'Saved list · Available for match assignment'}</p>}
      {(!deck || changedCards) && <label className="deck-checkbox deck-current-choice"><input type="checkbox" checked={makeCurrent} onChange={event => setMakeCurrent(event.target.checked)} disabled={busy} /><span>Use as current deck<small>Automatically assign new captures to this list.</small></span></label>}
      {message && <p className="deck-feedback" role="status">{message}</p>}
    </div>
    <div className="deck-dialog-footer"><div className="deck-library-actions"><Button className="action" onClick={() => void save()} disabled={busy || library.loading || !name.trim() || !archetype || !parsed.valid}>{(!deck || changedCards) && <Plus aria-hidden />}{busy ? 'Saving…' : deck && !changedCards ? 'Save name' : changedCards ? 'Save as new list' : 'Save decklist'}</Button>
      {deck && !deck.archivedAt && !changedCards && <Button variant="outline" disabled={busy || library.currentDeckId === deck.id} onClick={() => void run(async () => { await library.setCurrent(deck.id); setMessage('Current deck updated.') })}><Check aria-hidden />Use as current deck</Button>}
    </div><div className="deck-library-maintenance">
      <Button variant="ghost" disabled={busy} onClick={readLegacy}><Upload aria-hidden />Import an old saved list</Button>
      {library.currentDeckId && <Button variant="ghost" disabled={busy} onClick={() => void run(async () => { await library.setCurrent(null); setMessage('Current deck cleared.') })}>Clear current deck</Button>}
      {deck && !deck.archivedAt && <Button variant="ghost" disabled={busy} onClick={() => void run(async () => { await library.update({ ...deck, revision: editingRevision }, { archived: true }); setMessage('List archived. Its match history is preserved.') })}><Archive aria-hidden />Archive list</Button>}
    </div>
    {!!legacy.length && <label className="deck-field">Old browser lists<select aria-label="Old browser lists" value="" onChange={event => { const old = legacy[Number(event.target.value)]; if (old) { choose(''); setName(old.name); setText(old.list) } }}><option value="">Choose an old list…</option>{legacy.map((deck, index) => <option key={index} value={index}>{deck.name}</option>)}</select></label>}
    </div>
  </DialogContent></Dialog>
}
