import { ZodError } from 'zod'
import { NextResponse } from 'next/server'
import { getRequestIdentity } from '@/lib/request-user'
import { assertMutationRequest } from '@/lib/session'
import clientPromise from '@/lib/mongodb'
import { APP_DATABASE_NAME } from '@/lib/app-database'
import { DeckError } from '@/lib/deck-contract'
import { errorEnvelope } from '@/lib/api-contract'

export async function deckRoute(request: Request, mutation: boolean, action: (db: import('mongodb').Db, owner: string) => Promise<unknown>) {
  if (mutation) {
    try { await assertMutationRequest(request) }
    catch { return NextResponse.json(errorEnvelope('FORBIDDEN', 'Invalid secure request.'), { status: 403 }) }
  }
  try {
    const identity = await getRequestIdentity()
    if (!identity.userId) return NextResponse.json(errorEnvelope(identity.status === 'invalid' ? 'SESSION_EXPIRED' : 'UNAUTHORIZED', 'Sign in to access your saved decklists.'), { status: 401 })
    const expectedOwner = request.headers.get('x-expected-owner')
    if (expectedOwner && expectedOwner !== identity.userId) return NextResponse.json(errorEnvelope('SESSION_EXPIRED', 'Your account changed. Reopen the deck library.'), { status: 401 })
    const db = (await clientPromise).db(APP_DATABASE_NAME)
    return NextResponse.json(await action(db, identity.userId), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof DeckError) return NextResponse.json(errorEnvelope(error.code, error.message), { status: error.code === 'NOT_FOUND' ? 404 : error.code === 'REVISION_CONFLICT' ? 409 : 400 })
    if (error instanceof ZodError) return NextResponse.json(errorEnvelope('VALIDATION_ERROR', 'Invalid deck list request.'), { status: 400 })
    return NextResponse.json(errorEnvelope('UNAVAILABLE', 'Your deck library is temporarily unavailable.', true), { status: 503 })
  }
}
