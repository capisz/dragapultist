const api = window.dragapultistOverlay
const element = id => document.getElementById(id)
let deckOptions = ''
function render(state) {
  document.body.classList.toggle('interactive', state.interactive)
  element('mode').textContent = state.interactive ? 'Interact · Esc to return' : 'View mode'
  for (const controls of document.querySelectorAll('.edit-controls')) controls.hidden = !state.interactive
  element('deck-name').textContent = state.deck?.label || (state.selectionMissing ? 'Selected deck unavailable' : state.loaded ? state.recent.length ? 'Deck not identified' : 'No saved games yet' : state.signedIn ? 'Loading deck statistics' : 'Sign in to Dragapultist')
  element('deck-record').textContent = state.deck ? `${state.deck.wins}–${state.deck.losses}` : '—'
  element('deck-rate').textContent = state.deck?.games ? `${state.deck.winRate.toFixed(1)}% wins` : '—'
  element('deck-games').textContent = state.deck ? `${state.deck.games} games` : '—'
  element('today-record').textContent = state.loaded && !(state.today.incomplete && !state.today.games) ? `${state.today.wins}–${state.today.losses}` : '—'
  const optionsKey = JSON.stringify([state.decks.map(d => [d.key, d.label]), state.selectedDeckKey, state.selectionMissing])
  if (optionsKey !== deckOptions) {
    deckOptions = optionsKey
    const select = element('deck-select')
    select.replaceChildren(new Option('Follow latest game', ''))
    for (const deck of state.decks) select.add(new Option(deck.label, deck.key))
    if (state.selectionMissing) select.add(new Option('Selected deck unavailable', state.selectedDeckKey))
    select.value = state.selectedDeckKey || ''
  }
  element('recent').replaceChildren(...state.recent.map(game => {
    const row = document.createElement('li')
    const result = document.createElement('span')
    result.className = `result ${game.won ? 'win' : 'loss'}`
    result.textContent = game.won ? 'W' : 'L'
    result.setAttribute('aria-label', game.won ? 'Win' : 'Loss')
    const opponent = document.createElement('span')
    opponent.className = 'opponent'; opponent.textContent = `vs ${game.opponent}`; opponent.title = opponent.textContent
    const deck = document.createElement('span')
    deck.className = 'deck-label'; deck.textContent = game.deck; deck.title = game.deck
    row.append(result, opponent, deck)
    return row
  }))
  element('empty').hidden = state.recent.length > 0
  element('empty').textContent = !state.signedIn ? 'Sign in to load your saved games.' : state.loaded ? 'Copy a completed game log to add a result.' : 'Waiting for saved-game statistics.'
  const notice = element('notice')
  notice.hidden = !state.notice
  notice.textContent = state.notice?.message || ''
  notice.dataset.kind = state.notice?.kind || ''
  const warnings = [state.error, state.statsError, ...state.shortcutErrors, state.today.incomplete ? 'Some game dates are unavailable; today’s record excludes them.' : null, state.truncated ? 'Statistics cover your latest 5,000 saved games.' : null].filter(Boolean)
  element('warning').hidden = warnings.length === 0
  element('warning').textContent = warnings.join(' ')
  element('capture').textContent = state.captureStatus
  element('shortcut').textContent = state.shortcutErrors.some(error => error.startsWith('Interaction '))
    ? 'Use the tray menu to interact'
    : `${state.interactionShortcut.replace('CommandOrControl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')} to interact`
}
function failure() { element('warning').hidden = false; element('warning').textContent = 'Control unavailable. Use the Dragapultist tray menu.' }
element('lock').addEventListener('click', () => void api.lock().catch(failure))
element('hide').addEventListener('click', () => void api.hide().catch(failure))
element('deck-select').addEventListener('change', event => void api.selectDeck(event.target.value || null).catch(failure))
document.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); void api.lock().catch(failure) } })
if (api) {
  api.onState(render); void api.state().then(render).catch(failure)
  let requestedHeight = 0
  const resize = () => {
    const height = Math.max(140, Math.min(640, document.querySelector('main').scrollHeight + 14))
    if (height !== requestedHeight) { requestedHeight = height; void api.resize(height).catch(failure) }
  }
  new ResizeObserver(resize).observe(document.querySelector('main'))
  new MutationObserver(resize).observe(document.querySelector('main'), { childList: true, subtree: true, attributes: true, characterData: true })
  void document.fonts.ready.then(resize)
}
else failure()
