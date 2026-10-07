import { deckRoute } from '@/lib/deck-route'
import { readDeckLibrary, writeDeckLibrary } from '@/lib/deck-store'
import { currentDeckSchema, changeCurrentDeck } from '@/lib/deck-contract'
export async function GET(request: Request) { return deckRoute(request, false, (db, owner) => readDeckLibrary(db, owner)) }
export async function PATCH(request: Request) {
  return deckRoute(request, true, async (db, owner) => {
    const input = currentDeckSchema.parse(await request.json().catch(() => null))
    return writeDeckLibrary(db, owner, (library, at) => changeCurrentDeck(library, input.deckId, input.expectedRevision, at))
  })
}
