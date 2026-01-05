import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
if (!uri) throw new Error("Missing MONGODB_URI")

const client = new MongoClient(uri)
await client.connect()

const db = client.db(process.env.MONGODB_DB) // or hardcode your db name
await Promise.all([
  db.collection("imports").deleteMany({}),
  db.collection("games").deleteMany({}),
])

console.log("Cleared app data collections.")
await client.close()
