# Dragapultist desktop beta

Current distribution: the original `capisz/dragapultist` repository owns desktop source, installer builds, and public beta releases. Download through Settings on `https://dragapultist.vercel.app`. See `../releases/2026-10-07-desktop-download-consolidation.md` for the migration and unchanged native acceptance limits.

## Behavior

Windows x64 NSIS installer and separate Intel/Apple Silicon DMGs load the existing HTTPS website. The desktop account is the same Firebase account as the web account, but its cookie session is separate from your browser. Capture requires sign-in, a PTCGL username and explicit enablement. Start-at-login is initially off.

Copy the completed PTCGL log after a game. The app checks changed clipboard text once a second. Existing clipboard text at startup/resume is ignored; unrelated text is not written to disk or uploaded. The folder watcher has been removed. This does not hook into the game or inspect its memory/files.

Close hides the app in the tray; Quit stops capture and waits for pending queue writes. Offline logs remain encrypted using the operating system's secure storage. Queued records are bound to the account which captured them, including through offline restarts. A confirmed sign-out disables capture. A different account must configure capture again; it cannot view or upload another account's queue.

Only a server save acknowledgement removes a queued log. Duplicate acknowledgements are success. Unknown identity, incomplete logs and rejected payloads remain in Needs review. View the retained log and retry with the correct username. Incomplete logs remain retained; copy a complete log after the game ends. No automatic queue deletion or migration is performed.

The encrypted queue is under Electron's per-user `userData` directory as `capture-queue.enc`. Keep the beta app identity stable across upgrades. NSIS explicitly preserves app data on uninstall; DMG replacement does not remove it. Losing the OS account/keychain can make encrypted data unrecoverable. Corrupt or unreadable queue files are preserved and capture fails closed.

## Build

From `electron/`: `npm ci`, `npm test`, then `npm run dist:mac` or `npm run dist:win` on the respective OS. Electron and electron-builder are pinned in the lockfile. `dist/` contains installers and SHA256SUMS.txt. No secrets, environment files, node_modules, tests or application database are packaged. The native app contains only the shell, queue, transport and approved assets.

Development: start the web app on a separate port, then `DRAGAPULTIST_URL=http://localhost:3038 npm start` from `electron/`. Packaged builds ignore that override and always use https://dragapultist.vercel.app. Developer tools require `DRAGAPULTIST_DEVTOOLS=1` in an unpackaged run.

Unsigned beta builds may be blocked or display publisher warnings. They are not signed/notarized public releases. Do not disable system-wide OS protections to install them. Updates are manual installer replacement; no update feed is configured.

## Installer CI

`.github/workflows/desktop-beta.yml` runs by manual dispatch in the original repository. Both Windows and macOS runners run desktop tests, verify the native detection dependency, and build installers. Mac builds verify the sealed app and exact app inside each generated DMG. Artifacts expire after 14 days. The `publish` input defaults to false; explicitly enable it to publish a public prerelease after both builds and checksums pass. A previously published version cannot be overwritten. Never put Firebase Admin, Mongo, signing or personal credentials in the repository or artifacts.

## Web compatibility and release gates

Desktop requires the accompanying root-level DesktopCompanion and additive session API (`user: {uid, expiresAt} | null`, alongside `csrfToken`). It uses the existing game API, adding an optional `X-Desktop-Owner` guard that must match the verified session UID. Native requests use the same persistent Electron session, CSRF cookie and exact Origin; no separate bearer-token system is added.

Do not publish beta downloads until:

1. The existing production session/games 500 errors are diagnosed using runtime logs and fixed.
2. Real account sign-in, account isolation, import, reload and revisioned deletion pass against the live backend.
3. The compatible web coordinator is deployed and both signed-out/session identity contracts are verified.
4. Actual Windows and Mac users complete the checklist below. Installer compilation, mocked transport tests, emulator tests and launching a process are not substitutes.

The user authorized public beta installer distribution and consolidation on 2026-10-07. That authorization does not establish native acceptance or authorize signing purchases, provider provisioning, or data migration.

## Native acceptance checklist

Record OS/version/CPU, app version and installer checksum for each run.

- Install, launch, sign in and configure the exact PTCGL username; test a real completed game and Copy log. One correctly oriented record appears on desktop and the website.
- Repeat minimized and closed-to-tray. Pause stops captures; Quit exits. Reopen restores preferences and retains pending logs.
- Disconnect, copy a new completed log, restart offline, reconnect: one saved game. No pending log is removed before acknowledgement.
- Recopy, copy whitespace-equivalent text, restart, recopy again: no duplicate record or overwritten notes.
- Expire the session or sign out before upload. Sign into another account: no old queue is uploaded there. Sign back into the owner to resume.
- Copy arbitrary non-log text and inspect the encrypted queue lifecycle without exposing clipboard contents. No non-log record is retained.
- Test incomplete/unknown-player logs: Needs review, correct username and retry. Errors retain entries.
- Interrupt after server acceptance but before local acknowledgement: retry returns a duplicate acknowledgement and removes only the queued entry.
- Edit notes/tags from desktop and web, refresh each view, verify consistency. Concurrent stale edits must produce a conflict and preserve local edits.
- Enable/disable launch-at-login and notifications. Check actual OS behavior.
- Replace the installer and uninstall/reinstall with a pending queue: no silent loss.

## Current limitations

The website requires connectivity for history/review/editing. Capturing only queues logs offline; it does not offer an offline database editor. Local queue is capped at 1,000 entries; a full/write-failed queue pauses capture with an explicit error and asks the user to recopy the unsaved log after recovery. Logs are not automatically expired or discarded.
