import { randomUUID } from "node:crypto"
import { MongoClient } from "mongodb"

const baseUrl = "http://localhost:3000"
const emulatorUrl = "http://127.0.0.1:9099"
const email = `codex-${randomUUID()}@example.test`
const password = `Local-${randomUUID()}-Aa1!`
const username = `codex_${randomUUID().slice(0, 8)}`
const gameId = `codex-${randomUUID()}`
const mongo = new MongoClient(process.env.MONGODB_URI)
const firebaseUids = []

function cookieFrom(response, name) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") || ""]
  for (const value of values) {
    const match = value.match(new RegExp(`(?:^|\\s)${name}=([^;]*)`))
    if (match) return `${name}=${match[1]}`
  }
  throw new Error(`Missing ${name} cookie`)
}

async function json(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${response.status}: ${payload.error || "request failed"}`)
  return payload
}

async function createVerifiedIdentity(accountEmail, accountPassword) {
  const signUp = await fetch(`${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: accountEmail, password: accountPassword, returnSecureToken: true }),
  })
  const created = await json(signUp)
  firebaseUids.push(created.localId)

  await json(await fetch(`${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "VERIFY_EMAIL", idToken: created.idToken }),
  }))
  const codes = await json(await fetch(`${emulatorUrl}/emulator/v1/projects/demo-dragapultist/oobCodes`))
  const verification = [...codes.oobCodes].reverse().find((item) => item.email === accountEmail && item.requestType === "VERIFY_EMAIL")
  if (!verification?.oobCode) throw new Error("Auth emulator did not create an email-verification code")
  await json(await fetch(`${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oobCode: verification.oobCode }),
  }))

  return json(await fetch(`${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: accountEmail, password: accountPassword, returnSecureToken: true }),
  }))
}

try {
  await mongo.connect()

  const identity = await createVerifiedIdentity(email, password)
  const firebaseUid = identity.localId

  const csrfResponse = await fetch(`${baseUrl}/api/auth/session`)
  const csrfPayload = await json(csrfResponse)
  const csrfCookie = cookieFrom(csrfResponse, "dragapultist_csrf")

  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": baseUrl,
      "X-CSRF-Token": csrfPayload.csrfToken,
      "Cookie": csrfCookie,
    },
    body: JSON.stringify({ idToken: identity.idToken, csrfToken: csrfPayload.csrfToken, username }),
  })
  await json(sessionResponse)
  const sessionCookie = cookieFrom(sessionResponse, "dragapultist_session")

  const initialGames = await json(await fetch(`${baseUrl}/api/games`, { headers: { Cookie: sessionCookie } }))
  if (initialGames.games.length !== 0) throw new Error("Synthetic account did not start empty")

  const rawLog = [
    `${username} drew 7 cards for the opening hand.`,
    "Opponent drew 7 cards for the opening hand.",
    `Turn # 1 - ${username}'s Turn`,
    `${username} played Dragapult ex to the Active Spot.`,
    `${username} used Phantom Dive for 200 damage.`,
    `Opponent conceded. ${username} wins.`,
  ].join("\n")
  const gameSummary = {
    id: gameId,
    date: "9/12/2026",
    username,
    opponent: "Opponent",
    userMainAttacker: "Dragapult ex",
    opponentMainAttacker: "Test Pokémon",
    userOtherPokemon: [],
    opponentOtherPokemon: [],
    turns: 1,
    turnCount: 1,
    userWon: true,
    damageDealt: 200,
    userPrizeCardsTaken: 0,
    opponentPrizeCardsTaken: 0,
    rawLog,
    wentFirst: true,
    userConceded: false,
    opponentConceded: true,
    highDamageAttackCount: 1,
    benchKnockouts: 0,
    totalBenchedPokemon: 0,
    weaknessBonus: false,
    actionPackedTurns: { user: 0, opponent: 0 },
  }

  const save = await json(await fetch(`${baseUrl}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": baseUrl, "Cookie": sessionCookie },
    body: JSON.stringify({ gameSummary }),
  }))
  if (save.id !== gameId) throw new Error("Saved game ID did not match")

  const reloaded = await json(await fetch(`${baseUrl}/api/games/${encodeURIComponent(gameId)}`, {
    headers: { Cookie: sessionCookie },
  }))
  if (reloaded.game?.userId !== firebaseUid) throw new Error("Saved game ownership did not match verified UID")

  const deleteResponse = await json(await fetch(`${baseUrl}/api/games/${encodeURIComponent(gameId)}`, {
    method: "DELETE",
    headers: { "Origin": baseUrl, "Cookie": sessionCookie },
  }))
  if (!deleteResponse.ok) throw new Error("Game deletion failed")

  await json(await fetch(`${baseUrl}/api/auth/session`, {
    method: "DELETE",
    headers: { "Origin": baseUrl, "X-CSRF-Token": csrfPayload.csrfToken, "Cookie": csrfCookie },
  }))

  const signedOut = await json(await fetch(`${baseUrl}/api/games`))
  if (signedOut.games.length !== 0) throw new Error("Signed-out request exposed games")

  console.log(JSON.stringify({ signup: true, emailVerification: true, session: true, emptyAccount: true, saveReload: true, ownerIsolation: true, delete: true, logout: true }))
} finally {
  if (firebaseUids.length) {
    const db = mongo.db(process.env.MONGODB_DB || "dragapultist_v2")
    await db.collection("games").deleteMany({ userId: { $in: firebaseUids } })
    await db.collection("users").deleteMany({ firebaseUid: { $in: firebaseUids } })
  }
  await mongo.close()
}
