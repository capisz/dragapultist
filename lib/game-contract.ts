import { z } from "zod"

export const GAME_SCHEMA_VERSION = 2
export const GAME_PARSER_VERSION = 1
export const MAX_GAME_LOG_BYTES = 262_144

const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength
const boundedName = z.string().trim().min(1).max(120)
const boundedNames = z.array(boundedName).max(60)
const boundedCount = z.number().int().min(0).max(100_000)
const optionalArchetype = z.string().trim().min(1).max(120).nullable().optional()

export const gameTagSchema = z.object({
  text: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
}).strict()

export const gameNotesSchema = z.record(z.string().max(2_000)).refine(
  notes => Object.keys(notes).length <= 200 && Object.keys(notes).every(key => /^\d{1,5}$/.test(key)),
  "Notes must use bounded numeric turn keys.",
)

const gameCoreShape = {
  id: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
  date: z.string().trim().min(1).max(64),
  username: z.string().trim().min(1).max(80),
  opponent: z.string().trim().min(1).max(80),
  userMainAttacker: boundedName,
  opponentMainAttacker: boundedName,
  userOtherPokemon: boundedNames,
  opponentOtherPokemon: boundedNames,
  turns: boundedCount,
  turnCount: boundedCount.optional(),
  userWon: z.boolean(),
  damageDealt: boundedCount,
  userPrizeCardsTaken: boundedCount,
  opponentPrizeCardsTaken: boundedCount,
  wentFirst: z.boolean(),
  userConceded: z.boolean(),
  opponentConceded: z.boolean(),
  tags: z.array(gameTagSchema).max(20).optional(),
  userAceSpecs: boundedNames.max(20).optional(),
  opponentAceSpecs: boundedNames.max(20).optional(),
  highDamageAttackCount: boundedCount,
  benchKnockouts: boundedCount,
  totalBenchedPokemon: boundedCount,
  weaknessBonus: z.boolean(),
  actionPackedTurns: z.object({ user: boundedCount, opponent: boundedCount }).strict(),
  winnerPrizePath: boundedNames.max(20).optional(),
  userArchetype: optionalArchetype,
  opponentArchetype: optionalArchetype,
  favorite: z.boolean().optional(),
}

export const gameSummarySchema = z.object({
  ...gameCoreShape,
  noteCount: boundedCount.optional(),
  hasDeck: z.boolean().optional(),
  revision: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
  parserVersion: z.number().int().min(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).strip()

export const gameDraftSchema = z.object({
  ...gameCoreShape,
  rawLog: z.string().min(10).refine(value => utf8Bytes(value) <= MAX_GAME_LOG_BYTES, "Game log is too large."),
  notes: gameNotesSchema.optional().default({}),
  deckList: z.string().max(50_000).optional().default(""),
  deckName: z.string().trim().max(80).optional().default(""),
}).strip()

// Compatibility name while existing route consumers move to createGameRequestSchema.
export const gameInputSchema = gameDraftSchema

export const gameMetadataSchema = z.object({
  favorite: z.boolean().optional(),
  userMainAttacker: boundedName.optional(),
  opponentMainAttacker: boundedName.optional(),
  notes: gameNotesSchema.optional(),
  deckList: z.string().max(50_000).optional(),
  deckName: z.string().trim().max(80).optional(),
  tags: z.array(gameTagSchema).max(20).optional(),
  perspective: z.object({
    username: z.string().trim().min(1).max(80),
    userArchetype: optionalArchetype,
    opponentArchetype: optionalArchetype,
  }).strict().optional(),
}).strict().refine(value => Object.keys(value).length > 0)

export const gameDetailSchema = gameDraftSchema.extend({
  revision: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
  parserVersion: z.number().int().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  noteCount: boundedCount.optional(),
  hasDeck: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).strip()

export const gameMutationSchema = z.object({
  favorite: z.boolean().optional(),
  userMainAttacker: boundedName.optional(),
  opponentMainAttacker: boundedName.optional(),
  notes: gameNotesSchema.optional(),
  deckList: z.string().max(50_000).optional(),
  deckName: z.string().trim().max(80).optional(),
  tags: z.array(gameTagSchema).max(20).optional(),
  perspective: z.object({
    username: z.string().trim().min(1).max(80),
    userArchetype: optionalArchetype,
    opponentArchetype: optionalArchetype,
  }).strict().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "At least one editable field is required.")

export const gameListQuerySchema = z.object({
  cursor: z.string().max(240).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(80).optional(),
}).strict()

export const createGameRequestSchema = z.object({
  game: gameDraftSchema,
  idempotencyKey: z.string().trim().min(16).max(128).optional(),
}).strict()

export const updateGameRequestSchema = z.object({
  changes: gameMutationSchema,
  expectedRevision: z.number().int().min(1),
}).strict()

export const deleteGameRequestSchema = z.object({
  expectedRevision: z.number().int().min(1).optional(),
}).strict()

export const gameListResponseSchema = z.object({ games: z.array(gameSummarySchema).max(100), nextCursor: z.string().nullable() }).strict()
export const gameDetailResponseSchema = z.object({ game: gameDetailSchema }).strict()
export const gameMutationResponseSchema = z.object({
  game: gameDetailSchema,
  revision: z.number().int().min(1),
  saveState: z.literal("saved"),
  duplicate: z.boolean().optional(),
}).strict()

export type GameSummaryContract = z.infer<typeof gameSummarySchema>
export type GameDetailContract = z.infer<typeof gameDetailSchema>
export type GameDraftContract = z.infer<typeof gameDraftSchema>
export type GameMutationContract = z.infer<typeof gameMutationSchema>
