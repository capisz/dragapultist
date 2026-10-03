import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { matchArchetype, matchOutcome } from '@/utils/match-presentation'
import { loadComponent } from './component-loader'

const previewModule = loadComponent('match-preview.tsx', {
  './archetype-icon-pair': { ArchetypeIconPair: () => null },
  '@/utils/match-presentation': { matchArchetype, matchOutcome },
})

// The backend runner preserves Next's JSX. Compile this isolated rendering test
// just as the existing sprite component tests do, without changing app tooling.
const require = createRequire(import.meta.url)
const compiled = { exports: {} as { MatchHistoryList: (props: { games: GameSummary[]; side: 'user' | 'opponent'; onSelectGame: () => void }) => React.ReactNode } }
const output = ts.transpileModule(readFileSync(new URL('../components/match-history-list.tsx', import.meta.url), 'utf8'), {
  fileName: 'match-history-list.tsx',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText
new Function('module', 'exports', 'require', output)(compiled, compiled.exports, (name: string) => {
  if (name === './archetype-icon-pair') return { ArchetypeIconPair: () => null }
  if (name === './match-preview') return previewModule
  if (name === '@/utils/match-presentation') return { matchArchetype, matchOutcome }
  return require(name)
})
const { MatchHistoryList } = compiled.exports
import type { GameSummary } from '@/types/game'

const game = (changes: Partial<GameSummary>): GameSummary => ({
  id: 'one', date: '10/1/2026', username: 'Player', opponent: 'Opponent',
  userArchetype: 'dragapult-dusknoir', opponentArchetype: 'mega-lucario-ex',
  userMainAttacker: 'Dragapult ex', opponentMainAttacker: 'Lucario ex',
  userOtherPokemon: [], opponentOtherPokemon: [], turns: 5, userWon: true,
  damageDealt: 600, userPrizeCardsTaken: 6, opponentPrizeCardsTaken: 2,
  rawLog: 'Synthetic component test log.', wentFirst: true, userConceded: false,
  opponentConceded: false, highDamageAttackCount: 1, benchKnockouts: 0,
  totalBenchedPokemon: 3, weaknessBonus: false, actionPackedTurns: { user: 1, opponent: 1 },
  ...changes,
})
const games = [game({}), game({ id: 'two', userWon: false, opponentArchetype: null })]
const render = (side: 'user' | 'opponent', records = games) => renderToStaticMarkup(createElement(MatchHistoryList, { games: records, side, onSelectGame: () => {} }))

describe('match list displays persisted results', () => {
  it('groups by your assigned deck while retaining each match outcome and ID', () => {
    const html = render('user')
    expect(html.match(/class="match-list-group"/g)).toHaveLength(1)
    expect(html).toContain('50% win rate')
    expect(html).toContain('data-match-id="one" data-outcome="W"')
    expect(html).toContain('data-match-id="two" data-outcome="L"')
    expect(html.match(/class="match-dot-empty"/g)).toHaveLength(58)
  })
  it('uses opponent assignments for opponent grouping without inventing a missing deck', () => {
    const html = render('opponent')
    expect(html.match(/class="match-list-group"/g)).toHaveLength(2)
    expect(html).toContain('Unknown archetype match history')
    expect(html).toContain('Loss against Opponent, Unknown archetype, 5 rounds')
  })
  it('renders no match buttons or unused cells for empty results', () => {
    const html = render('user', [])
    expect(html).not.toContain('data-match-id=')
    expect(html).not.toContain('class="match-dot-empty"')
  })
})
