# Game overlay — implementation and acceptance

The Windows/Mac desktop companion now contains a bundled 320-pixel stats overlay. Enable **Desktop → Game overlay → Show stats over Pokémon TCG Live**, or use the tray menu. It is off by default.

- `Ctrl+Shift+O` on Windows / `Cmd+Shift+O` on Mac toggles visibility while the game is focused.
- `Ctrl+Shift+I` / `Cmd+Shift+I` switches between click-through viewing and interaction. Escape or **Return to game** locks it again. In interaction mode, drag the header and select a saved deck.
- **Follow latest game** tracks the archetype from the newest saved result. Manual choices are retained separately for each account. The tray offers equivalent visibility/interaction controls and position reset. Both shortcuts can be edited in Desktop settings; registration conflicts are reported without disabling the tray controls.
- **Idle opacity** controls the whole panel from 0% (invisible) to 100% (opaque), with a 35% default. Save any value in 1% steps in Desktop settings, or choose 0%, 35%, 65% or 100% in the tray submenu. Hovering reveals the panel fully while preserving click-through and game focus. Interaction mode also remains opaque. Each queued/imported/duplicate/review/retry notice reveals it for four seconds, then it returns to the saved idle opacity unless still hovered or interacting. A notice never overrides hiding on unrelated app focus or manual visibility controls. Opacity is retained across restart.

The panel shows the selected archetype's saved-game W–L, win percentage and game count, the last five saved results across decks, and today's W–L across decks. Recent ordering follows save timestamps. Today uses the saved game date, interpreted as a local calendar date; desktop copied logs record the capture date because the logs do not provide a reliable play timestamp. Date-less games are excluded with a notice. Statistics retain the existing API's latest-5,000-game limit and label truncation.

## Data and security

The main process retrieves `/api/statistics` using the existing authenticated website session, copies only bounded deck/results fields, and pushes a summary into an isolated local renderer. It refreshes every minute, after successful imports, edits and deletions, and across local midnight. Account changes, unavailable authentication and sign-out clear results and notices; late responses from the previous account are ignored. There is no new database migration or independent import coordinator.

The overlay renderer is sandboxed, has no Node integration, cannot navigate, open new windows, make network requests, read clipboard text or access the encrypted import queue, and uses its own session partition and narrowly scoped preload. IPC accepts only its own main frame at the exact bundled file URL. Settings and account-specific deck selections use the existing encrypted queue settings; inability to save settings leaves the prior settings intact.

The panel adjusts its height to content, capped at 640 DIP and the display work area. Display-change events re-clamp its position; Windows game bounds are converted from physical pixels to Electron DIP coordinates. Intentional interaction activates the overlay app; Escape/return uses AppKit on Mac or a guarded Windows foreground-window request to return focus to the previously verified, still-running game. Automatic hiding never activates the game or steals focus from another app. No game is launched by the return-focus path.

An explicit tray interaction can first restore the verified running game, so opening the tray menu does not defeat the shortcut fallback. In-flight focus reads are shared; a stalled native helper times out and hides the overlay without repeatedly spawning helpers.

Idle opacity uses Electron's [native window opacity](https://www.electronjs.org/docs/latest/api/browser-window/#winsetopacityopacity). A 100-ms main-process check compares the transient [cursor DIP position](https://www.electronjs.org/docs/latest/api/screen/#screengetcursorscreenpoint) with the visible panel bounds, so hover works even at 0% opacity without accepting mouse input. Cursor coordinates are neither persisted nor exposed through the renderer bridge; no game content is inspected. Cursor lookup failure keeps the panel opaque, and disabling the overlay stops the timer.

Confirmation messages distinguish queued logs, successful server acknowledgements, duplicates, retryable failures and review states. Manual import notifications are emitted only after the persistence layer validates a successful server response; automatic desktop imports continue to use the existing durable queue and acknowledgement path. Overlay notices do not change capture, deduplication or account ownership.

`get-windows` is pinned to 9.3.0. Mac accessibility/browser and screen-recording/title permission checks are disabled. Unrelated titles, URLs and owner metadata are discarded; they are never sent to the overlay or persisted. Windows detection checks `Pokemon TCG Live.exe`, as identified in the [official Pokémon support forum](https://community.pokemon.com/en-us/discussion/12030/im-getting-an-pokemon-tcg-live-exe-has-stopped-working-error-message). Mac detection verifies the installed `Pokemon TCG Live.app`'s `CFBundleExecutable` and `CFBundleIdentifier` against its own Info.plist, rather than guessing a bundle ID or relying on window titles. The placeholder app folder on the development Mac has no executable or Info.plist and cannot provide a gameplay test.

## Packaging

Version: `0.3.0-beta.1`. The existing private Mac arm64/x64 and Windows x64 workflow includes the local renderer, controller, model, isolated preload, bundled Geist font/license, and runtime detection dependency. The executable Mac helper and Windows native binding are unpacked from ASAR. Use the existing npm 12.1.0 / Node 24.15+ build tooling and peer-resolution configuration.

Scoped overrides pin the focus package's transitive `tar` to 7.5.22 and `http-cache-semantics` to 4.3.0 to address the runtime audit findings in its download/build helpers. Packaging validation must retain these overrides and exercise the helper after installation.

The CI dependency preflight verifies the executable Mac helper or loads the Windows native binding without querying any window. The after-pack hook refuses candidates missing the renderer/preloads/font or an unpacked platform helper/binding. A Mac-only local build can use `--config.npmRebuild=false` with the already-bundled executable helper; Windows CI still runs normal dependency installation/native preparation.

`allowScripts` permits the install step for exactly `get-windows@9.3.0`; npm 12 otherwise skips that dependency's native installation. This is a package-specific, version-pinned approval, not a global enablement of dependency scripts. The Windows native preflight must still pass before distributing its installer.

## Required native acceptance before release

On actual installed Mac and Windows candidates:

1. Enable the overlay, minimize/close the main window to the tray, focus PTCGL and verify visibility without loss of game input. Switch to another app and verify the overlay hides within one polling interval.
2. Verify windowed and borderless/fullscreen behavior. Test Mac fullscreen Spaces separately. Exclusive fullscreen remains unsupported/unverified until demonstrated on the tested game/OS combination.
3. Toggle interaction, select another deck, drag the header, press Escape and verify game keyboard/mouse input resumes. Test shortcut conflicts and the tray fallback.
   Set idle opacity to 0%, 35% and 100%; hover in click-through mode and verify full opacity without lost game input. Move away and verify restoration. Copy a real log and verify four seconds of opaque notice feedback. Repeat while hovered, hidden and focused on another app. Check saved opacity after restart on both Windows and Mac.
4. Move the game between displays, change resolution/DPI and unplug a display; confirm the overlay stays reachable. Restart and verify enablement, shortcuts, position and account-specific override restoration.
5. Copy a real completed PTCGL log. Verify queued → imported feedback and exactly one saved result/stat update. Repeat the copy, then test offline/reconnect, invalid/incomplete logs and imports needing review.
6. Sign out/switch accounts while requests are in flight. Confirm previous-account statistics disappear. Verify edits/deletions and midnight rollover.

Record OS/CPU, candidate checksum and observed results in `VALIDATION.md`. The compatible website coordinator/statistics changes must be deployed before testing the packaged production URL. Packaging and synthetic-window checks do not establish real PTCGL or installation acceptance. Publishing/deploying remains a separate release step.
