# Desktop beta validation — 2026-09-24

Status: internal unsigned candidate. Production startup failure is repaired and private installer CI passes. Authenticated account acceptance, deployment of the desktop web coordinator, and actual Mac/Windows gameplay acceptance remain required before release.

## Production repair verified

Vercel logs showed `ERR_REQUIRE_ESM`: `jwks-rsa@4.1.0` requires `jose@6.2.12`, while the deployed runtime disabled synchronous ESM loading. Reproduced locally with `node --no-experimental-require-module`; Firebase Admin imports successfully with `--experimental-require-module`.

Added non-secret Production setting `NODE_OPTIONS=--experimental-require-module`, following https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration . Redeployed existing production source `c5f22d8` as `dpl_8RFi48KdpSh9aA6LfWDFay9Bob28`.

Live signed-out checks now return session HTTP 200 and games HTTP 401. This verifies the startup repair, not authenticated Firebase/MongoDB operations. No credentials were revealed, copied or changed. The desktop source branch has not been deployed.

## Code and installer checks

- Durable queue/transport: 11 passing tests covering encryption, restart, concurrent duplicates, owner isolation, acknowledgements, failed writes, backoff, review, corruption, network/server failure and expired authentication.
- Real parser: 5 passing tests covering capture metadata, player orientation, possessive headings, unknown identity and incomplete logs.
- Backend suite: 39 tests passed before two additional passing parser cases; includes session identity/CSRF and desktop owner mismatch.
- Existing unit suite: 25 tests passed. TypeScript and optimized Next.js production build passed, with existing lint warnings.
- Local Mac generated all three candidates. Inspected packaged source whitelist and verified SHA256 checksums. This alone was not native acceptance evidence.
- Private GitHub Actions run https://github.com/capisz/dragapultist-desktop-beta-builds/actions/runs/36083851541 passed both macOS and Windows jobs, including all desktop tests. Produced Windows x64 EXE plus Apple Silicon and Intel DMGs; private artifacts expire after 14 days.
- CI used snapshot `81aff36` from desktop source through `2cd3b28`. Only tracked Electron files, workflow and desktop documentation were exported. No original repository history, environment files, database data or credentials were uploaded.
- Two earlier CI runs exposed omitted optional peers: local npm had `legacy-peer-deps=true`, and npm 11 omitted additional signing peers validated by npm 12. Final lockfile is generated with npm 12.1.0 and peer resolution enabled; project `.npmrc` and CI version pin preserve consistency. Use Node 24.15 or later with npm 12 for local build tooling.

## Remaining acceptance gates

1. User signs into Dragapultist on the live website. Verify account isolation, import/reload/deletion and revision conflicts against the live backend.
2. Deploy compatible web coordinator and additive session identity response after backend acceptance passes.
3. Complete BETA.md checklist on actual Mac and Windows devices: install, real PTCGL Copy log, tray/pause/quit, offline/restart/reconnect, expired login, account changes, duplicate copies, crash before acknowledgement, editing/conflicts, and installer replacement/uninstall retention.
4. Record OS/CPU, app version, installer checksum and observed results before private release.

A native Electron development process previously launched, but computer-use permission prevented UI inspection. No real gameplay or native installation workflow has been verified. Packaged candidates still load production, which lacks this branch's coordinator/session identity contract; do not represent them as a functional released beta.
