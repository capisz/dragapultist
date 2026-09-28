# Desktop setup and settings — 2026-09-28

## Changes

- Remove the expanded desktop capture panel from the main game screen.
- Offer a compact setup dialog after the first desktop sign-in. Respect dismissal per account on this device, and skip onboarding when capture preferences already exist.
- Add **Desktop settings** to the signed-in account menu in the native app. Keep ordinary browser navigation unchanged.
- Replace the inactive empty-username action with a clear validation message and field focus. Show pending, success, failure and secure-storage states; offer sign-in when the desktop session is missing.
- Keep notification and launch preferences, pause, queued-log review and retry in the dialog. Background queue delivery continues when settings close.
- Preserve the native bridge contract, encrypted queue, saved-game schema, import flow, review and deletion behavior.

## Verification

- All 25 unit tests and 45 backend/parser tests pass.
- Ten isolated browser flow checks pass, including first setup, keyboard save, empty input, pending/success/failure feedback, preference saves, pause, dismissal persistence, account-menu reopening, focus restoration, continued background polling, signed-out recovery, storage startup/failure and ordinary-browser behavior.
- Reviewed 1280 px desktop and 390 px mobile screenshots in light and dark themes. The dialog fits, and closing it removes the capture UI from the main layout. Primary action text contrast is at least 4.7:1 across its theme/hover states.
- TypeScript and the optimized Next.js build pass. Lint has no errors and retains the 17 existing warnings. Locally installed pnpm plugin paths were supplied to the lint/build process to resolve existing plugin lookup limitations; dependencies and lockfiles were not changed.
- Browser checks used a synthetic preview account and mocked desktop responses in an isolated browser. They did not access the native clipboard, session, encrypted queue contents or real saved matches.

## Native acceptance

The user confirmed that the installed Mac app `0.2.0-beta.2` opens its window. Enabling capture and importing a real copied PTCGL log still require user confirmation in that app. This website update is loaded by the existing native app when refreshed.
