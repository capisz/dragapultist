import type { GameSummary, GameTurn } from "../types/game"

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
  customUserMainAttacker?: string,
  customOpponentMainAttacker?: string,
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

  // First pass to get player names and determine who actually went first
  for (const line of lines) {
    if (line.includes("chose tails") || line.includes("chose heads")) {
      username = line.split(" ")[0]
    } else if (line.includes("won the coin toss")) {
      const coinWinner = line.split(" ")[0]
      if (coinWinner !== username) {
        opponent = coinWinner
      }
      break
    }
  }

  // Determine who actually went first by looking for "decided to go second" or turn order
  let originalUserWentFirst = true // Default assumption
  for (const line of lines) {
    if (line.includes("decided to go second")) {
      const playerWhoDecidedSecond = line.split(" ")[0]
      if (playerWhoDecidedSecond === username) {
        originalUserWentFirst = false // Original user decided to go second
      }
      break
    } else if (line.startsWith("Turn # 1")) {
      // Check who took the first turn
      const nextLineIndex = lines.indexOf(line) + 1
      if (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex]
        if (nextLine.includes("Turn")) {
          const firstPlayer = nextLine.split(" ")[0].replace("'s", "")
          originalUserWentFirst = (firstPlayer === username)
        }
      }
      break
    }
  }

  // If swapPlayers is true, swap the username and opponent, and adjust wentFirst accordingly
  if (swapPlayers) {
    const temp = username
    username = opponent
    opponent = temp
    // If original user went first and we're swapping, new user went second (false)
    // If original user went second and we're swapping, new user went first (true)
    wentFirst = !originalUserWentFirst
  } else {
    wentFirst = originalUserWentFirst
  }

  // Track active Pokémon and damage
  let maxTurn = 0
  lines.forEach((line) => {
    // Count turns
    if (line.startsWith("Turn #")) {
      const turnNumber = Number.parseInt(line.split("#")[1])
      maxTurn = Math.max(maxTurn, turnNumber)
      currentTurn = turnNumber
      turnCount++
    }

    // Track ACE SPEC card usage
    const aceSpecsInLine = detectAceSpecCards(line)
    aceSpecsInLine.forEach((aceSpec) => {
      if (line.startsWith(username)) {
        userAceSpecs.add(aceSpec)
      } else if (line.startsWith(opponent)) {
        opponentAceSpecs.add(aceSpec)
      }
    })

    // Track prize cards taken
    if (line.includes("took a Prize card")) {
      if (line.startsWith(username)) {
        userPrizeCardsTaken++
      } else if (line.startsWith(opponent)) {
        opponentPrizeCardsTaken++
      }
    }

    // Additional check for multiple prize cards taken
    const multiplePrizeCardMatch = line.match(/(\d+) Prize cards/)
    if (multiplePrizeCardMatch) {
      const prizeCardCount = Number.parseInt(multiplePrizeCardMatch[1])
      if (line.startsWith(username)) {
        userPrizeCardsTaken += prizeCardCount
      } else if (line.startsWith(opponent)) {
        opponentPrizeCardsTaken += prizeCardCount
      }
    }

    // Track active Pokémon changes and bench additions
    if (line.includes("played") && (line.includes("to the Active Spot") || line.includes("onto the Bench"))) {
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

    // Track switches
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

    // Track damage dealt
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
      // Track high damage attacks
      if (damage > 240) {
        highDamageAttackCount++
      }
    }

    // Increment turns on board for active Pokémon
    if (userActive && userStats[userActive]) {
      userStats[userActive].turnsOnBoard++
    }
    if (opponentActive && opponentStats[opponentActive]) {
      opponentStats[opponentActive].turnsOnBoard++
    }

    // Track bench knockouts and total benched Pokemon
    if (line.includes("was Knocked Out") && line.includes("on the Bench")) {
      benchKnockouts++
    }
    if (line.includes("played") && line.includes("to the Bench")) {
      totalBenchedPokemon++
    }

    // Track weakness bonus
    if (line.includes("It's super effective!")) {
      weaknessBonus = true
    }

    // Track action-packed turns
    const actionCount = (line.match(/•/g) || []).length
    if (actionCount > 12) {
      if (line.startsWith(username)) {
        actionPackedTurns.user++
      } else if (line.startsWith(opponent)) {
        actionPackedTurns.opponent++
      }
    }

    // Track game result and concessions
    if (line.includes("wins") || line.includes("conceded")) {
      userWon = line.includes(`${username} wins`) || line.includes(`${opponent} conceded`)
      userConceded = line.includes(`${username} conceded`)
      opponentConceded = line.includes(`${opponent} conceded`)
    }
  })

  // Find main attackers (use custom if provided, otherwise auto-detect)
  const getUserMainAttacker = (stats: PlayerStats): string => {
    let mainAttacker = { name: "None", totalDamage: 0, turnsOnBoard: 0, attackCount: 0 }
    for (const pokemon of Object.values(stats)) {
      if (
        pokemon.attackCount > mainAttacker.attackCount ||
        (pokemon.attackCount === mainAttacker.attackCount && pokemon.turnsOnBoard > mainAttacker.turnsOnBoard) ||
        (pokemon.attackCount === mainAttacker.attackCount &&
          pokemon.turnsOnBoard === mainAttacker.turnsOnBoard &&
          pokemon.totalDamage > mainAttacker.totalDamage)
      ) {
        mainAttacker = pokemon
      }
    }
    return mainAttacker.name
  }

  const userMainAttacker = customUserMainAttacker || getUserMainAttacker(userStats)
  const opponentMainAttacker = customOpponentMainAttacker || getUserMainAttacker(opponentStats)

  // Calculate total damage dealt by user
  const totalDamageDealt = Object.values(userStats).reduce((total, pokemon) => total + pokemon.totalDamage, 0)

  const userOtherPokemon = Array.from(userPokemon).filter((pokemon) => pokemon !== userMainAttacker)
  const opponentOtherPokemon = Array.from(opponentPokemon).filter((pokemon) => pokemon !== opponentMainAttacker)

  const gameSummary = {
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
  }

  const defaultTags = generateDefaultTags(gameSummary)

  return {
    ...gameSummary,
    tags: defaultTags,
  }
}

// In the getGameDataForConfirmation function, clean the Pokémon names when adding them to the set
export function getGameDataForConfirmation(log: string): {
  userMainAttacker: string
  opponentMainAttacker: string
  username: string
  opponent: string
  allUserPokemon: string[]
  allOpponentPokemon: string[]
} {
  const lines = log.split("\n")
  let username = ""
  let opponent = ""
  const userPokemon: Set<string> = new Set()
  const opponentPokemon: Set<string> = new Set()

  // Get player names
  for (const line of lines) {
    if (line.includes("chose tails") || line.includes("chose heads")) {
      username = line.split(" ")[0]
    } else if (line.includes("won the coin toss")) {
      const winner = line.split(" ")[0]
      opponent = winner !== username ? winner : ""
      break
    }
  }

  // Helper function to clean Pokemon names
  const cleanName = (name: string) => name.replace(/^.*'s\s/, "")

  // Collect all Pokemon used by each player
  lines.forEach((line) => {
    // Track Pokemon played
    if (line.includes("played") && (line.includes("to the Active Spot") || line.includes("onto the Bench"))) {
      const pokemonNameMatch = line.match(/played (.*?) (to the Active|onto the Bench)/)
      if (pokemonNameMatch) {
        const pokemonName = pokemonNameMatch[1]
        if (line.startsWith(username)) {
          userPokemon.add(cleanName(pokemonName))
        } else if (line.startsWith(opponent)) {
          opponentPokemon.add(cleanName(pokemonName))
        }
      }
    }

    // Track Pokemon switches
    if (line.includes("is now in the Active Spot")) {
      const pokemonNameMatch = line.match(/(.*?) is now in the Active/)
      if (pokemonNameMatch) {
        const pokemonName = pokemonNameMatch[1]
        if (line.includes(`${username}'s`)) {
          userPokemon.add(cleanName(pokemonName))
        } else if (line.includes(`${opponent}'s`)) {
          opponentPokemon.add(cleanName(pokemonName))
        }
      }
    }

    // Track Pokemon that used attacks
    if (line.includes("used") && line.includes("for") && line.includes("damage")) {
      const pokemonNameMatch = line.match(/'s (.*?) used/)
      if (pokemonNameMatch) {
        const pokemonName = pokemonNameMatch[1]
        if (line.startsWith(username)) {
          userPokemon.add(cleanName(pokemonName))
        } else if (line.startsWith(opponent)) {
          opponentPokemon.add(cleanName(pokemonName))
        }
      }
    }
  })

  // Get a quick analysis to find suggested main attackers
  const quickAnalysis = analyzeGameLog(log, false)

  return {
    userMainAttacker: cleanName(quickAnalysis.userMainAttacker),
    opponentMainAttacker: cleanName(quickAnalysis.opponentMainAttacker),
    username,
    opponent,
    allUserPokemon: Array.from(userPokemon),
    allOpponentPokemon: Array.from(opponentPokemon),
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

  // First, determine the player names
  for (const line of lines) {
    if (line.includes("chose") && line.includes("for the opening coin flip")) {
      username = line.split(" ")[0]
    } else if (line.includes("won the coin toss")) {
      const winner = line.split(" ")[0]
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
