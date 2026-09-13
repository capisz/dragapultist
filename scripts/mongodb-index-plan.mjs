import { MongoClient } from "mongodb"

const databaseName = process.env.MONGODB_DB || "dragapultist_v2"
const definitions = {
  users: [
    { name: "uniq_firebase_uid", key: { firebaseUid: 1 }, unique: true, partialFilterExpression: { firebaseUid: { $type: "string" } } },
  ],
  games: [
    { name: "uniq_owner_game_id", key: { userId: 1, id: 1 }, unique: true, partialFilterExpression: { userId: { $type: "string" }, id: { $type: "string" } } },
    { name: "uniq_owner_content_hash", key: { userId: 1, contentHash: 1 }, unique: true, partialFilterExpression: { userId: { $type: "string" }, contentHash: { $type: "string" } } },
    { name: "owner_history", key: { userId: 1, createdAt: -1, id: 1 } },
  ],
  imports: [
    { name: "uniq_owner_import_hash", key: { userId: 1, contentHash: 1 }, unique: true, partialFilterExpression: { userId: { $type: "string" }, contentHash: { $type: "string" } } },
  ],
}

if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ database: databaseName, mode: "plan-only", definitions }, null, 2))
  process.exit(0)
}

if (databaseName !== "dragapultist_v2" || process.env.CONFIRM_INDEX_DATABASE !== databaseName) {
  throw new Error("Refusing to apply indexes without MONGODB_DB=dragapultist_v2 and CONFIRM_INDEX_DATABASE=dragapultist_v2.")
}
if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI locally.")

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
try {
  const db = client.db(databaseName)
  for (const [collectionName, indexes] of Object.entries(definitions)) {
    for (const { key, ...options } of indexes) {
      await db.collection(collectionName).createIndex(key, options)
    }
  }
  console.log(JSON.stringify({ database: databaseName, applied: true }))
} finally {
  await client.close()
}

