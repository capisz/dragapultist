# Overlay production integration and private testing

The user authorized production deployment and private installer distribution on 2026-10-07 to perform their own Windows/Mac acceptance testing. This authorizes a test prerelease; actual PTCGL/fullscreen/native installation acceptance is still outstanding.

The release checkout starts from production commit `14ac277`, then integrates the desktop overlay. It preserves the current ThemeProvider/layout, account-menu desktop settings, `useGameHistory` refresh behavior, stable CSRF cookie polling fix, and the existing session-route tests. Overlay preferences were added inside the existing settings dialog rather than replacing its provider or capture setup. Unrelated unfinished work in the canonical checkout was excluded.

Validation before production push: 82 web backend/contract/component tests, 28 existing unit tests, TypeScript, targeted lint, and the optimized production build (all 16 pages). The desktop suite has 37 tests on Mac, with the Mac-only installed-bundle case skipped on Windows. Existing unrelated image/hook lint warnings remain.

Private installer source is in `capisz/dragapultist-desktop-beta-builds`. It retains Windows x64 and Mac arm64/x64 targets, production URL `https://dragapultist.vercel.app`, package/native dependency validation, unsigned build status, and the default-off overlay. The npm 12 native-install approval is pinned to `get-windows@9.3.0`; package verification normalizes Windows ASAR paths without dropping validation requirements.

Download the `v0.3.0-beta.1` private test prerelease using the repository owner's GitHub account. Quit the old desktop app before replacing it. Launch the updated app, sign in there, configure capture, then enable Game overlay in account settings or the tray. Opacity is adjustable from 0–100%; hover or interaction makes it opaque, and import notices reveal it for four seconds. Use `Ctrl/Cmd+Shift+I` to interact and Escape to return to the game.

Deployment readiness and packaged installers do not establish real game acceptance. Record the native observations using the acceptance checklist in `OVERLAY.md` and the existing queue/account checklist in `BETA.md`. Release/deployment identifiers and installer checksums belong in the final execution record once those operations complete.
