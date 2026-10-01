# October 1 UI revision and installer storage

## Website release

- Adds Figma Klink/Unown header controls, light/dark/system settings, and grouped List history alongside the existing Constellation view.
- Uses still front Pokémon sprites throughout, with one Change Pokémon action in match review. Card suffixes such as V and VSTAR resolve to the correct species. Saved archetype and Mega identities remain intact.
- Gives delete controls consistent danger styling and improves action contrast, mobile layout, and keyboard focus return.
- Prepares Windows, Apple Silicon Mac, and Intel Mac download buttons in Settings. Buttons stay disabled while their public installer URL is unset.

Validated locally with 83 tests across the existing suites and the targeted sprite follow-up, type checking, production build, and desktop/mobile browser checks. Detailed scope and evidence: `../validation/2026-10-01-figma-revamp/VALIDATION.md`.

## Installer storage

The user approved public installer storage. Vercel Blob store `dragapultist-installers` (`store_jrWoUoLWnFCQOKW1`) is in `iad1`, connected to the existing `dragapultist` project's Production and Preview environments on its Hobby plan. Uploaded files will be public to anyone with their URL.

The owner supplied `chriszcodes@gmail.com` as the public support and privacy contact. Beta `0.2.0-beta.4` was built from desktop commit `0138a79a1255f7df9f473a259e227eeed70f9270` on the separate `codex/desktop-mac-window-fix` branch. The website continues using the current redesign on `main`.

All three installers are now in the public store under `desktop/0.2.0-beta.4/`: Windows x64 EXE, Apple Silicon DMG, and Intel Mac DMG. Combined size: 379,019,285 bytes. Exact URLs, SHA-256 checksums, source/build identifiers and validation details are recorded in [`desktop-0.2.0-beta.4.json`](desktop-0.2.0-beta.4.json).

Both native build runners passed 35 automated tests, including agreement integrity, explicit choices, capture remaining disabled after a changed agreement, queue persistence, asynchronous clipboard handling, and startup. Each downloaded installer matches its build checksum. Both DMG image checksums are valid. Static inspection of all three packaged applications confirms beta.4, the expected architecture, the support email in both documents, and the production website address. Windows and Mac document text matches after normalizing line endings; their exact stored document fingerprints differ accordingly.

All three public URLs returned HTTP 200, attachment headers with the correct filename, and the exact expected file bytes and SHA-256. The URLs are configured for Production and Preview, and require a website rebuild to appear in Settings.

These remain unsigned beta builds; the Mac packages are not notarized. Native interactive installation and first-launch acceptance were not completed: macOS computer-control permission was unavailable, and no native Windows GUI session was available. Automated tests and static package checks do not establish those results. Public storage does not change the existing invited-adult beta terms or add invitation enforcement.

For each selected release, upload the installer under a versioned pathname, verify its SHA-256 and download response, and configure the corresponding public HTTPS URL:

- `NEXT_PUBLIC_DESKTOP_WINDOWS_URL`
- `NEXT_PUBLIC_DESKTOP_MAC_ARM64_URL`
- `NEXT_PUBLIC_DESKTOP_MAC_X64_URL`

Rebuild after updating these public build variables. Blob credentials are server-side deployment settings and must never be copied into a NEXT_PUBLIC variable. Keep binaries out of the Git repository and website deployment bundle.
