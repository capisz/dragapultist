# October 1 UI revision and installer storage

## Website release

- Adds Figma Klink/Unown header controls, light/dark/system settings, and grouped List history alongside the existing Constellation view.
- Uses still front Pokémon sprites throughout, with one Change Pokémon action in match review. Card suffixes such as V and VSTAR resolve to the correct species. Saved archetype and Mega identities remain intact.
- Gives delete controls consistent danger styling and improves action contrast, mobile layout, and keyboard focus return.
- Prepares Windows, Apple Silicon Mac, and Intel Mac download buttons in Settings. Buttons stay disabled while their public installer URL is unset.

Validated locally with 83 tests across the existing suites and the targeted sprite follow-up, type checking, production build, and desktop/mobile browser checks. Detailed scope and evidence: `../validation/2026-10-01-figma-revamp/VALIDATION.md`.

## Installer storage

The user approved public installer storage. Vercel Blob store `dragapultist-installers` (`store_jrWoUoLWnFCQOKW1`) is in `iad1`, connected to the existing `dragapultist` project's Production and Preview environments on its Hobby plan. Uploaded files will be public to anyone with their URL.

No installers were uploaded during initial setup: a release version must first be selected. Local candidates found include beta.1 Windows/Apple Silicon/Intel installers and newer beta.2/beta.3 Apple Silicon builds. The separate beta.4 desktop source is unfinished and requires a public support email before packaging. Do not label older files as beta.4.

For each selected release, upload the installer under a versioned pathname, verify its SHA-256 and download response, and configure the corresponding public HTTPS URL:

- `NEXT_PUBLIC_DESKTOP_WINDOWS_URL`
- `NEXT_PUBLIC_DESKTOP_MAC_ARM64_URL`
- `NEXT_PUBLIC_DESKTOP_MAC_X64_URL`

Rebuild after updating these public build variables. Blob credentials are server-side deployment settings and must never be copied into a NEXT_PUBLIC variable. Keep binaries out of the Git repository and website deployment bundle.
