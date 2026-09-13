import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
if (!uri) throw new Error("Set MONGODB_URI locally. Do not paste it into chat or commit it.")

const client = new MongoClient(uri, { readPreference: "secondaryPreferred" })
await client.connect()

try {
  const db = client.db(process.env.MONGODB_DB || "dragapultist_v2")
  const collectionNames = ["users", "games", "imports"]
  const collections = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name))
  const report = { database: db.databaseName, collections: {} }

  for (const name of collectionNames) {
    if (!collections.has(name)) {
      report.collections[name] = { exists: false }
      continue
    }

    const collection = db.collection(name)
    report.collections[name] = {
      exists: true,
      documents: await collection.estimatedDocumentCount({ maxTimeMS: 10_000 }),
      indexes: (await collection.indexes()).map((index) => ({ name: index.name, key: index.key, unique: index.unique === true })),
    }
  }

  if (collections.has("users")) {
    const users = db.collection("users")
    const [shape] = await users
      .aggregate(
        [
          {
            $group: {
              _id: null,
              firebaseLinked: { $sum: { $cond: [{ $eq: [{ $type: "$firebaseUid" }, "string"] }, 1, 0] } },
              passwordHashes: { $sum: { $cond: [{ $eq: [{ $type: "$passwordHash" }, "string"] }, 1, 0] } },
              maxAvatarBytes: { $max: { $cond: [{ $eq: [{ $type: "$avatarImage" }, "string"] }, { $strLenBytes: "$avatarImage" }, 0] } },
              maxBannerBytes: { $max: { $cond: [{ $eq: [{ $type: "$bannerImage" }, "string"] }, { $strLenBytes: "$bannerImage" }, 0] } },
            },
          },
          { $project: { _id: 0 } },
        ],
        { maxTimeMS: 10_000 },
      )
      .toArray()
    report.collections.users.shape = shape || {}
  }

  if (collections.has("games")) {
    const games = db.collection("games")
    report.collections.games.ownerTypes = await games
      .aggregate([{ $group: { _id: { $type: "$userId" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }], { maxTimeMS: 10_000 })
      .toArray()
    const [sizes] = await games
      .aggregate(
        [
          {
            $group: {
              _id: null,
              maxRawLogBytes: { $max: { $cond: [{ $eq: [{ $type: "$rawLog" }, "string"] }, { $strLenBytes: "$rawLog" }, 0] } },
            },
          },
          { $project: { _id: 0 } },
        ],
        { maxTimeMS: 10_000 },
      )
      .toArray()
    report.collections.games.sizes = sizes || {}
  }

  console.log(JSON.stringify(report, null, 2))
} finally {
  await client.close()
}
