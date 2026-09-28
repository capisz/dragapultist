# Mac clipboard setup repair — 2026-09-28

Version: `0.2.0-beta.3` (Apple Silicon, unsigned internal beta).

## Report and cause

The native Desktop settings dialog showed a disabled username field and this error:

> The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of Promise

Electron 44.4.5 returns `Promise<string>` from `clipboard.readText()`. The main process passed that Promise directly to SHA256 during account initialization, capture setup, and polling. The startup failure set the fatal capture status, which correctly disabled the website's setup controls.

Reference: [Electron 44.4.5 clipboard API](https://github.com/electron/electron/blob/v44.4.5/docs/api/clipboard.md).

## Repair

- Await and validate clipboard text before hashing, recognizing, or queuing it.
- Avoid reading the clipboard at startup when capture is paused. Establish the baseline when the user enables capture; skip previously copied text.
- Keep failed clipboard access during enabling retryable, with a readable error.
- Serialize capture configuration and discard in-flight reads when capture is paused, resumed, or the account changes.
- Preserve the queue format, operating-system encryption, per-account ownership, bundle identifier, user data location, and production website destination.

## Evidence

- Before the source fix, the new startup regression test reproduced the exact Promise error above.
- `node --test test/*.test.cjs`: **29 passed, 0 failed**. Eight new cases exercise asynchronous startup, enable/save, saved capture preferences, rejection and retry, overlapping polling, pause/resume, and account changes.
- These tests run the real main-process code with synthetic clipboard/session/storage inputs. They do not inspect the user's clipboard or prove native user interaction.
- `node --check main.js` and `git diff --check` passed.
- Built the Apple Silicon DMG using the existing Electron 44.4.5 / electron-builder 26.15.3 dependencies.
- Packaged files match source. The archive contains only the eight expected application files, including the icon and package manifest.
- Bundle version: `0.2.0-beta.3`; identifier: `com.dragapultist.desktop.beta`.
- `hdiutil verify` passed.
- DMG: `electron/dist/Dragapultist-0.2.0-beta.3-mac-arm64.dmg`.
- DMG SHA256: `02ffaa0e780116355c763f120d724db081f1f5b0e831933502bc34eebc8715a3`.
- Packaged `app.asar` SHA256: `b96fb92001fb5bea830e212c306aeb388d6f0e1b224e0dc57dabb55bc9032ab5`.

## Installation and native acceptance

The user confirmed Quit, and a scoped process check confirmed no Dragapultist process remained. Installed `0.2.0-beta.3` at `/Users/admin/Applications/Dragapultist Beta.app`; verified its bundle version, identifier, and `app.asar` hash after replacement. The previous bundle is retained at `/Users/admin/Applications/.dragapultist-backups/0.2.0-beta.2-20260928/Dragapultist Beta.app`. The entire user data directory was left untouched.

After replacement, the user opens `/Users/admin/Applications/Dragapultist Beta.app`, enters their actual Pokémon TCG Live username under Desktop settings, and selects **Save username & enable capture**. Confirm the field accepts typing, the Promise error is absent, and capture becomes enabled. Then exercise a real completed game's Copy log flow.

Native interaction and real gameplay acceptance remain pending. Computer Use is unavailable on this machine; no native UI, personal clipboard, or authentication cookie was inspected for this repair. The production website did not require a change or deployment.
