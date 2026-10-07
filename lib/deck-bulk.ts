import type { GamePersistence } from '@/lib/game-persistence'
export async function assignDeckToGames(persistence: GamePersistence, games: Array<{ id: string; revision?: number }>, deckId: string | null, onSaved: (game: Awaited<ReturnType<GamePersistence['update']>>['game']) => void = () => {}, shouldContinue: () => boolean = () => true) {
  const result = { saved: [] as string[], conflicted: [] as string[], failed: [] as string[] }
  for (const game of games) {
    if (!shouldContinue()) { result.failed.push(game.id); continue }
    try { const saved = await persistence.update(game.id, { deckId }, game.revision ?? 1); result.saved.push(game.id); onSaved(saved.game) }
    catch (error) { ((error as { code?: string }).code === 'REVISION_CONFLICT' ? result.conflicted : result.failed).push(game.id) }
  }
  return result
}
