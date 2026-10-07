# Desktop installer consolidation

The user authorized consolidation into `capisz/dragapultist` and restoration of downloads through the existing Vercel website on 2026-10-07. Source, installer builds, and public beta releases now belong to the original repository. The former private build repository is retained as historical evidence; no repository, release, or older Blob download is deleted.

Version `0.3.0-beta.2` uses the already verified Windows x64 and Mac arm64/x64 installer bytes. Their desktop source matches the original repository's `electron/` at `e3b1997`; the original build ran in the former private repository at `1988869`, run `37601941063`. Copying those artifacts to the original repository does not rebuild or change them. The public release is tagged at `e3b1997`, the exact desktop source revision, rather than the subsequent website/workflow revision.

The website's existing Settings download buttons read `desktop-0.3.0-beta.2.json` through `lib/desktop-downloads.ts`. They point directly to the original repository's public release assets, so GitHub sign-in is unnecessary. The three legacy `NEXT_PUBLIC_DESKTOP_*_URL` deployment variables are no longer used; they previously pointed to the older version in Vercel Blob storage. Historical URLs are preserved, and binaries stay out of Git and the website bundle.

The original repository's desktop workflow now runs on public or private repositories. Manual dispatch builds and tests both platforms, preserving native dependency and Mac bundle/DMG signature checks. The optional `publish` input defaults to false; when explicitly enabled, a dependent job verifies both checksum manifests and creates a public prerelease. Existing versions cannot be overwritten; bump `electron/package.json` and its lockfile before a new release. Update the checked-in website release manifest only after verifying every public asset.

Consolidation changes distribution only. Mac Developer ID signing/notarization, work-device policies, actual PTCGL/fullscreen acceptance, and production coordinator requirements remain separate release prerequisites.

Validation before publishing the website: production build, TypeScript, targeted lint (existing image warnings only), two existing desktop-settings contract tests, and workflow YAML parsing passed. All three public installer URLs returned HTTP 200 anonymously with correct attachment names, exact sizes, and matching SHA-256 checksums.
