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

export function analyzeGameLog(
  log: string,
  swapPlayers = false,
  _customUserMainAttacker?: string,
  _customOpponentMainAttacker?: string,
  userArchetypeOverrideId?: string | null,
  opponentArchetypeOverrideId?: string | null,
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

  // --- Determine player names and game winner from the raw log ---

  // Collect the two player names that appear in the log (ignoring "You" / "Opponent")
  const playerNames = new Set<string>()
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith("Setup") || line.startsWith("Turn #")) continue

    const nameMatch = line.match(/^([^\s]+)\s/)
    if (nameMatch) {
      const possibleName = nameMatch[1]
      if (possibleName !== "You" && possibleName !== "Opponent") {
        playerNames.add(possibleName)
        if (playerNames.size === 2) break
      }
    }
  }

  const [playerA, playerB] = Array.from(playerNames) as [string | undefined, string | undefined]

  // Try to determine who wins from the final line that contains "wins."
  const resultLine = lines.find((l) => l.includes("wins.")) || ""
  let winnerName: string | null = null
  if (resultLine) {
    const match = resultLine.match(/([^\s]+)\s+wins\./)
    winnerName = match?.[1] || null
  }

  if (playerA && playerB) {
    // Case 1: log explicitly says "Opponent took all of their Prize cards."
    if (resultLine.startsWith("Opponent took all of their Prize cards.")) {
      const opponentName =
        winnerName && (winnerName === playerA || winnerName === playerB) ? winnerName : playerB
      const userName = opponentName === playerA ? playerB : playerA
      username = userName || ""
      opponent = opponentName || ""
    }
    // Case 2: log explicitly says "You took all of your Prize cards."
    else if (resultLine.startsWith("You took all of your Prize cards.")) {
      const userName =
        winnerName && (winnerName === playerA || winnerName === playerB) ? winnerName : playerA
      const opponentName = userName === playerA ? playerB : playerA
      username = userName || ""
      opponent = opponentName || ""
    }
    // Fallback: treat the first name we saw as the user
    else {
      username = playerA || ""
      opponent = playerB || ""
    }
  } else {
    // Fallback to older behaviour based on the coin-flip lines if we somehow
    // did not detect both player names.
    for (const line of lines) {
      if (line.includes("chose") && line.includes("for the opening coin flip")) {
        username = line.split(" ")[0]
      } else if (line.includes("won the coin toss")) {
        const winner = line.split(" ")[0]
        if (winner !== username) {
          opponent = winner
        }
      }
    }
  }

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
  lines.forEach((line) => {
    // Count turns
    if (line.startsWith("Turn #")) {
      const turnNumber = Number.parseInt(line.split("#")[1])
      maxTurn = Math.max(maxTurn, turnNumber)
      currentTurn = turnNumber
      turnCount++
    }

    // ACE SPEC usage
    const aceSpecsInLine = detectAceSpecCards(line)
    aceSpecsInLine.forEach((aceSpec) => {
      if (line.startsWith(username)) {
        userAceSpecs.add(aceSpec)
      } else if (line.startsWith(opponent)) {
        opponentAceSpecs.add(aceSpec)
      }
    })

    // Prize cards taken
    if (line.includes("took a Prize card")) {
      if (line.startsWith(username)) {
        userPrizeCardsTaken++
      } else if (line.startsWith(opponent)) {
        opponentPrizeCardsTaken++
      }
    }

    const multiplePrizeCardMatch = line.match(/(\d+) Prize cards/)
    if (multiplePrizeCardMatch) {
      const prizeCardCount = Number.parseInt(multiplePrizeCardMatch[1])
      if (line.startsWith(username)) {
        userPrizeCardsTaken += prizeCardCount
      } else if (line.startsWith(opponent)) {
        opponentPrizeCardsTaken += prizeCardCount
      }
    }

    // Active / bench Pokémon
    if (
      line.includes("played") &&
      (line.includes("to the Active Spot") || line.includes("onto the Bench"))
    ) {
      const pokemonName = line.match(/played (.*?) (to the Active|onto the Bench)/)?.[1] || ""
      if (line.startsWith(username)) {
        userPokemon.add(pokemonName)
        if (line.includes("to the Active Spot")) {
          userActive = pokemonName
        }
        userStats[pokemonName] = userStats[pokemonName] || {
          name: pokemonName,
          totalDamage: 0,
          turnsOnBoard: 0,
          attackCount: 0,
        }
      } else if (line.startsWith(opponent)) {
        opponentPokemon.add(pokemonName)
        if (line.includes("to the Active Spot")) {
          opponentActive = pokemonName
        }
        opponentStats[pokemonName] = opponentStats[pokemonName] || {
          name: pokemonName,
          totalDamage: 0,
          turnsOnBoard: 0,
          attackCount: 0,
        }
      }
    }

    // Switches
    if (line.includes("is now in the Active Spot")) {
      const pokemonName = line.match(/(.*?) is now in the Active/)?.[1] || ""
      if (line.includes(`${username}'s`)) {
        userActive = pokemonName
        userPokemon.add(pokemonName)
        userStats[pokemonName] = userStats[pokemonName] || {
          name: pokemonName,
          totalDamage: 0,
          turnsOnBoard: 0,
          attackCount: 0,
        }
      } else if (line.includes(`${opponent}'s`)) {
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

    // Damage
    if (line.includes("used") && line.includes("for") && line.includes("damage")) {
      const pokemonName = line.match(/'s (.*?) used/)?.[1] || ""
      const damage = Number.parseInt(line.match(/for (\d+) damage/)?.[1] || "0")

      if (line.startsWith(username)) {
        userStats[pokemonName] = userStats[pokemonName] || {
          name: pokemonName,
          totalDamage: 0,
          turnsOnBoard: 0,
          attackCount: 0,
        }
        userStats[pokemonName].totalDamage += damage
        userStats[pokemonName].turnsOnBoard++
        userStats[pokemonName].attackCount++
        userPokemon.add(pokemonName)
      } else if (line.startsWith(opponent)) {
        opponentStats[pokemonName] = opponentStats[pokemonName] || {
          name: pokemonName,
          totalDamage: 0,
          turnsOnBoard: 0,
          attackCount: 0,
        }
        opponentStats[pokemonName].totalDamage += damage
        opponentStats[pokemonName].turnsOnBoard++
        opponentStats[pokemonName].attackCount++
        opponentPokemon.add(pokemonName)
      }

      if (damage > 240) {
        highDamageAttackCount++
      }
    }

    // Turns on board
    if (userActive && userStats[userActive]) {
      userStats[userActive].turnsOnBoard++
    }
    if (opponentActive && opponentStats[opponentActive]) {
      opponentStats[opponentActive].turnsOnBoard++
    }

    // Bench KOs / bench size
    if (line.includes("was Knocked Out") && line.includes("on the Bench")) {
      benchKnockouts++
    }
    if (line.includes("played") && line.includes("to the Bench")) {
      totalBenchedPokemon++
    }

    // Weakness
    if (line.includes("It's super effective!")) {
      weaknessBonus = true
    }

    // Action-packed turns
    const actionCount = (line.match(/•/g) || []).length
    if (actionCount > 12) {
      if (line.startsWith(username)) {
        actionPackedTurns.user++
      } else if (line.startsWith(opponent)) {
        actionPackedTurns.opponent++
      }
    }

    // Game result / concessions
    if (line.includes("wins") || line.includes("conceded")) {
      userWon = line.includes(`${username} wins`) || line.includes(`${opponent} conceded`)
      userConceded = line.includes(`${username} conceded`)
      opponentConceded = line.includes(`${opponent} conceded`)
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
  const winnerPrizePath = computeWinnerPrizePath(log, userWon)

  // Base summary
  const baseSummary = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString(),
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

export function getGameDataForConfirmation(log: string): {
  username: string
  opponent: string
  suggestedUserArchetype?: string | null
  suggestedOpponentArchetype?: string | null
} {
  const lines = log.split("\n")
  let username = ""
  let opponent = ""

  // Get player names (as before)
  for (const line of lines) {
    if (line.includes("chose tails") || line.includes("chose heads")) {
      username = line.split(" ")[0]
    } else if (line.includes("won the coin toss")) {
      const winner = line.split(" ")[0]
      opponent = winner !== username ? winner : ""
      break
    }
  }

  // Quick analysis to get auto-inferred archetypes as suggestions
  const quickAnalysis = analyzeGameLog(log, false)

  return {
    username,
    opponent,
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
function computeWinnerPrizePath(rawLog: string, userWon: boolean): string[] {
  const lines = rawLog.split(/\r?\n/)

  let username = ""
  let opponent = ""

  // Infer player names from the coin flip section
  for (const line of lines) {
    if (line.includes("chose tails") || line.includes("chose heads")) {
      // First word is usually the username
      username = line.split(" ")[0].trim()
    } else if (line.includes("won the coin toss")) {
      const winnerName = line.split(" ")[0].trim()
      if (winnerName !== username) {
        opponent = winnerName
      }
    }
    if (username && opponent) break
  }

  // Fallback if something looks off
   const winnerName = userWon ? username || "You" : opponent || "Opponent"

  const events: string[] = []
  let lastKO: string | null = null

  for (const raw of lines) {
    const line = raw.trim()

    // 1. Detect Knock Outs – allow "!" or "."
    const koMatch = line.match(/(.+?) was Knocked Out[!.]/i)
    if (koMatch) {
      lastKO = koMatch[1].trim()
      continue
    }

    // 2. Detect prize taking and tie it to the last KO
    const prizeMatch = line.match(/^(.*?) took (a|\d+) Prize cards?/i)
    if (prizeMatch && lastKO) {
      const takingPlayer = prizeMatch[1].trim()
      if (takingPlayer === winnerName) {
        events.push(cleanPokemonName(lastKO))
      }
      lastKO = null
      continue
    }
  }

  return events
}

export function parseGameTurns(log: string): GameTurn[] {
  const lines = log.split("\n")
  const turns: GameTurn[] = []
  let currentTurn: GameTurn | null = null
  let username = ""
  let opponent = ""
  const setupActions: { userActions: string[]; opponentActions: string[] } = {
    userActions: [],
    opponentActions: [],
  }
  let isInSetup = true
  let gameEndMessage = ""

  // First, determine the player names (initial guess)
  for (const line of lines) {
    if (line.includes("chose") && line.includes("for the opening coin flip")) {
      // First name we see in the coin flip line
      username = line.split(" ")[0]
    } else if (line.includes("won the coin toss")) {
      const winner = line.split(" ")[0]
      // Take the *other* name as the opponent if we already guessed username
      opponent = winner !== username ? winner : ""
      break
    }
  }

  // If we haven't found the opponent yet, look for them in the "drew 7 cards" line
  if (!opponent) {
    for (const line of lines) {
      if (line.includes("drew 7 cards") && !line.startsWith(username)) {
        opponent = line.split(" ")[0]
        break
      }
    }
  }

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
