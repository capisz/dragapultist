# Firebase backend decision record

## Decision

Use Firebase Authentication on the Spark plan and retain MongoDB as the application database. Guests remain local-only. Firestore, Cloud Storage, SQL Connect, Functions, and Firebase hosting are outside the initial backend scope.

This choice fixes identity first while preserving the existing MongoDB aggregation workload. A Firestore migration remains conditional on measured query behavior, storage size, migration effort, and Spark quota fit.

## Verified project and cost boundary

- Firebase project: `dragapultist` (project number `869914104192`), active and selected.
- Web app: `Dragapultist Web` (`1:869914104192:web:17fe1fe03fd0bd2651e`).
- Billing: disabled when checked through the Firebase plugin.
- Email/password sign-in: enabled in the Console according to the owner; the available plugin does not expose a provider-status read, so this is not independently verified.
- Email verification is required before a server session is issued. Sign-up sends Firebase's real verification email and signs the browser out; a verified login creates the MongoDB profile from the Firebase UID and display-name claim. The application never marks an address verified itself.
- Firebase client configuration is committed only as public configuration. Admin credentials, MongoDB credentials, and production origins must be supplied outside Git.

## Trust boundaries

1. Browser and Electron inputs, Firebase ID tokens, cookies, game objects, logs, usernames, and player display names are untrusted.
2. The Next.js server exchanges a recent verified ID token for a five-day HttpOnly session cookie.
3. Session creation uses a double-submit CSRF token. Cookie-authenticated mutations enforce an allowed Origin.
4. Protected handlers derive ownership only from the verified Firebase UID.
5. MongoDB credentials and Firebase Admin credentials are server-only. Client Firebase configuration is public configuration, not an Admin credential.
6. PTCGL display names never establish account ownership.

## Data and API contract

- Private Mongo documents use the verified Firebase UID for new ownership records.
- Legacy Mongo ObjectIds require an explicit `firebaseUid -> legacyUserId` migration mapping.
- Game inputs are allowlisted and bounded. Raw logs are limited to 256 KiB.
- The server reparses logs before persistence and records schema/parser versions and a content hash.
- Owner-scoped content hashes make import retries idempotent.
- Ordinary history queries are bounded to 100 summary records per request, omit raw logs/notes/deck lists, and use an owner-scoped date-and-ID cursor. Full detail loads through the owner-scoped game route only when opened.
- The statistics screen uses a dedicated server-side contract. It computes the existing analytics from a raw-log-free projection of at most 5,000 owner-scoped games, returns aggregate results plus the first 100 history summaries, and reports if the source cap was reached. This preserves the previous 5,000-game analytics ceiling without sending thousands of full documents to the browser.
- Public statistics are disabled. A future public feature requires a separate opt-in, sanitized projection.

### Current MongoDB shape

| Collection | Owner key for new writes | Purpose | Important bounds |
| --- | --- | --- | --- |
| `users` | `firebaseUid` | Account profile and existing base64 images | 1.5M characters per image, 2.5M combined; uploads are a migration blocker on Spark |
| `games` | `userId` containing the Firebase UID | Parsed match, bounded raw log, notes and deck metadata | 256 KiB raw log, 200 notes, 50 KiB deck list, 100 normal list results |
| `imports` | `userId` containing the Firebase UID | Import source/status compatibility | 256 KiB raw text, 50 list results |
| `prizeMaps` | verified Firebase UID field used by the existing route | Private tool state | Owner-scoped only |

Legacy ObjectId ownership is read-compatible but must be mapped explicitly before an existing account can sign in. New Firebase users never receive authority over a legacy record merely because an email or display name matches.

### Data flow

```text
guest browser ── parse/save ──> local storage only

account browser ── Firebase ID token ──> session endpoint
                                           │ verifies recent token + CSRF/origin
                                           v
                                    HttpOnly session cookie
                                           │
                                           v
browser ── validated request ──> Next.js API ── verified UID ──> MongoDB
                                      │
                                      └── authoritative parser + bounds + revision
```

### Initial workload estimate

These are sizing assumptions to validate against the read-only inventory, not observed production usage.

| User action | Reads | Writes |
| --- | ---: | ---: |
| Open ordinary history | up to 50 game documents | 0 |
| Open one review | 1 game document | 0 |
| Import a game | duplicate lookup + write | 1 game write |
| Edit notes/deck/favorite | existing document match/update | 1 game write |
| Delete a game | owner-scoped match | 1 delete |
| Open current statistics | up to 5,001 projected summary documents on the server; aggregate model + 100 summaries sent to browser | 0 |

The statistics read and raw-log-heavy list payload are the main scaling risks. Before any Firestore decision, benchmark synthetic 100/1,000/5,000-game datasets and compare result equivalence, payload bytes, latency, and projected reads. A Firestore migration is rejected if it requires unbounded document reads or loses existing analytics/search behavior within Spark quotas.

## Spark constraints

- Do not attach billing.
- Do not enable Cloud Storage; use bundled avatars until another free storage decision is approved.
- Do not create SQL Connect or paid Cloud SQL resources.
- Do not provision Firestore merely because Firebase Auth is enabled.
- Use the Auth emulator for automated tests and local development.

## Required production gates

- Read-only Mongo inventory and recoverable backup.
- Existing-account decision: validated bcrypt import or password reset.
- Confirm the already-applied unique indexes for Firebase UID, owner/game ID, owner/content hash, and owner/import hash remain healthy after release.
- Two-user isolation; forged, expired, and revoked session rejection; guest-write rejection.
- CRUD reload, retry/deduplication, conflict, oversized input, deletion cleanup, and analytics equivalence tests.
- Explicit application origin and server credential configuration.

## Local verification record

On September 12, 2026, the Firebase Auth emulator and `dragapultist_v2` were used for isolated smoke and browser-form tests. Randomly generated test identities completed signup, real emulator email verification, secure session exchange, an initially empty account read, game save and detail reload, verified UID ownership, game deletion, logout, and signed-out isolation. The actual signup, login, and logout controls were also exercised in a browser. Cleanup was verified afterward: both `users` and `games` contained zero documents. No live Firebase Auth user was created.

Repeat this check with the Auth emulator and local Next.js server running by executing `corepack pnpm test:smoke:local`. The script creates random test data and removes only records owned by its generated Firebase UID.

## Environment checklist

- Local browser: copy the demo-only `NEXT_PUBLIC_FIREBASE_*` placeholders from `.env.example` and keep the Auth emulator flag enabled.
- Production browser: use the real public web-app configuration for Firebase project `dragapultist` and disable the Auth emulator flag.
- Server: `FIREBASE_PROJECT_ID`, one least-privilege Firebase Admin credential supplied by the host, `MONGODB_URI`, and `MONGODB_DB`.
- Origin: set `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` to the exact production HTTPS origin.
- Firebase Console: confirm Email/Password sign-in and authorized domains; do not enable Storage, Firestore, Functions, App Hosting, Data Connect, or billing for this release.
- Local tests: use the Auth emulator and synthetic MongoDB data. Never point destructive or isolation tests at production.
- Release: complete the MongoDB inventory/backup, legacy-account migration decision, two-user isolation tests, and analytics-equivalence check first.
