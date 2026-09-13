// lib/mongodb.ts
import { MongoClient } from "mongodb"

const options = {}
let productionPromise: Promise<MongoClient> | undefined

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function connection(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) return Promise.reject(new Error("Please set MONGODB_URI in your environment"))

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri, options).connect()
    }
    return global._mongoClientPromise
  }

  productionPromise ??= new MongoClient(uri, options).connect()
  return productionPromise
}

// Route modules are evaluated during a Next.js build. Defer network activity until
// a request actually awaits the client so builds never touch MongoDB.
const lazyClientPromise = {
  then<TResult1 = MongoClient, TResult2 = never>(
    onfulfilled?: ((value: MongoClient) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return connection().then(onfulfilled, onrejected)
  },
} as Promise<MongoClient>

export default lazyClientPromise
