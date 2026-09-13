# Backend contracts and routes

## Architecture decision

Firebase Authentication is the single account identity authority. Next.js exchanges a recently issued, email-verified Firebase ID token for a five-day HttpOnly session cookie. Every protected request derives the owner from the verified and revocation-checked Firebase UID. MongoDB Atlas database `dragapultist_v2` remains the application database. Guest games remain in browser local storage. No Firestore, Storage, Functions, Data Connect, Firebase Hosting, billing, or second backend is part of this release.

## Shared game contract

- `GameSummary` is the bounded collection/list shape. It excludes raw logs, private note contents, deck-list contents, owner IDs, content hashes, and idempotency keys. It includes `noteCount`, `hasDeck`, version fields, and `revision`.
- `GameDetail` adds the bounded raw log, notes, deck list/name, and optional content hash for one owner-scoped game.
- `GameDraft` is accepted only for create. Raw logs are limited to 256 KiB; notes, tags, names, arrays, and deck lists are bounded and allowlisted.
- `GameMutation` accepts only favorite, notes, tags, deck fields, and player/archetype perspective. The server reparses perspective changes instead of trusting client-derived match statistics.
- Creates accept `{ game, idempotencyKey }`; updates accept `{ changes, expectedRevision }`; deletes accept `{ expectedRevision? }`.
- Successful creates/updates return `{ game, revision, saveState: "saved", duplicate? }`. Lists return `{ games, nextCursor }`.

Guest persistence implements the same interface. Pending or failed creates do not enter the visible collection. Successful duplicate responses merge by both attempted and canonical IDs. Guest perspective changes reparse the log and preserve notes, tags, deck data, identity, and revision metadata.

## Error contract

Protected game/player/statistics handlers use a stable envelope:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Human-readable message",
    "retryable": false
  }
}
```

Supported codes include `UNAUTHORIZED`, `SESSION_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `REVISION_CONFLICT`, `RATE_LIMITED`, `UNAVAILABLE`, and `INTERNAL_ERROR`.

## Routes

| Route | Contract and privacy behavior |
| --- | --- |
| `GET /api/auth/session` | Issues the double-submit CSRF token. |
| `POST /api/auth/session` | Checks exact origin and CSRF, verifies a recent non-revoked Firebase ID token and verified email, creates the Mongo profile for a new UID, then issues the secure session cookie. Email collisions with legacy users stop with 409; no automatic merge occurs. |
| `DELETE /api/auth/session` | Checks origin/CSRF, verifies the current session, revokes Firebase refresh tokens, and clears session/legacy cookies. |
| `GET /api/games` | Owner-only, cursor-paginated summaries; 50 default and 100 maximum. Private search runs server-side but still returns summaries only. |
| `POST /api/games` | Owner-only, CSRF-protected, authoritatively parsed create with owner-scoped hash/idempotency deduplication. |
| `GET /api/games/:id` | Owner-only full detail. |
| `PATCH /api/games/:id` | Owner-only allowlisted update with revision conflict detection and canonical full-detail response. |
| `PUT /api/games/:id` | Temporary full-game compatibility update; owner-only, bounded, reparsed, revision-aware. New clients use PATCH. |
| `DELETE /api/games/:id` | Owner-only, idempotent for missing/cross-owner IDs, revision-aware, and cleans owner-scoped dependent import/prize-map records after a successful delete. |
| `GET/POST /api/imports` and `GET /api/imports/:id` | Owner-only bounded import compatibility; writes require origin/CSRF and deduplicate by owner/content hash. |
| `PUT /api/account/profile` | Owner-only allowlisted base64 image update with per-image and combined-size bounds; writes require origin/CSRF. |
| `GET /api/statistics` | Owner-only server-side statistics over a raw-log-free projection capped at 5,000 games; returns the existing aggregate model plus 100 allowlisted history summaries and a cursor. |
| `GET /api/player-search` | Owner-only search across both participants recorded in the owner's own games; rate-limited and strictly sanitized. |
| `GET /api/player-deck-breakdown` | Owner-only recorded-player/archetype breakdown; rate-limited and strictly sanitized. |
| `GET/POST /api/cards` | Public bundled card-index search/detail hydration with bounded queries/IDs; no account data. |
| `/api/players` and `/api/prize-maps` | Retired compatibility endpoints. Prize Mapper operates from the already owner-scoped/guest game collection. |

All account-data responses are private. There is no public aggregate or publication contract. Any future public player feature requires explicit opt-in and a separate sanitized projection.

## Build and network boundary

Firebase Admin and MongoDB connections initialize lazily. Importing route modules or building the application does not contact either service. Production requires host-supplied Firebase Admin credentials, MongoDB credentials, the real Firebase public web-app configuration, and exact `APP_ORIGIN`/`NEXT_PUBLIC_APP_URL` values.

## September 12, 2026 local integration verification

- `pnpm test`: 56 passed, 0 failed (25 Node behavior tests plus 31 backend/security tests across 10 Vitest files).
- `pnpm run typecheck`: exit 0.
- `pnpm run lint`: exit 0 with 0 errors and 17 non-blocking image/hook warnings.
- Safe emulator-configured production build: exit 0, 16 routes, strict type checking enabled, and no MongoDB connection attempt during build.
- Coordinated UI production preview: 59 browser groups passed, including 125-game pagination/private-note search, guest perspective edits, failed/duplicate import recovery, Back-save acknowledgement, theme reload, and authentication focus behavior.
- `pnpm audit --prod`: one remaining moderate transitive `uuid` advisory through `firebase-admin`; no retired NextAuth dependency remains.

These integration checks did not use production authentication or production data. The earlier isolated Firebase Auth emulator/Mongo smoke remains the evidence for verified signup/session/CRUD/logout behavior; it was not rerun during this no-production-change integration pass.
