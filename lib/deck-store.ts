import type { Db } from 'mongodb'
import { deckLibrarySchema, emptyDeckLibrary, DeckError, type DeckLibrary } from '@/lib/deck-contract'

type LibraryDocument = DeckLibrary & { _id: string }
export async function readDeckLibrary(db: Db, owner: string): Promise<DeckLibrary> {
  const doc = await db.collection<LibraryDocument>('deckLibraries').findOne({ _id: owner })
  if (!doc) return emptyDeckLibrary()
  const { _id, ...library } = doc
  return deckLibrarySchema.parse(library)
}
// One document makes archiving, clearing current selection and its timeline atomic.
export async function writeDeckLibrary(db: Db, owner: string, transform: (library: DeckLibrary, at: string) => DeckLibrary) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await readDeckLibrary(db, owner)
    const lastAt = before.history.at(-1)?.at
    const at = new Date(Math.max(Date.now(), lastAt ? Date.parse(lastAt) + 1 : 0)).toISOString()
    const after = transform(before, at)
    if (after === before) return before
    const collection = db.collection<LibraryDocument>('deckLibraries')
    if (before.revision === 0) {
      try { await collection.insertOne({ _id: owner, ...after }); return after }
      catch (error) { if ((error as { code?: number }).code !== 11000) throw error }
    } else {
      const result = await collection.replaceOne({ _id: owner, revision: before.revision }, after)
      if (result.matchedCount) return after
    }
  }
  throw new DeckError('Your library changed in another session. Reload and try again.', 'REVISION_CONFLICT')
}
