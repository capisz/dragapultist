import { NextResponse } from "next/server"
import { errorEnvelope } from "@/lib/api-contract"

export async function POST() {
  return NextResponse.json(
    errorEnvelope("NOT_FOUND", "Prize paths are calculated from the locally loaded owner or guest games."),
    { status: 410 },
  )
}
