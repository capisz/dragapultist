// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '@/types/game'
import { matchArchetype, matchOutcome, sortMatchesByDate } from '@/utils/match-presentation'
import { loadComponent } from './component-loader'

const imports = {
  './archetype-icon-pair': { ArchetypeIconPair: () => null },
  '@/utils/match-presentation': { matchArchetype, matchOutcome },
}
const previewModule = loadComponent<typeof import('../components/match-preview')>('match-preview.tsx', imports)
const { MatchConstellation } = loadComponent<typeof import('../components/match-constellation')>('match-constellation.tsx', { ...imports, './match-preview': previewModule })
type Props = Parameters<typeof MatchConstellation>[0]
const game = (index: number) => ({ id: `${index}`, opponent: `Opponent ${index}`, date: '10/2/2026', turns: 5, userWon: true, userPrizeCardsTaken: 6, opponentPrizeCardsTaken: 2 }) as GameSummary
const games = Array.from({ length: 49 }, (_, index) => game(index))
let root: Root, container: HTMLDivElement
let props: Props
async function render(patch: Partial<Props> = {}, key = 'default') {
  props = { ...props, ...patch }
  await act(async () => { root.render(createElement(MatchConstellation, { ...props, key })) })
}
function button(label: string) { return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)! }
function matches() { return [...container.querySelectorAll('[data-match-id]')].map(node => node.getAttribute('data-match-id')) }
async function click(label: string) { await act(async () => button(label).click()) }
async function focusMatch(id: string) { await act(async () => container.querySelector<HTMLButtonElement>(`[data-match-id="${id}"]`)!.focus()) }
async function pointer(target: Element, type: string, pointerType: string, relatedTarget: EventTarget | null = null) {
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, relatedTarget })
    Object.defineProperty(event, 'pointerType', { value: pointerType })
    target.dispatchEvent(event)
  })
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div'); document.body.append(container)
  root = createRoot(container)
  props = { games, onSelectGame: vi.fn() }
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })

describe('constellation pages and shared preview', () => {
  it('shows 24 ordered matches per page, a partial last page, and safe boundaries', async () => {
    await render()
    expect(matches()).toEqual(games.slice(0, 24).map(game => game.id))
    expect(button('Previous page').disabled).toBe(true)
    await click('Next page')
    expect(matches()).toEqual(games.slice(24, 48).map(game => game.id))
    await click('Next page')
    expect(matches()).toEqual(['48'])
    expect(button('Next page').disabled).toBe(true)
    expect(container.textContent).toContain('49–49 of 49 matches')
    await click('Previous page')
    expect(matches()[0]).toBe('24')
  })
  it('keeps the current page and mounted matches during background refresh', async () => {
    await render(); await click('Page 2')
    const first = container.querySelector('[data-match-id="24"]')
    await render({ games: games.map(game => ({ ...game })) })
    expect(matches()).toHaveLength(24)
    expect(container.querySelector('[data-match-id="24"]')).toBe(first)
  })
  it('clamps a removed last page and starts new filtered result sets on page one', async () => {
    await render(); await click('Page 3')
    await render({ games: games.slice(0, 25) })
    expect(matches()).toEqual(['24'])
    await render({ games }, 'new-filter')
    expect(matches()[0]).toBe('0')
  })
  it('restores the reviewed match on its page without undoing later navigation', async () => {
    const restored = vi.fn()
    await render({ restoreMatchId: '28', onRestoreComplete: restored })
    expect(matches()[0]).toBe('24')
    expect(document.activeElement?.getAttribute('data-match-id')).toBe('28')
    expect(restored).toHaveBeenCalledTimes(1)
    await click('Previous page')
    expect(matches()[0]).toBe('0')
  })
  it('opens the shared preview on focus and closes without reopening on restored focus', async () => {
    await render(); await focusMatch('2')
    expect(container.querySelector('.match-preview-title')?.textContent).toContain('Opponent 2')
    expect(container.querySelector('.match-preview-facts')?.textContent).toContain('6 – 2')
    await act(async () => container.querySelector<HTMLButtonElement>('.match-preview-open')!.focus())
    await click('Close match preview')
    expect(container.querySelector('.match-preview-content')).toBeNull()
    expect(document.activeElement?.getAttribute('data-match-id')).toBe('2')
  })
  it('opens the correct review from the shared preview and clears the preview on paging', async () => {
    await render(); await focusMatch('4')
    await act(async () => container.querySelector<HTMLButtonElement>('.match-preview-open')!.click())
    expect(props.onSelectGame).toHaveBeenCalledWith(games[4])
    await click('Next page')
    expect(container.querySelector('.match-preview-content')).toBeNull()
  })
  it('keeps the mouse preview open while moving from a match into the right-hand panel', async () => {
    await render()
    const match = container.querySelector('[data-match-id="3"]')!
    await pointer(match, 'pointerover', 'mouse')
    expect(container.querySelector('.match-preview-title')?.textContent).toContain('Opponent 3')
    const preview = container.querySelector('.match-list-preview')!
    await pointer(match, 'pointerout', 'mouse', preview)
    expect(container.querySelector('.match-preview-content')).not.toBeNull()
    await pointer(preview, 'pointerout', 'mouse', document.body)
    expect(container.querySelector('.match-preview-content')).toBeNull()
  })
  it('previews on the first touch and opens review on the second touch', async () => {
    await render()
    const match = container.querySelector('[data-match-id="3"]')!
    await pointer(match, 'pointerdown', 'touch')
    await act(async () => { match.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })) })
    expect(props.onSelectGame).not.toHaveBeenCalled()
    expect(container.querySelector('.match-preview-title')?.textContent).toContain('Opponent 3')
    await pointer(match, 'pointerdown', 'touch')
    await act(async () => { match.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })) })
    expect(props.onSelectGame).toHaveBeenCalledWith(games[3])
  })
  it('shows a safe empty state and a bounded number of page buttons for long histories', async () => {
    await render({ games: [] })
    expect(matches()).toHaveLength(0)
    expect(button('Next page').disabled).toBe(true)
    await render({ games: Array.from({ length: 500 }, (_, index) => game(index)) })
    expect(container.querySelectorAll('.constellation-page-number')).toHaveLength(3)
  })
})

describe('newest match ordering', () => {
  it('sorts across month and year boundaries as dates instead of strings', () => {
    const records = ['9/30/2026', '10/2/2026', '12/31/2025', '2027-01-01'].map((date, index) => ({ ...game(index), date }))
    expect(sortMatchesByDate(records, 'desc').map(game => game.date)).toEqual(['2027-01-01', '10/2/2026', '9/30/2026', '12/31/2025'])
    expect(records[0].date).toBe('9/30/2026')
  })
  it('uses creation time for same-day records and insertion order for legacy guest matches', () => {
    const records = [game(1), game(2), game(3)]
    expect(sortMatchesByDate(records, 'desc', true).map(game => game.id)).toEqual(['3', '2', '1'])
    expect(sortMatchesByDate(records, 'asc', true).map(game => game.id)).toEqual(['1', '2', '3'])
    const timed = [{ ...game(1), createdAt: '2026-10-02T12:00:00Z' }, { ...game(2), createdAt: '2026-10-02T15:00:00Z' }]
    expect(sortMatchesByDate(timed, 'desc').map(game => game.id)).toEqual(['2', '1'])
  })
})
