import type { GameSummary, GameTurn } from "../types/game"
import { inferArchetypesForSummary } from "./archetype-mapping"


interface PlayerStats {
  [key: string]: {
    name: string
    totalDamage: number
    turnsOnBoard: number
    attackCount: number
  }
}

// ACE SPEC cards list
const ACE_SPEC_CARDS = [
  "Awakening Drum",
  "Hero's Cape",
  "Master Ball",
  "Maximum Belt",
  "Prime Catcher",
  "Reboot Pod",
  "Hyper Aroma",
  "Scoop Up Cyclone",
  "Secret Box",
  "Survival Brace",
  "Unfair Stamp",
  "Dangerous Laser",
  "Neutralization Zone",
  "Poké Vital A",
  "Deluxe Bomb",
  "Grand Tree",
  "Sparkling Crystal",
  "Amulet of Hope",
  "Brilliant Blender",
  "Energy Search Pro",
  "Megaton Blower",
  "Miracle Headset",
  "Precious Trolley",
  "Scramble Switch",
  "Max Rod",
  "Treasure Tracker",
]

function generateDefaultTags(game: GameSummary): { text: string; color: string }[] {
  const tags: { text: string; color: string }[] = []

  // Existing tags
  if (game.userWon) {
    tags.push({ text: "Win", color: "#90EE90" })
  } else {
    tags.push({ text: "Loss", color: "#FFA07A" })
  }

  // New tags
  if (game.turns > 10) {
    tags.push({ text: "Slow", color: "#A9A9A9" })
  } else if (game.turns <= 3) {
    tags.push({ text: "Speedy", color: "#FFD700" })
  }

  if (game.highDamageAttackCount > 1) {
    tags.push({ text: "Heavy Hitter", color: "#FF4500" })
  }

  if (game.benchKnockouts > 0) {
    tags.push({ text: "Bench Slap", color: "#4169E1" })
  }

  if (game.totalBenchedPokemon > 15) {
    tags.push({ text: "Bench Brawl", color: "#32CD32" })
  }

  if (game.weaknessBonus) {
    tags.push({ text: "Weakness", color: "#FF69B4" })
  }

  if (game.actionPackedTurns.user > 1 && game.actionPackedTurns.opponent > 1) {
    tags.push({ text: "Action Packed", color: "#9932CC" })
  }

  if (game.wentFirst) {
    tags.push({ text: "Went First", color: "#E6E6FA" })
  }

  return tags
}

// Function to detect ACE SPEC cards in text
function detectAceSpecCards(text: string): string[] {
  const foundAceSpecs: string[] = []
  ACE_SPEC_CARDS.forEach((aceSpec) => {
    if (text.includes(aceSpec)) {
      foundAceSpecs.push(aceSpec)
    }
  })
  return foundAceSpecs
}

function normalizeName(n: string): string {
  return (n ?? "").trim().toLowerCase()
}

function sameName(a: string, b: string): boolean {
  return normalizeName(a) !== "" && normalizeName(a) === normalizeName(b)
}

function extractPlayersFromOpeningHands(lines: string[]): string[] {
  const names: string[] = []
  const re = /^(.+?) drew 7 cards for the opening hand\./i

  for (const raw of lines) {
    const m = raw.trim().match(re)
    if (!m) continue
    const nm = (m[1] ?? "").trim()
    if (!nm) continue
    if (!names.some((x) => sameName(x, nm))) names.push(nm)
    if (names.length >= 2) break
  }

  return names
}

function extractPlayersFromPrefixes(lines: string[]): string[] {
  const names: string[] = []
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith("Setup") || line.startsWith("Turn #")) continue
    if (line.startsWith("-") || line.startsWith("•")) continue

    const m = line.match(/^([^\s]+)\s/)
    if (!m) continue
    const nm = (m[1] ?? "").trim()
    if (!nm) continue
    if (nm === "You" || nm === "Opponent") continue
    if (!names.some((x) => sameName(x, nm))) names.push(nm)
    if (names.length >= 2) break
  }
  return names
}

function resolvePlayers(lines: string[], preferredUsername?: string): { username: string; opponent: string } {
  // Best source: opening hand lines
  let names = extractPlayersFromOpeningHands(lines)

  // Fallback: prefix scan
  if (names.length < 2) names = extractPlayersFromPrefixes(lines)

  const a = names[0] ?? ""
  const b = names[1] ?? ""

  // If the user has set their PTCGL username, use it to anchor identity.
  if (preferredUsername && a && b) {
    if (sameName(preferredUsername, a)) return { username: a, opponent: b }
    if (sameName(preferredUsername, b)) return { username: b, opponent: a }
  }

    // If we can see a "wins." line with an "Opponent/You ..." prefix, use it to anchor POV.
const resultLine = [...lines].reverse().find((l) => /\bwins\./i.test(l))?.trim() ?? ""
const winner = extractWinnerFromResultLine(resultLine)

  if (winner && a && b && (sameName(winner, a) || sameName(winner, b))) {
    const other = sameName(winner, a) ? b : a

    if (/^Opponent conceded\./i.test(resultLine) || /^You took all of your Prize cards\./i.test(resultLine)) {
      // Opponent conceded => YOU (this log's POV) is the winner
      return { username: winner, opponent: other }
    }

    if (/^You conceded\./i.test(resultLine) || /^Opponent took all of their Prize cards\./i.test(resultLine)) {
      // You conceded OR opponent took all prizes => opponent is the winner => YOU are the other name
      return { username: other, opponent: winner }
    }
  }

  // If logs literally use "You"/"Opponent", keep that convention
  if (a === "You" && b === "Opponent") return { username: "You", opponent: "Opponent" }
  if (a === "Opponent" && b === "You") return { username: "You", opponent: "Opponent" }

  // Last resort: stable default ordering
  return { username: a, opponent: b }
}

function stripOwnerPrefix(name: string): string {
  // Handles both straight and curly apostrophes: "capisz's X" and "capisz’s X"
  return (name ?? "").replace(/^[^'’]+['’]s\s+/i, "").trim()
}

export function analyzeGameLog(
  log: string,
  swapPlayers = false,
  _customUserMainAttacker?: string,
  _customOpponentMainAttacker?: string,
  userArchetypeOverrideId?: string | null,
  opponentArchetypeOverrideId?: string | null, 
  preferredUsername?: string,
): GameSummary {
  const lines = log.split("\n")
  const userStats: PlayerStats = {}
  const opponentStats: PlayerStats = {}
  const userPokemon: Set<string> = new Set()
  const opponentPokemon: Set<string> = new Set()

  let currentTurn = 0
  let userActive = ""
  let opponentActive = ""
  let username = ""
  let opponent = ""
  let userWon = false
  let userPrizeCardsTaken = 0
  let opponentPrizeCardsTaken = 0
  let wentFirst = false
  let userConceded = false
  let opponentConceded = false

  let turnCount = 0
  let highDamageAttackCount = 0
  let benchKnockouts = 0
  let totalBenchedPokemon = 0
  let weaknessBonus = false
  const actionPackedTurns = { user: 0, opponent: 0 }

  // Track ACE SPEC cards used
  const userAceSpecs: Set<string> = new Set()
  const opponentAceSpecs: Set<string> = new Set()

  // --- Determine player names (anchor to preferredUsername if provided) ---
  const resolved = resolvePlayers(lines, preferredUsername)
  username = resolved.username
  opponent = resolved.opponent

  // Determine who actually went first by looking for "decided to go second" or turn order
  let originalUserWentFirst = true
  for (const line of lines) {
    if (line.includes("decided to go second")) {
      const playerWhoDecidedSecond = line.split(" ")[0]
      if (playerWhoDecidedSecond === username) {
        originalUserWentFirst = false
      }
      break
    } else if (line.startsWith("Turn # 1")) {
      const nextLineIndex = lines.indexOf(line) + 1
      if (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex]
        if (nextLine.includes("Turn")) {
          const firstPlayer = nextLine.split(" ")[0].replace("'s", "")
          originalUserWentFirst = firstPlayer === username
        }
      }
      break
    }
  }

  // Swap players if requested
  if (swapPlayers) {
    const temp = username
    username = opponent
    opponent = temp
    wentFirst = !originalUserWentFirst
  } else {
    wentFirst = originalUserWentFirst
  }

    // --- Walk lines and collect stats ---
  let maxTurn = 0
  let lastActor: "user" | "opponent" | null = null

  lines.forEach((rawLine) => {
    const line = rawLine.trim()
    if (!line) return

    // Count turns
    if (line.startsWith("Turn #")) {
      const turnNumber = Number.parseInt(line.split("#")[1], 10)
      if (Number.isFinite(turnNumber)) {
        maxTurn = Math.max(maxTurn, turnNumber)
        currentTurn = turnNumber
        turnCount++
      }
      // reset lastActor at turn boundary (optional but helps)
      lastActor = null
      return
    }

    const isUser = username && line.startsWith(username)
    const isOpp = opponent && line.startsWith(opponent)

    if (isUser) lastActor = "user"
    else if (isOpp) lastActor = "opponent"

    const isSub = line.startsWith("-") || line.startsWith("•")
    const owner: "user" | "opponent" | null = isUser ? "user" : isOpp ? "opponent" : isSub ? lastActor : null
    const content = line.replace(/^[-•]\s*/, "")

    // ACE SPEC usage
    const aceSpecsInLine = detectAceSpecCards(content)
    aceSpecsInLine.forEach((aceSpec) => {
      if (owner === "user") userAceSpecs.add(aceSpec)
      else if (owner === "opponent") opponentAceSpecs.add(aceSpec)
    })

    // Prize cards taken
    if (content.includes("took a Prize card")) {
      if (owner === "user") userPrizeCardsTaken++
      else if (owner === "opponent") opponentPrizeCardsTaken++
    }

    const multiPrize = content.match(/took\s+(\d+)\s+Prize cards?/i)
    if (multiPrize) {
      const n = Number.parseInt(multiPrize[1], 10)
      if (Number.isFinite(n)) {
        if (owner === "user") userPrizeCardsTaken += n
        else if (owner === "opponent") opponentPrizeCardsTaken += n
      }
    }

    // Active / bench Pokémon (FIX: handles "to the Bench" and "- drew X and played it to the Bench.")
    if (owner && content.includes("played")) {
      const playedActive = content.match(/played (.+?) to the Active Spot\./i)
      const playedBench =
        content.match(/played (.+?) to the Bench\./i) ||
        content.match(/played (.+?) onto the Bench\./i) ||
        content.match(/drew (.+?) and played it to the Bench\./i)

      const playedNameRaw = (playedActive?.[1] || playedBench?.[1] || "").trim()
      const playedName = stripOwnerPrefix(playedNameRaw)

      if (playedName) {
        if (owner === "user") {
          userPokemon.add(playedName)
          if (playedActive) userActive = playedName
          userStats[playedName] = userStats[playedName] || {
            name: playedName,
            totalDamage: 0,
            turnsOnBoard: 0,
            attackCount: 0,
          }
        } else {
          opponentPokemon.add(playedName)
          if (playedActive) opponentActive = playedName
          opponentStats[playedName] = opponentStats[playedName] || {
            name: playedName,
            totalDamage: 0,
            turnsOnBoard: 0,
            attackCount: 0,
          }
        }
      }
    }

    // Switches (FIX: strip "X's" prefix from the captured name)
    if (owner && content.includes("is now in the Active Spot")) {
      const m = content.match(/(.+?) is now in the Active Spot\./i)
      const pokemonName = stripOwnerPrefix((m?.[1] || "").trim())
      if (pokemonName) {
        if (owner === "user") {
          userActive = pokemonName
          userPokemon.add(pokemonName)
          userStats[pokemonName] = userStats[pokemonName] || {
            name: pokemonName,
            totalDamage: 0,
            turnsOnBoard: 0,
            attackCount: 0,
          }
        } else {
          opponentActive = pokemonName
          opponentPokemon.add(pokemonName)
          opponentStats[pokemonName] = opponentStats[pokemonName] || {
            name: pokemonName,
            totalDamage: 0,
            turnsOnBoard: 0,
            attackCount: 0,
          }
        }
      }
    }

    // Damage (FIX: handle curly apostrophe)
    if (owner && content.includes("used") && content.includes("for") && content.includes("damage")) {
      const pokemonName = content.match(/['’]s (.*?) used/i)?.[1] || ""
      const damage = Number.parseInt(content.match(/for (\d+) damage/)?.[1] || "0", 10)

      if (pokemonName) {
        if (owner === "user") {
          userStats[pokemonName] = userStats[pokemonName] || {
            name: pokemonName,
            totalDamage: 0,
            turnsOnBoard: 0,
            attackCount: 0,
          }
          userStats[pokemonName].totalDamage += damage
          userStats[pokemonName].attackCount++
          userPokemon.add(pokemonName)
        } else {
          opponentStats[pokemonName] = opponentStats[pokemonName] || {
            name: pokemonName,
            totalDamage: 0,
            turnsOnBoard: 0,
            attackCount: 0,
          }
          opponentStats[pokemonName].totalDamage += damage
          opponentStats[pokemonName].attackCount++
          opponentPokemon.add(pokemonName)
        }
      }

      if (damage > 240) highDamageAttackCount++
    }

    // Turns on board (keep your behavior)
    if (userActive && userStats[userActive]) userStats[userActive].turnsOnBoard++
    if (opponentActive && opponentStats[opponentActive]) opponentStats[opponentActive].turnsOnBoard++

    // Bench KOs / bench size
    if (content.includes("was Knocked Out") && content.includes("on the Bench")) benchKnockouts++
    if (content.includes("played") && content.includes("to the Bench")) totalBenchedPokemon++

    // Weakness
    if (content.includes("It's super effective!")) weaknessBonus = true

    // Action-packed turns (keep your behavior)
    const actionCount = (line.match(/•/g) || []).length
    if (actionCount > 12) {
      if (owner === "user") actionPackedTurns.user++
      else if (owner === "opponent") actionPackedTurns.opponent++
    }

    // Game result / concessions
   if (content.includes("wins") || content.includes("conceded")) {
  // Named wins line (e.g. "capisz wins.")
  if (username && content.includes(`${username} wins`)) userWon = true
  if (opponent && content.includes(`${opponent} wins`)) userWon = false

  // POV-style concession lines
  if (/^Opponent conceded\./i.test(content)) {
    userWon = true
    opponentConceded = true
  }
  if (/^You conceded\./i.test(content)) {
    userWon = false
    userConceded = true
  }

  // Named concessions (if present)
  if (username && content.includes(`${username} conceded`)) {
    userWon = false
    userConceded = true
  }
  if (opponent && content.includes(`${opponent} conceded`)) {
    userWon = true
    opponentConceded = true
  }
}
  })

  // Main attackers (still computed for display, but not user-controlled)
  const getUserMainAttacker = (stats: PlayerStats): string => {
    let mainAttacker = { name: "None", totalDamage: 0, turnsOnBoard: 0, attackCount: 0 }
    for (const pokemon of Object.values(stats)) {
      if (
        pokemon.attackCount > mainAttacker.attackCount ||
        (pokemon.attackCount === mainAttacker.attackCount &&
          pokemon.turnsOnBoard > mainAttacker.turnsOnBoard) ||
        (pokemon.attackCount === mainAttacker.attackCount &&
          pokemon.turnsOnBoard === mainAttacker.turnsOnBoard &&
          pokemon.totalDamage > mainAttacker.totalDamage)
      ) {
        mainAttacker = pokemon
      }
    }
    return mainAttacker.name
  }

  const userMainAttacker = getUserMainAttacker(userStats)
  const opponentMainAttacker = getUserMainAttacker(opponentStats)

  // Total damage dealt by user
  const totalDamageDealt = Object.values(userStats).reduce(
    (total, pokemon) => total + pokemon.totalDamage,
    0,
  )

  const userOtherPokemon = Array.from(userPokemon).filter(
    (pokemon) => pokemon !== userMainAttacker,
  )
  const opponentOtherPokemon = Array.from(opponentPokemon).filter(
    (pokemon) => pokemon !== opponentMainAttacker,
  )

  // Winner prize path
const winnerName = userWon ? username : opponent
const winnerPrizePath = computeWinnerPrizePath(log, winnerName)

  // Base summary
  const baseSummary = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
    username,
    opponent,
    userMainAttacker,
    opponentMainAttacker,
    userOtherPokemon,
    opponentOtherPokemon,
    turns: Math.ceil(maxTurn / 2),
    userWon,
    damageDealt: totalDamageDealt,
    userPrizeCardsTaken,
    opponentPrizeCardsTaken,
    rawLog: log,
    wentFirst,
    userConceded,
    opponentConceded,
    turnCount,
    highDamageAttackCount,
    benchKnockouts,
    totalBenchedPokemon,
    weaknessBonus,
    actionPackedTurns,
    userAceSpecs: Array.from(userAceSpecs),
    opponentAceSpecs: Array.from(opponentAceSpecs),
    winnerPrizePath,
  }

  // Infer archetypes from attackers + partners
  const {
    userArchetype: inferredUserArchetype,
    opponentArchetype: inferredOpponentArchetype,
  } = inferArchetypesForSummary(baseSummary)

  const gameSummaryWithArchetypes: GameSummary = {
    ...baseSummary,
    userArchetype: userArchetypeOverrideId ?? inferredUserArchetype ?? null,
    opponentArchetype: opponentArchetypeOverrideId ?? inferredOpponentArchetype ?? null,
  }

  const defaultTags = generateDefaultTags(gameSummaryWithArchetypes)

  return {
    ...gameSummaryWithArchetypes,
    tags: defaultTags,
  }
}

export function getGameDataForConfirmation(
  log: string,
  preferredUsername?: string,
): {
  username: string
  opponent: string
  suggestedUserArchetype?: string | null
  suggestedOpponentArchetype?: string | null
} {
  const lines = log.split("\n")

  // Use the same resolver as analyzeGameLog so the dialog matches the actual saved game.
  const resolved = resolvePlayers(lines, preferredUsername)

  // IMPORTANT: run analysis anchored to preferredUsername so "user" side is correct.
  const quickAnalysis = analyzeGameLog(
    log,
    false,
    undefined,
    undefined,
    null,
    null,
    preferredUsername,
  )
  console.log("[CONFIRM]", { preferredUsername, resolved })
  return {
    username: resolved.username,
    opponent: resolved.opponent,
    suggestedUserArchetype: quickAnalysis.userArchetype ?? null,
    suggestedOpponentArchetype: quickAnalysis.opponentArchetype ?? null,
  }
}

// Function to highlight ACE SPEC cards in text
export function highlightAceSpecCards(text: string): string {
  let highlightedText = text
  ACE_SPEC_CARDS.forEach((aceSpec) => {
    const regex = new RegExp(`\\b${aceSpec}\\b`, "gi")
    highlightedText = highlightedText.replace(
      regex,
      `<span style="color: #FF00FF; font-weight: bold;">${aceSpec}</span>`,
    )
  })
  return highlightedText
}

// --- Prize-path extraction helpers ---
function extractWinnerFromResultLine(line: string): string {
  if (!line) return ""
  // Handles: "Opponent conceded. capisz wins." and also "capisz wins."
  const matches = Array.from(line.matchAll(/(?:^|[.!?]\s*)([^.!?]+?)\s+wins\./gi))
  return (matches.at(-1)?.[1] ?? "").trim()
}


function cleanPokemonName(name: string): string {
  // Similar to the cleanName logic in GameDetail but focused on KO lines
  return name
    .replace(/^Opponent's\s+/i, "")
    .replace(/^Your\s+/i, "")
    .trim()
}

/**
 * Extract the winner's prize-taking sequence (prize map) from the raw TCG Live log.
 *
 * We look for patterns like:
 *   "<Pokemon> was Knocked Out."
 *   "<PlayerName> took 2 Prize cards."
 * and pair them. Only prize events for the eventual winner are recorded.
 */
function computeWinnerPrizePath(rawLog: string, winnerName: string): string[] {
  const lines = rawLog.split(/\r?\n/)
  const winnerNorm = normalizeName(winnerName)
  if (!winnerNorm) return []

  const events: string[] = []
  const pendingKOs: { ownerNorm: string; victim: string }[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // KO lines:
    // "capisz's Dusknoir was Knocked Out!"
    // "brunolugon’s Munkidori was Knocked Out!"
    // fallback: "Munkidori was Knocked Out!"
    const ownedKO = line.match(/^(.+?)['’]s\s+(.+?)\s+was Knocked Out[!.]/i)
    if (ownedKO) {
      const owner = (ownedKO[1] ?? "").trim()
      const victim = stripOwnerPrefix((ownedKO[2] ?? "").trim())
      if (victim) pendingKOs.push({ ownerNorm: normalizeName(owner), victim })
      continue
    }

    const bareKO = line.match(/^(.+?)\s+was Knocked Out[!.]/i)
    if (bareKO) {
      const victim = stripOwnerPrefix((bareKO[1] ?? "").trim())
      if (victim) pendingKOs.push({ ownerNorm: "", victim })
      continue
    }

    // Prize lines:
    // "capisz took a Prize card." / "capisz took 2 Prize cards."
    const pm = line.match(/^(.+?)\s+took\s+(?:a|an|\d+)\s+Prize card(?:s)?/i)
    if (!pm) continue

    const takerNorm = normalizeName((pm[1] ?? "").trim())
    if (!takerNorm) continue

    // Match the most recent KO that belongs to the OTHER side (owner != taker)
    let idx = -1
    for (let i = pendingKOs.length - 1; i >= 0; i--) {
      const ko = pendingKOs[i]
      if (!ko.ownerNorm || ko.ownerNorm !== takerNorm) {
        idx = i
        break
      }
    }
    if (idx < 0) continue

    const [ko] = pendingKOs.splice(idx, 1)

    // Only record prize events taken by the winner
    if (takerNorm === winnerNorm) events.push(cleanPokemonName(ko.victim))
  }

  return events
}

export function parseGameTurns(log: string, preferredUsername?: string): GameTurn[] {
  const lines = log.split("\n")
  const turns: GameTurn[] = []
  let currentTurn: GameTurn | null = null
  const resolved = resolvePlayers(lines, preferredUsername)
  let username = resolved.username
  let opponent = resolved.opponent
  const setupActions: { userActions: string[]; opponentActions: string[] } = {
    userActions: [],
    opponentActions: [],
  }
  let isInSetup = true
  let gameEndMessage = ""

  // Extra correction: if the log explicitly says "Opponent took all of their Prize cards.
  // XYZ wins.", then XYZ is the opponent from the log's point of view.
  // If our initial guess has XYZ as the username, we need to swap.
  const opponentPrizeRegex = /^Opponent took all of their Prize cards\.\s*(.+?) wins\./

  for (const line of lines) {
    const match = line.match(opponentPrizeRegex)
    if (match) {
      const opponentFromText = match[1].trim()

      if (username === opponentFromText && opponent) {
        // We accidentally treated the opponent as the user; flip them
        const tmp = username
        username = opponent
        opponent = tmp
      } else if (!opponent) {
        // We never found an opponent; at least set it from the text
        opponent = opponentFromText
      }
      break
    }
  }


  const removePlayerNames = (action: string): string => {
    let cleanedAction = action
    if (username) {
      cleanedAction = cleanedAction.replace(`${username}'s `, "")
      cleanedAction = cleanedAction.replace(username + " ", "")
    }
    if (opponent) {
      cleanedAction = cleanedAction.replace(`${opponent}'s `, "")
      cleanedAction = cleanedAction.replace(opponent + " ", "")
    }
    return cleanedAction
  }

  let currentGameTurn = 0

  lines.forEach((line) => {
    if (line.trim() === "") return

    // Check for turn markers
    if (line.startsWith("Turn #")) {
      isInSetup = false
      const turnNumber = Number.parseInt(line.split("#")[1])
      const gameNumber = Math.ceil(turnNumber / 2)

      if (gameNumber !== currentGameTurn) {
        if (currentTurn) {
          turns.push(currentTurn)
        }
        currentGameTurn = gameNumber
        currentTurn = {
          turnNumber: gameNumber,
          userActions: [],
          opponentActions: [],
        }
      }
      return
    }

    const cleanedAction = removePlayerNames(line.trim())

    // Handle setup phase
    if (isInSetup) {
      if (line.startsWith(username)) {
        setupActions.userActions.push(cleanedAction)
      } else if (line.startsWith(opponent)) {
        setupActions.opponentActions.push(cleanedAction)
      } else if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
        // Add sub-actions to the last player who acted
        if (setupActions.userActions.length > setupActions.opponentActions.length) {
          setupActions.userActions.push(cleanedAction)
        } else {
          setupActions.opponentActions.push(cleanedAction)
        }
      }
      return
    }

    // Handle regular turns
    if (!currentTurn) {
      currentTurn = {
        turnNumber: currentGameTurn,
        userActions: [],
        opponentActions: [],
      }
    }

    // Handle game end conditions
    if (line.includes("conceded")) {
      if (line.startsWith("Opponent")) {
        currentTurn.opponentActions.push("Opponent conceded the game")
        gameEndMessage = "You won by opponent's concession"
      } else if (line.includes(`${opponent} conceded`)) {
        currentTurn.opponentActions.push("Opponent conceded the game")
        gameEndMessage = "You won by opponent's concession"
      } else if (line.includes(`${username} conceded`)) {
        currentTurn.userActions.push("You conceded the game")
        gameEndMessage = "Opponent won by your concession"
      }
      return
    }

    // Handle regular win conditions
    if (line.includes("wins")) {
      if (line.includes(`${username} wins`)) {
        gameEndMessage = "You won by taking all prize cards"
      } else if (line.includes(`${opponent} wins`)) {
        gameEndMessage = "Opponent won by taking all prize cards"
      }
    }

    if (line.startsWith(username)) {
      currentTurn.userActions.push(cleanedAction)
    } else if (line.startsWith(opponent)) {
      currentTurn.opponentActions.push(cleanedAction)
    } else if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
      // Add sub-actions to the last player who acted in this turn
      if (line.includes(`${username}'s`)) {
        currentTurn.userActions.push(cleanedAction)
      } else if (line.includes(`${opponent}'s`)) {
        currentTurn.opponentActions.push(cleanedAction)
      } else {
        // If we can't determine ownership, add to the last player who acted
        const lastActionWasUser =
          currentTurn.userActions.length > 0 &&
          (!currentTurn.opponentActions.length ||
            currentTurn.userActions[currentTurn.userActions.length - 1].endsWith("turn."))
        if (lastActionWasUser) {
          currentTurn.userActions.push(cleanedAction)
        } else {
          currentTurn.opponentActions.push(cleanedAction)
        }
      }
    }
  })

  // Add the setup phase as turn 0
  if (setupActions.userActions.length > 0 || setupActions.opponentActions.length > 0) {
    turns.unshift({
      turnNumber: 0,
      userActions: setupActions.userActions,
      opponentActions: setupActions.opponentActions,
    })
  }

  // Add the last turn if it exists and include the game end message
  if (currentTurn && (currentTurn.userActions.length > 0 || currentTurn.opponentActions.length > 0)) {
    if (gameEndMessage) {
      // Add the game end message to the appropriate player's actions
      if (gameEndMessage.startsWith("You won")) {
        currentTurn.userActions.push(gameEndMessage)
      } else {
        currentTurn.opponentActions.push(gameEndMessage)
      }
    }
    turns.push(currentTurn)
  }

  return turns
}
