import { deckRoute } from '@/lib/deck-route'
import { writeDeckLibrary } from '@/lib/deck-store'
import { updateDeckSchema, changeLibraryDeck } from '@/lib/deck-contract'
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deckRoute(request, true, async (db, owner) => {
    const { id } = await params
    const input = updateDeckSchema.parse(await request.json().catch(() => null))
    return writeDeckLibrary(db, owner, (library, at) => changeLibraryDeck(library, id, input, at))
  })
}
