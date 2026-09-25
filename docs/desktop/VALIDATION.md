# Desktop beta candidate validation — 2026-09-24

Status: implementation candidate; **not released and not ready for user acceptance** until the production backend and web compatibility gates pass.

## Verified locally

- Durable queue and transport: 11 passing tests covering encrypted persistence, restart, concurrent duplicates, owner isolation, acknowledgement, failed writes, retry backoff, review, corrupt files, network/server failures and expired authentication.
- Real parser: 5 passing tests covering capture metadata, both player perspectives, possessive headings, unknown identity and incomplete logs.
- Backend suite: 39 tests passed before the two additional parser cases above; includes session identity/CSRF response and desktop owner-mismatch rejection.
- Existing unit suite: 25 tests passed.
- TypeScript checking and optimized Next.js production build passed. Existing lint warnings remain.
- All three installer candidates built locally on this Mac. This is compilation evidence, not Windows runner or native installation evidence.
- Packaged application whitelist inspected: main, preload, queue, transport, offline page, icon and package metadata. No development environment files, credentials, web database or dependencies are included in app.asar.

## Not verified / blocked

- Production session and games endpoints previously returned generic 500 responses. Root cause remains unknown without Vercel runtime logs and environment access. No speculative production configuration changes were made.
- Vercel CLI and browser require normal sign-in. Live sign-in, account isolation, create/reload/delete and revision-conflict acceptance have not run.
- GitHub CLI requires normal sign-in before creating/dispatching a private build repository. CI workflow is implemented, but Windows/macOS CI has not run.
- A native Electron development process launched and requested the local site, but computer-use permission prevented UI inspection. No real PTCGL Copy log, tray, native OS encryption, login-item, uninstall/reinstall or cross-device acceptance has passed.
- Packaged candidates load production, which does not yet have this branch's web coordinator/session identity contract. They must not be represented as functional beta releases yet.

## Next operator steps

1. Sign into Vercel on this computer; inspect runtime logs for the protected endpoints, fix the demonstrated cause, then run the live account/API acceptance in BETA.md.
2. Deploy the compatible web changes after the backend checks pass.
3. Authenticate GitHub CLI normally, create a private build repository and manually dispatch the included workflow. Never reuse an extracted stored credential or publish artifacts in the public source repository.
4. Enable native computer-use permission if assisted Mac testing is desired, then perform the full checklist on real Mac and Windows devices.
5. Record OS/CPU, candidate checksum and observed results before any private distribution. Keep pending encrypted queues across installer replacement.

The source branch is `codex/desktop-beta`. Main and production were not changed by this implementation.

## Production repair and private CI update — 2026-09-24

- Vercel runtime logs identified `ERR_REQUIRE_ESM`: `jwks-rsa@4.1.0` requires `jose@6.2.12`, while the deployed runtime disabled synchronous ESM loading.
- Reproduced the crash with `node --no-experimental-require-module`; importing Firebase Admin succeeds with `--experimental-require-module`.
- Added non-secret Production setting `NODE_OPTIONS=--experimental-require-module`, following https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration . Existing source `c5f22d8` was redeployed as `dpl_8RFi48KdpSh9aA6LfWDFay9Bob28`.
- Live signed-out checks now return session HTTP 200 and games HTTP 401. This fixes the module-loading crash; authenticated account/backend acceptance is still pending.
- GitHub sign-in verified. Private repository: https://github.com/capisz/dragapultist-desktop-beta-builds . Only tracked Electron files, the workflow and desktop documentation were exported; no original Git history, environment files, database data or credentials were uploaded.
- Initial CI run 36083322009 failed at clean dependency installation. Local npm had `legacy-peer-deps=true`, so the lockfile omitted optional peer dependencies required by CI. Regenerated with peer resolution enabled and added a project `.npmrc` setting to keep local and CI resolution consistent.
