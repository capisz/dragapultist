import { deckRoute } from '@/lib/deck-route'
import { readDeckLibrary, writeDeckLibrary } from '@/lib/deck-store'
import { createDeckSchema, createLibraryDeck } from '@/lib/deck-contract'
export async function GET(request: Request) { return deckRoute(request, false, (db, owner) => readDeckLibrary(db, owner)) }
export async function POST(request: Request) {
  return deckRoute(request, true, async (db, owner) => {
    const input = createDeckSchema.parse(await request.json().catch(() => null))
    return writeDeckLibrary(db, owner, (library, at) => createLibraryDeck(library, input, at))
  })
}
