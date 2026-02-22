import type { GameSummary } from "@/types/game"
import {
  canonicalizeArchetypeId,
  formatArchetypeLabel,
  inferArchetypesForSummary,
} from "@/utils/archetype-mapping"
import type {
  DeckStat,
  MatchupStat,
  NormalizedGame,
  OpponentStat,
  OverallStatsModel,
  PokemonStat,
  StatisticsModel,
} from "./types"

type RawGame = Partial<GameSummary> & {
  _id?: unknown
  createdAt?: string | Date
  gameId?: string
  gameSummary?: Partial<GameSummary> & {
    id?: string
    createdAt?: string | Date
    gameId?: string
    deckName?: string
    opponentDeckName?: string
  }
  deckName?: string
  opponentDeckName?: string
}

type MutablePokemon = {
  name: string
  games: number
  wins: number
  mainGames: number
  mainWins: number
}

type MutableMatchup = {
  opponentArchetypeId: string | null
  games: number
  wins: number
}

type MutableDeck = {
  key: string
  archetypeId: string | null
  label: string
  games: number
  wins: number
  turnsSum: number
  firstTurnGames: number
  firstTurnWins: number
  matchupMap: Map<string, MutableMatchup>
  pokemonMap: Map<string, MutablePokemon>
}

type MutableOpponent = {
  name: string
  games: number
  wins: number
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function asBoolean(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "true" || normalized === "1" || normalized === "yes"
  }
  if (typeof value === "number") return value === 1
  return false
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  }
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asString(entry))
    .filter((entry) => entry.length > 0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim()
}

function normalizePokemonName(value: string): string {
  const cleaned = value
    .replace(/^opponent'?s\s+/i, "")
    .replace(/^your\s+/i, "")
    .replace(/^the\s+/i, "")
    .trim()

  if (!cleaned) return ""

  const normalized = cleaned
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (
    normalized === "it" ||
    normalized === "its" ||
    normalized === "them" ||
    normalized === "they" ||
    normalized === "their" ||
    normalized === "this" ||
    normalized === "that" ||
    normalized === "these" ||
    normalized === "those" ||
    normalized === "pokemon" ||
    normalized === "pok mon" ||
    normalized === "active pokemon" ||
    normalized === "benched pokemon" ||
    normalized === "card" ||
    normalized === "a card"
  ) {
    return ""
  }

  return cleaned
}

function safeWinRate(wins: number, games: number): number {
  return games > 0 ? (wins / games) * 100 : 0
}

function parseDate(dateLike: unknown): Date | null {
  if (dateLike instanceof Date && !Number.isNaN(dateLike.getTime())) return dateLike
  if (typeof dateLike === "string" && dateLike.trim()) {
    const parsed = new Date(dateLike)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

function formatDateLabel(date: Date | null): string {
  if (!date) return "Unknown date"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function toDeckKey(archetypeId: string | null): string {
  return archetypeId ?? "__unknown__"
}

function toPokemonStat(value: MutablePokemon): PokemonStat {
  const losses = value.games - value.wins
  return {
    name: value.name,
    games: value.games,
    wins: value.wins,
    losses,
    winRate: safeWinRate(value.wins, value.games),
    mainGames: value.mainGames,
    mainWins: value.mainWins,
    mainWinRate: safeWinRate(value.mainWins, value.mainGames),
  }
}

function normalizeGame(raw: RawGame): NormalizedGame | null {
  const summary = isRecord(raw.gameSummary) ? (raw.gameSummary as Partial<GameSummary> & Record<string, unknown>) : null

  const id =
    asString(summary?.id) ||
    asString(raw.id) ||
    asString(summary?.gameId) ||
    asString(raw.gameId) ||
    asString(raw._id)
  if (!id) return null

  const userMainAttacker =
    normalizePokemonName(asString(summary?.userMainAttacker) || asString(raw.userMainAttacker)) || "Unknown"
  const opponentMainAttacker =
    normalizePokemonName(asString(summary?.opponentMainAttacker) || asString(raw.opponentMainAttacker)) || "Unknown"
  const userOtherPokemon = asStringArray(summary?.userOtherPokemon ?? raw.userOtherPokemon)
    .map((name) => normalizePokemonName(name))
    .filter((name) => name.length > 0)
  const opponentOtherPokemon = asStringArray(summary?.opponentOtherPokemon ?? raw.opponentOtherPokemon)
    .map((name) => normalizePokemonName(name))
    .filter((name) => name.length > 0)

  const inferred = inferArchetypesForSummary({
    userMainAttacker,
    userOtherPokemon,
    opponentMainAttacker,
    opponentOtherPokemon,
  })

  const userArchetypeRaw =
    asString(summary?.userArchetype) ||
    asString(raw.userArchetype) ||
    asString(summary?.deckName) ||
    asString(raw.deckName)

  const opponentArchetypeRaw =
    asString(summary?.opponentArchetype) ||
    asString(raw.opponentArchetype) ||
    asString(summary?.opponentDeckName) ||
    asString(raw.opponentDeckName)

  const userArchetypeId = canonicalizeArchetypeId(userArchetypeRaw || null) ?? inferred.userArchetype ?? null
  const opponentArchetypeId = canonicalizeArchetypeId(opponentArchetypeRaw || null) ?? inferred.opponentArchetype ?? null

  const parsedDate = parseDate(raw.createdAt ?? summary?.createdAt ?? summary?.date ?? raw.date)

  return {
    id,
    dateLabel: formatDateLabel(parsedDate),
    timestamp: parsedDate?.getTime() ?? 0,
    opponent: asString(summary?.opponent) || asString(raw.opponent) || "Unknown Opponent",
    userWon: asBoolean(summary?.userWon ?? raw.userWon),
    wentFirst: asBoolean(summary?.wentFirst ?? raw.wentFirst),
    turns: asNumber(summary?.turns ?? raw.turns),
    damageDealt: asNumber(summary?.damageDealt ?? raw.damageDealt),
    userPrizeCardsTaken: asNumber(summary?.userPrizeCardsTaken ?? raw.userPrizeCardsTaken),
    opponentPrizeCardsTaken: asNumber(summary?.opponentPrizeCardsTaken ?? raw.opponentPrizeCardsTaken),
    userMainAttacker,
    userOtherPokemon,
    opponentMainAttacker,
    opponentOtherPokemon,
    userArchetypeId,
    opponentArchetypeId,
  }
}

export function buildStatistics(rawGames: unknown[]): StatisticsModel {
  const games = rawGames
    .filter((item): item is RawGame => typeof item === "object" && item !== null)
    .map(normalizeGame)
    .filter((game): game is NormalizedGame => game !== null)
    .sort((a, b) => b.timestamp - a.timestamp)

  const totalGames = games.length

  const deckMap = new Map<string, MutableDeck>()
  const globalMatchupMap = new Map<string, MutableMatchup>()
  const opponentMap = new Map<string, MutableOpponent>()
  const globalPokemonMap = new Map<string, MutablePokemon>()

  let wins = 0
  let turnsSum = 0
  let damageSum = 0
  let userPrizesSum = 0
  let opponentPrizesSum = 0
  let firstTurnGames = 0
  let firstTurnWins = 0

  for (const game of games) {
    wins += game.userWon ? 1 : 0
    turnsSum += game.turns
    damageSum += game.damageDealt
    userPrizesSum += game.userPrizeCardsTaken
    opponentPrizesSum += game.opponentPrizeCardsTaken

    if (game.wentFirst) {
      firstTurnGames += 1
      if (game.userWon) firstTurnWins += 1
    }

    const deckKey = toDeckKey(game.userArchetypeId)
    let deck = deckMap.get(deckKey)
    if (!deck) {
      deck = {
        key: deckKey,
        archetypeId: game.userArchetypeId,
        label: formatArchetypeLabel(game.userArchetypeId),
        games: 0,
        wins: 0,
        turnsSum: 0,
        firstTurnGames: 0,
        firstTurnWins: 0,
        matchupMap: new Map<string, MutableMatchup>(),
        pokemonMap: new Map<string, MutablePokemon>(),
      }
      deckMap.set(deckKey, deck)
    }

    deck.games += 1
    deck.wins += game.userWon ? 1 : 0
    deck.turnsSum += game.turns
    if (game.wentFirst) {
      deck.firstTurnGames += 1
      if (game.userWon) deck.firstTurnWins += 1
    }

    const matchupKey = toDeckKey(game.opponentArchetypeId)
    const existingDeckMatchup = deck.matchupMap.get(matchupKey) ?? {
      opponentArchetypeId: game.opponentArchetypeId,
      games: 0,
      wins: 0,
    }
    existingDeckMatchup.games += 1
    existingDeckMatchup.wins += game.userWon ? 1 : 0
    deck.matchupMap.set(matchupKey, existingDeckMatchup)

    const existingGlobalMatchup = globalMatchupMap.get(matchupKey) ?? {
      opponentArchetypeId: game.opponentArchetypeId,
      games: 0,
      wins: 0,
    }
    existingGlobalMatchup.games += 1
    existingGlobalMatchup.wins += game.userWon ? 1 : 0
    globalMatchupMap.set(matchupKey, existingGlobalMatchup)

    const opponentName = game.opponent || "Unknown Opponent"
    const opponentKey = normalizeKey(opponentName) || "unknown-opponent"
    const opponentRec = opponentMap.get(opponentKey) ?? { name: opponentName, games: 0, wins: 0 }
    opponentRec.games += 1
    opponentRec.wins += game.userWon ? 1 : 0
    opponentMap.set(opponentKey, opponentRec)

    const pokemonInGame = new Set<string>()

    const mainPokemon = normalizePokemonName(game.userMainAttacker)
    if (mainPokemon) {
      const mainKey = normalizeKey(mainPokemon)
      if (mainKey) {
        pokemonInGame.add(mainKey)

        const deckPoke = deck.pokemonMap.get(mainKey) ?? {
          name: mainPokemon,
          games: 0,
          wins: 0,
          mainGames: 0,
          mainWins: 0,
        }
        deckPoke.games += 1
        deckPoke.wins += game.userWon ? 1 : 0
        deckPoke.mainGames += 1
        deckPoke.mainWins += game.userWon ? 1 : 0
        deck.pokemonMap.set(mainKey, deckPoke)

        const globalPoke = globalPokemonMap.get(mainKey) ?? {
          name: mainPokemon,
          games: 0,
          wins: 0,
          mainGames: 0,
          mainWins: 0,
        }
        globalPoke.games += 1
        globalPoke.wins += game.userWon ? 1 : 0
        globalPoke.mainGames += 1
        globalPoke.mainWins += game.userWon ? 1 : 0
        globalPokemonMap.set(mainKey, globalPoke)
      }
    }

    for (const rawName of game.userOtherPokemon) {
      const pokemon = normalizePokemonName(rawName)
      const key = normalizeKey(pokemon)
      if (!pokemon || !key || pokemonInGame.has(key)) continue
      pokemonInGame.add(key)

      const deckPoke = deck.pokemonMap.get(key) ?? {
        name: pokemon,
        games: 0,
        wins: 0,
        mainGames: 0,
        mainWins: 0,
      }
      deckPoke.games += 1
      deckPoke.wins += game.userWon ? 1 : 0
      deck.pokemonMap.set(key, deckPoke)

      const globalPoke = globalPokemonMap.get(key) ?? {
        name: pokemon,
        games: 0,
        wins: 0,
        mainGames: 0,
        mainWins: 0,
      }
      globalPoke.games += 1
      globalPoke.wins += game.userWon ? 1 : 0
      globalPokemonMap.set(key, globalPoke)
    }
  }

  const decks: DeckStat[] = Array.from(deckMap.values())
    .map((deck) => {
      const matchupStats: MatchupStat[] = Array.from(deck.matchupMap.values())
        .map((m) => {
          const losses = m.games - m.wins
          return {
            opponentArchetypeId: m.opponentArchetypeId,
            opponentLabel: formatArchetypeLabel(m.opponentArchetypeId),
            games: m.games,
            wins: m.wins,
            losses,
            winRate: safeWinRate(m.wins, m.games),
          }
        })
        .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.opponentLabel.localeCompare(b.opponentLabel))

      const pokemonStats = Array.from(deck.pokemonMap.values())
        .map(toPokemonStat)
        .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.name.localeCompare(b.name))

      const losses = deck.games - deck.wins
      return {
        key: deck.key,
        archetypeId: deck.archetypeId,
        label: deck.label,
        games: deck.games,
        wins: deck.wins,
        losses,
        winRate: safeWinRate(deck.wins, deck.games),
        firstTurnWinRate: safeWinRate(deck.firstTurnWins, deck.firstTurnGames),
        avgTurns: deck.games > 0 ? deck.turnsSum / deck.games : 0,
        matchupStats,
        pokemonStats,
      }
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.label.localeCompare(b.label))

  const overallMatchups: MatchupStat[] = Array.from(globalMatchupMap.values())
    .map((m) => {
      const losses = m.games - m.wins
      return {
        opponentArchetypeId: m.opponentArchetypeId,
        opponentLabel: formatArchetypeLabel(m.opponentArchetypeId),
        games: m.games,
        wins: m.wins,
        losses,
        winRate: safeWinRate(m.wins, m.games),
      }
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.opponentLabel.localeCompare(b.opponentLabel))

  const opponentStats: OpponentStat[] = Array.from(opponentMap.values())
    .map((o) => {
      const losses = o.games - o.wins
      return {
        name: o.name,
        games: o.games,
        wins: o.wins,
        losses,
        winRate: safeWinRate(o.wins, o.games),
      }
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.name.localeCompare(b.name))

  const globalPokemonStats: PokemonStat[] = Array.from(globalPokemonMap.values())
    .map(toPokemonStat)
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || a.name.localeCompare(b.name))

  const mostPlayedDeck = decks[0]?.label ?? "None"
  const mostSuccessfulDeck =
    decks.filter((deck) => deck.games >= 3).sort((a, b) => b.winRate - a.winRate || b.games - a.games)[0]?.label ??
    "None"

  const losses = totalGames - wins
  const overall: OverallStatsModel = {
    totalGames,
    wins,
    losses,
    winRate: safeWinRate(wins, totalGames),
    firstTurnGames,
    firstTurnWins,
    firstTurnWinRate: safeWinRate(firstTurnWins, firstTurnGames),
    avgTurns: totalGames > 0 ? turnsSum / totalGames : 0,
    avgDamageDealt: totalGames > 0 ? damageSum / totalGames : 0,
    avgUserPrizes: totalGames > 0 ? userPrizesSum / totalGames : 0,
    avgOpponentPrizes: totalGames > 0 ? opponentPrizesSum / totalGames : 0,
    mostPlayedDeck,
    mostSuccessfulDeck,
  }

  return {
    games,
    overall,
    decks,
    overallMatchups,
    opponentStats,
    globalPokemonStats,
  }
}
