# Packaged beta agreement

The owner selected a completely free, invitation-only desktop beta for adults, operated by Christopher Capizzuto in New York, United States. The owner confirmed chriszcodes@gmail.com as the public support and privacy contact on October 1, 2026. Public installer storage was separately authorized; this is not a legal-compliance certification.

## Build

Complete `publisher.json` with the owner-supplied contact email before packaging. `scripts/prepare-legal.cjs` is a `beforePack` hook and rejects missing publisher details or unresolved template fields. It renders the two notices, a combined installer license, a content manifest, and Electron/Chromium notices into `generated/`.

DMG mounting and the Windows NSIS installer are configured to show the combined license. The text explicitly distinguishes accepting the software terms from acknowledging receipt of the privacy notice. Opening the app also requires an explicit choice, covering installation paths that bypass the disk-image dialog. The application includes its own offline document reader, available again through the tray menu, plus plain-text copies under its `Legal` resources directory.

## Runtime

- First launch creates only the local agreement window. The hosted website, authentication requests, queue initialization, and clipboard reads wait for acceptance.
- Both checkboxes start empty. Decline or closing the first-run window quits. Agreement acceptance does not enable clipboard capture.
- A minimal local `agreement-acceptance.json` record stores version, document fingerprint, time, app version, and explicit choices. No record is added to games or uploaded. This is per operating-system user profile, not a verified account-level signature or proof that a person read the documents.
- Changed document contents or version prompt again. The accepted copy is identified by its content fingerprint.
- A new agreement pauses previously enabled capture while preserving the queue. A document fingerprint is saved with the disabled capture setting, so interrupted upgrades must complete this reset on a later launch before any clipboard read. The existing separate “Save username & enable capture” action is then needed. Existing queued logs can sync after agreement acceptance, as the notice states.
- The native process only accepts agreement requests from its own top-level local agreement window. It does not expose the capture API in that window. Its network requests and navigation are blocked.

## Scope and remaining work

This change covers the private desktop package. It does not add web-signup acceptance, enforce invitations on the server, verify testers' ages, provision a support inbox, or implement full account deletion. It does not resolve Pokémon asset rights. Being free and recording agreement acceptance do not establish permission to redistribute third-party artwork.

The Mac package remains unsigned and unnotarized. Windows packaging configuration is included, but a Windows artifact and native Windows verification require a Windows build. Tests and native UI verification have not been run for this change; source inspection and packaging must not be described as native acceptance.

Before a wider release, review asset rights, actual analytics/log retention settings, deletion/request operations, tester jurisdictions, and the terms with qualified counsel. Do not claim the documents were lawyer-approved.

## Maintenance

Change the version whenever the published documents change. Preserve the shipped text alongside its release record. Do not replace the agreement payload with an unrelated remote page or silently accept it on behalf of users. Do not bundle development draft notes or placeholder contact details as a final agreement.
