# Desktop website connection — 2026-09-28

## Scope

- Connect the existing private `0.2.0-beta.1` desktop installer to the production website through `DesktopCompanion`.
- Return verified account ID and session expiry alongside the existing CSRF token. Signed-out or invalid sessions return `user: null`, and responses are not cached.
- Reuse an existing valid CSRF cookie so background desktop status checks do not invalidate concurrent website saves.
- Reject desktop uploads when the queued owner differs from the verified session account. Keep the existing game payload, import deduplication, and server acknowledgement contract.
- Refresh account history after background imports, on focus/reconnect, and periodically. Defer refresh while a match review is open or a save is running.
- Retain the older desktop log listener for compatibility. The engine placeholder and match delete controls remain in place.

## Checks before deployment

- Website unit tests: 25 passed.
- Website backend/parser tests: 45 passed, including desktop parser orientation, account mismatch rejection, signed-out/expired identity, and stable CSRF tokens during status polling.
- Desktop queue/transport tests: 11 passed in the separate desktop-beta checkout.
- Type checking and production build passed.
- Lint: 0 errors, 17 existing warnings.
- Packaged Mac `main.js`, preload, queue, and transport match the reviewed desktop-beta source.

## Mac installation and remaining acceptance

The Apple Silicon candidate was installed from its DMG into the user's personal Applications directory. Installer version: `0.2.0-beta.1`. OS: macOS 26.6.2, arm64.

Installer SHA-256: `c2f1016bfde55d0e1d3f0b1b244a560b4e19c18247b878ec12ad4d5fb9c0d7b4`.

At the time of this record, Computer Use lacked macOS Accessibility and Screen Recording permissions. Actual app-window inspection, desktop sign-in, and a completed PTCGL Copy log workflow remain pending. The installer is unsigned. This record is not native end-to-end acceptance or authorization for public installer distribution.
