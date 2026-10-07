import { analyzeGameLog } from '@/utils/game-analyzer'
import { gameDraftSchema, MAX_GAME_LOG_BYTES } from '@/lib/game-contract'
export type DesktopQueuedLog = { id: string; rawLog: string; username: string; capturedAt: string }
export function prepareDesktopImport(entry: DesktopQueuedLog) {
  if (new TextEncoder().encode(entry.rawLog).length > MAX_GAME_LOG_BYTES) throw Error('This log exceeds the supported size.')
  if (!/(?:Turn\s*#\s*\d+|[^\n]+[’']s Turn)/i.test(entry.rawLog)) throw Error('This log has no recognizable turns.')
  if (!/\bwins\.|\bwon the game\b/i.test(entry.rawLog)) throw Error('This log appears incomplete. Copy the completed game log again.')
  const game = analyzeGameLog(entry.rawLog, false, undefined, undefined, null, null, entry.username)
  if (!entry.username || game.username.trim().toLowerCase() !== entry.username.trim().toLowerCase() || !game.opponent || game.username === game.opponent) throw Error('Your PTCGL username does not match this log. Check the username and retry.')
  // Require the chosen identity to occur as an actual player, not just a preferred-name fallback.
  const escaped = entry.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`(?:^|\\n)${escaped} (?:drew|chose|played|won|lost|took|attached|used)\\b`, 'i').test(entry.rawLog)) throw Error('Your PTCGL username was not found as a player in this log.')
  return gameDraftSchema.parse({ ...game, deckAssignment: { mode: 'current', capturedAt: entry.capturedAt }, id: entry.id, date: new Date(entry.capturedAt).toLocaleDateString('en-US') })
}
