import {
  gameDetailSchema,
  gameSummarySchema,
  GAME_PARSER_VERSION,
  GAME_SCHEMA_VERSION,
  type GameDetailContract,
  type GameSummaryContract,
} from "@/lib/game-contract"

type UnknownRecord = Record<string, unknown>

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString()
  return undefined
}

function base(document: UnknownRecord) {
  return {
    id: document.id,
    date: document.date,
    username: document.username,
    opponent: document.opponent,
    userMainAttacker: document.userMainAttacker,
    opponentMainAttacker: document.opponentMainAttacker,
    userOtherPokemon: document.userOtherPokemon,
    opponentOtherPokemon: document.opponentOtherPokemon,
    turns: document.turns,
    turnCount: document.turnCount,
    userWon: document.userWon,
    damageDealt: document.damageDealt,
    userPrizeCardsTaken: document.userPrizeCardsTaken,
    opponentPrizeCardsTaken: document.opponentPrizeCardsTaken,
    wentFirst: document.wentFirst,
    userConceded: document.userConceded,
    opponentConceded: document.opponentConceded,
    tags: document.tags,
    userAceSpecs: document.userAceSpecs,
    opponentAceSpecs: document.opponentAceSpecs,
    highDamageAttackCount: document.highDamageAttackCount,
    benchKnockouts: document.benchKnockouts,
    totalBenchedPokemon: document.totalBenchedPokemon,
    weaknessBonus: document.weaknessBonus,
    actionPackedTurns: document.actionPackedTurns,
    winnerPrizePath: document.winnerPrizePath,
    userArchetype: document.userArchetype,
    opponentArchetype: document.opponentArchetype,
    favorite: document.favorite,
    revision: typeof document.revision === "number" ? document.revision : 1,
    schemaVersion: typeof document.schemaVersion === "number" ? document.schemaVersion : GAME_SCHEMA_VERSION,
    parserVersion: typeof document.parserVersion === "number" ? document.parserVersion : GAME_PARSER_VERSION,
    createdAt: iso(document.createdAt),
    updatedAt: iso(document.updatedAt),
  }
}

export function gameDocumentToSummary(document: UnknownRecord): GameSummaryContract {
  const notes = document.notes && typeof document.notes === "object" ? document.notes as UnknownRecord : {}
  return gameSummarySchema.parse({
    ...base(document),
    noteCount: Object.values(notes).filter(value => typeof value === "string" && value.trim()).length,
    hasDeck: document.hasDeck === true || (typeof document.deckList === "string" && document.deckList.trim().length > 0),
  })
}

export function gameDocumentToDetail(document: UnknownRecord): GameDetailContract {
  return gameDetailSchema.parse({
    ...base(document),
    rawLog: document.rawLog,
    notes: document.notes ?? {},
    deckList: document.deckList ?? "",
    deckName: document.deckName ?? "",
    winnerPrizePath: document.winnerPrizePath,
    contentHash: document.contentHash,
    noteCount: document.notes && typeof document.notes === "object"
      ? Object.values(document.notes as UnknownRecord).filter(value => typeof value === "string" && value.trim()).length
      : 0,
    hasDeck: document.hasDeck === true || (typeof document.deckList === "string" && document.deckList.trim().length > 0),
  })
}
