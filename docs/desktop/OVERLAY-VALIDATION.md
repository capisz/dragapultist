# Overlay implementation verification

Verified locally on 2026-10-07 in `/Users/admin/Desktop/projects/dragapultist-desktop-beta`, branch `codex/desktop-beta`, desktop version `0.3.0-beta.1`. This records implementation checks; release acceptance is still pending.

## Automated checks

| Check | Result |
| --- | --- |
| Electron controller, model, native adapter, queue and transport tests | 37 passed, rerun after transparency changes |
| Web backend and persistence contract tests | 45 passed |
| Existing web unit tests | 25 passed |
| TypeScript, changed-file ESLint and diff whitespace checks | Passed |
| Production Next build, including lint/type checks and all 16 pages | Passed for the initial overlay; transparency settings then passed type/targeted lint checks. Pre-existing image/hook warnings remain in untouched components |
| Desktop runtime dependency audit (`--omit=dev`) | Zero reported vulnerabilities |
| Mac arm64 app-directory packaging and after-pack verification | Passed |

The 107 tests across this implementation (37 desktop checks rerun after transparency, plus 70 web checks from the initial overlay) cover saved-date preservation and local-day boundaries, empty/truncated histories, recent ordering, manual/follow-latest selection, account transitions and late responses, acknowledged/duplicate/failed persistence events, notice deduplication, isolated renderer IPC, click-through/interaction transitions, shortcut failure reporting, position clamping, settings persistence failure, shutdown during detection, focus timeout recovery, and tray interaction with an in-flight focus read. Transparency coverage verifies restart persistence, invalid opacity rejection, fully invisible hover recovery, negative display coordinates, hover/interaction precedence, four-second reveal and expiry for all notice kinds, duplicate/wrong-account suppression, sign-out clearing, no resurfacing over unrelated apps or manual hiding, and stopping cursor checks on disable.

The web checkout originally shared another checkout's dependency directory, which made Next resolve built-in files against the wrong path. Verification used an isolated local copy of the same installed versions and exposed the already-installed ESLint peer dependencies. Web dependency manifests and the canonical checkout were unchanged. The desktop lockfile includes the pinned focus dependency and scoped runtime overrides described in `OVERLAY.md`.

## Packaged native smoke check

Unsigned Mac arm64 candidate, app directory only (not an installer):

`/private/tmp/dragapultist-overlay-candidate/mac-arm64/Dragapultist Beta.app`

Bundled `Contents/Resources/app.asar` SHA-256:

`8e2f7343c6f1ccac288e4674101ec8928722bdf5584ac4a38902188339d03037`

The final candidate passed the packaging hook, including exact `get-windows` version, renderer/preload/font assets and executable unpacked Mac helper. An isolated Electron harness loaded the packaged overlay controller and its real sandboxed renderer/preload. It verified native detector loading, non-game rejection, showing without stealing focus from a synthetic game window, deck-selection IPC, Escape and return focus, unrelated-focus hiding, and recovery through the tray interaction path. The panel measured 320 DIP wide with content height equal to scroll height (333 DIP) and no registered-shortcut errors. After a final tray-only refinement to show custom opacity values correctly, the candidate was refreshed and its main process/controller/model/preload/renderer files were checked byte-for-byte against the verified source; the tested opacity controller was unchanged.

The refreshed candidate also verified real native opacity values of 0%, 35% and 100%, native cursor API loading, reveal from simulated hover at 0% opacity with the synthetic game retaining focus, four-second import reveal/expiry, and full opacity during interaction. Cursor positions were injected into the controller for deterministic hover checks; physical hover in a real PTCGL session remains a native acceptance requirement. The harness explicitly establishes its synthetic game's key-window focus before checking opacity transitions.

Game identity, bounds, statistics and focus transitions in this harness were synthetic. This does not prove real PTCGL focus detection, installation, Windows behavior or fullscreen compatibility. The candidate used the installed Electron distribution and `npmRebuild=false` on Mac, with the package's existing executable Mac helper; normal Windows native preparation remains in CI.

## Visual verification

Populated, interactive, empty, unavailable-account and shortcut-conflict states were rendered and inspected. All five fit their measured content height without horizontal overflow. The native populated/imported/interactive captures were also inspected. A focused visual review found a shortcut-conflict message omission; the panel now directs users to tray interaction when that shortcut cannot register, and that specific fix was reviewed as resolved. No design-system rules were changed.

Temporary captures and harness results are under `/private/tmp/dragapultist-overlay-review` and `/private/tmp/dragapultist-overlay-native-review`.

## Release prerequisites still pending

- Deploy the compatible authenticated website statistics and desktop coordinator contracts to the packaged production URL.
- Build and install actual Windows x64 and Mac arm64/x64 candidates and record checksums and OS/CPU in the existing `VALIDATION.md`.
- Exercise real PTCGL Copy-log imports, duplicates, offline/reconnect, review states, expired authentication, account switching, minimized/tray operation and restart persistence.
- Verify real focus transitions, click-through/input restoration, shortcut conflicts, display/DPI changes, windowed play and Mac fullscreen Spaces. Exclusive fullscreen support remains unverified.
- Verify 0%/35%/100% idle opacity, physical hover while click-through, automatic import reveal, hover/notice overlap, hidden/unrelated-focus behavior and restart restoration on both Windows and Mac.

Use the detailed acceptance checklist in `OVERLAY.md` alongside the existing desktop acceptance requirements. No candidate was installed, published or released, and no website deployment was performed in this task.
