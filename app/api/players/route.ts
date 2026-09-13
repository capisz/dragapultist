import { NextResponse } from "next/server"
import { errorEnvelope } from "@/lib/api-contract"

export async function GET() {
  return NextResponse.json(
    errorEnvelope("NOT_FOUND", "This legacy player route is retired. Use the authenticated player search routes."),
    { status: 410 },
  )
}
