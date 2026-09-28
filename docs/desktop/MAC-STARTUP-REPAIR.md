# Mac startup repair — 2026-09-28

Candidate: `0.2.0-beta.2`, Apple Silicon, based on desktop beta source `3d1f20a`.

## Report and findings

The installed `0.2.0-beta.1` app remained running in the Dock without a window. Process inspection found a main process plus GPU and network helpers, with no renderer. The startup path awaited asynchronous OS encryption and queue loading before constructing its BrowserWindow. It then waited for `ready-to-show` before displaying the window. Neither wait had a deadline. These code paths can leave a running app without a window; process sampling did not establish the specific underlying macOS storage failure.

The installed Electron 44.4.5 type definitions also establish that `safeStorage.decryptStringAsync` returns an object containing `result`, whereas the previous adapter passed that object to a queue reader expecting a string.

## Changes

- Create a visible window and register desktop IPC before starting asynchronous secure storage initialization.
- Keep capture and delivery paused during initialization. A stalled storage check or queue load reports a visible error after 15 seconds, with no plaintext fallback or queue reset.
- Read the decrypted string from the documented `result` field. Preserve the queue file format, application ID, user data location and account ownership guards.
- Restore, show and focus the window for Dock activation, a second launch and tray actions; recreate a destroyed window.
- Return desktop status immediately while refreshing account identity in the background.
- Preserve the existing production URL, login, import, navigation, tray behavior and offline page. This repair changes only the desktop package; its older website source must not be deployed over current production.

## Checks

All 21 Node desktop tests pass: the previous 11 queue/transport cases plus five secure storage cases and five mocked Electron window cases. New coverage includes a never-resolving storage check, unavailable encryption, late completion after timeout, encrypted restart restoration using Electron's return shape, a stalled network, paused capture, Dock/tray restoration, window recreation and offline loading. JavaScript syntax and `git diff --check` pass.

The Apple Silicon DMG built successfully using Electron 44.4.5 and electron-builder 26.15.3. Its packaged application has version `0.2.0-beta.2` and the unchanged bundle ID `com.dragapultist.desktop.beta`. All six packaged code/HTML files match the repair source, and the archive contains only the intended code, icon and package manifest.

Installer: `Dragapultist-0.2.0-beta.2-mac-arm64.dmg`.

SHA256: `a54f4dfd00643756fb769c2c87bbce4ade010a1e02a04fdc02dbe3c80cc3439f`.

These are code and package checks. Native window visibility and real sign-in/capture acceptance must be confirmed manually by the user; Computer Use is unavailable on this machine. See `BETA.md` for the remaining native acceptance flow.
