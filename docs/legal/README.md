# Dragapultist beta agreements and release preparation

Prepared September 28, 2026. **Internal drafts — not published or in force.**

These materials prepare a free, invitation-only beta for testers aged 18 or older, as selected by the operator. The operator has selected a completely free beta with no donations, advertisements, subscriptions, or payments. The operator is Christopher Capizzuto, based in New York, United States. The public contact email remains outstanding.

The documents are a starting point for review by a lawyer familiar with the operator's and testers' locations. They do not establish compliance, permission to use third-party assets, or a business entity. A download does not by itself determine every agreement required. Privacy and consumer obligations can apply to a small, free beta: the [FTC's app guidance](https://www.ftc.gov/business-guidance/resources/marketing-your-mobile-app-get-it-right-start) emphasizes accurate claims, clear disclosures, and honoring data-handling promises.

## Start here

1. **Publisher confirmed.** Christopher Capizzuto, an individual based in New York, United States. Local advice can determine whether any business registration or additional contact disclosure is needed.
2. **Create one monitored contact address.** A dedicated support/privacy inbox can serve both purposes for this beta. Confirm that it receives mail before placing it in the app. No email address or domain has been created by this work.
3. **Resolve asset rights before broader distribution or monetization.** Review the Pokémon-based icon, sprites, names, and other bundled or hosted artwork. The existing fan-project disclaimer does not grant rights. Pokémon's [current support guidance](https://support.pokemon.com/hc/en-us/articles/360000634094-Can-I-use-Pok%C3%A9mon-images-or-materials) asks projects not to use or associate its intellectual property with their work. This is a material issue for legal review; being free or accepting donations does not itself resolve it. The [U.S. Copyright Office explains permission and applicable exceptions](https://www.copyright.gov/circs/circ16a.pdf).
4. **Keep the beta completely free.** The operator has selected no donations, advertisements, subscriptions, or payments. The existing Vercel Analytics integration is separate from advertising and still needs accurate disclosure.
5. **Finalize the documents and implement the controls below.** Keep every draft marked as a draft until its unresolved items are completed and reviewed.

## Draft package

| Document | Purpose |
| --- | --- |
| [Beta Terms and Software License](BETA-TERMS-DRAFT.md) | Who can join, permitted use, beta limitations, software license, and user content |
| [Privacy Notice](PRIVACY-DRAFT.md) | Account data, imported logs, clipboard processing, providers, storage, and deletion |
| [First-run and settings copy](FIRST-RUN-COPY-DRAFT.md) | Clear agreement acceptance and separate optional clipboard permission |

One beta agreement can cover both service terms and the desktop software license. A separate NDA is not assumed: invitation-only access does not automatically mean confidentiality. Do not add a repository-wide software license without deciding ownership and licensing separately.

## Facts checked against the current source

Web source: `f07f78b0632e71b78b9335af1638cf6816036d8f` in the canonical repository. Desktop source: `2e63604`, version `0.2.0-beta.3`, in the separate `dragapultist-desktop-mac-window-fix` worktree. This is a source review, not a live provider-configuration or legal audit.

| Area | Current behavior / gap | Evidence |
| --- | --- | --- |
| Accounts | Firebase email/password sign-in and email verification; MongoDB account profiles. No terms acceptance or invitation/age check in the reviewed signup flow. | `components/auth/signup-form.tsx`, `lib/firebase-session-client.ts`, `app/api/auth/session/route.ts` |
| Saved games | Account-linked raw logs, participant handles, parsed results, notes, tags, and optional deck details. Player history searches are account scoped. | `lib/game-contract.ts`, `app/api/games/`, `app/api/player-search/route.ts` |
| Guest use | Guest games and preferences use local browser storage; visiting the site still involves network requests. | `lib/game-persistence.ts`, `components/pokemon-tcg-analyzer.tsx` |
| Desktop capture | Reads clipboard text locally while enabled, filters for game logs, encrypts the pending queue, and syncs to the signed-in account. Closing the window keeps it running. Pause stops new capture; already queued logs can still sync. | Desktop `electron/main.js`, `queue.cjs`, `startup.cjs`, `transport.cjs`; web `components/desktop-companion.tsx` |
| Deletion | Individual match deletion exists. No full account deletion workflow or user control to discard the desktop queue was found. No documented automatic expiry for pending logs. | `app/api/games/[id]/route.ts`, `app/api/account/profile/route.ts`; desktop queue and UI |
| Analytics / assets | The layout includes Vercel Analytics. Live enablement, collection configuration, and retention were not checked. Sprites can load from GitHub-hosted PokeAPI assets. | `app/layout.tsx`, `components/matchup-sprite-pair.tsx` |
| Existing legal UI | Fan-project disclaimer, but no Terms, Privacy Notice, or agreement acceptance UI found. | `components/site-footer.tsx`, signup form |
| Packaging | Mac beta config has no Developer ID signing identity. No legal documents are included in the app-source packaging list. | Desktop `electron/package.json` |

## Implementation sequence after the missing details are resolved

### 1. Publish approved, versioned documents

- Add readable `/terms`, `/privacy`, and third-party notices pages, linked from the footer, download page, account creation, and desktop settings. Package a readable copy with desktop releases, available offline.
- Give final documents an effective date and version; preserve older versions. Draft dates are not effective dates.
- Record agreement acceptance against the account with the document version and server timestamp. Keep it outside saved game records. Do not collect extra device identifiers merely to record acceptance.
- Provide an explicit acceptance action and a way to decline. Display the Privacy Notice separately; accepting Terms is not blanket consent for analytics, advertising, or clipboard access.
- Decide whether invitation-only eligibility covers the desktop beta or also the existing website. Private installer distribution does not restrict the public signup page. Implement any intended access restriction without silently removing existing users' access or data.
- Have the intended audience reviewed before relying on an age gate. Pokémon imagery does not by itself settle the legal classification, and an “18+” statement alone is not a COPPA solution. The [FTC's COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) considers the overall content, audience, and actual knowledge of children using a service.

### 2. Make privacy controls match the promises

- Add the concise clipboard notice in the draft copy before enabling capture. Store capture choice by account and device; enforce it in the native process, including startup, tray actions, and account changes.
- Plan migration for existing enabled capture: show the new notice before resuming capture under the new agreement. Preserve queued data, and prevent unapproved background delivery during that decision.
- Provide an owner-scoped “Discard queued logs” control. Explain whether it affects unsynced local logs or already saved cloud matches. Prevent an in-flight upload from defeating a user's discard action.
- Establish a verified account-data export/deletion process covering Firebase identity, MongoDB profile, games and related records, sessions, and pending desktop uploads. A supported manual request process may be the initial workflow; it must actually work before the notice promises it. Local-only data on another device needs a separate explanation.
- Decide and implement retention periods for inactive accounts, pending/review logs, support requests, service logs, and backups. A maximum queue size is not a retention policy. Document provider limits and legal exceptions without promising instant deletion everywhere.
- Confirm whether Vercel Analytics is enabled and what URLs/events it receives. Disclose the actual setup and determine any required choice mechanism. Its [privacy documentation](https://vercel.com/docs/analytics/privacy-policy) describes aggregate traffic measurement; this does not establish that Dragapultist meets every applicable privacy rule.
- Keep raw logs, notes, opponent handles, emails, and authentication tokens out of analytics events and ad requests. Review diagnostics before asserting that logs never contain personal data.

### 3. Prepare trustworthy installers

- Use a consistent, accurate publisher identity and support contact across documents, download pages, and installer metadata.
- For Mac distribution, arrange Developer ID signing and notarization, then verify the shipped package. [Apple's distribution guidance](https://developer.apple.com/developer-id/) explains both. The current beta is not Developer ID signed or notarized.
- For Windows distribution, choose a supported signing method and verify the actual installer signature. [Microsoft documents signing requirements](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control). Signing is not a promise that every security or reputation warning disappears.
- Inventory Electron/Chromium and all shipped dependency licenses, fonts, artwork, and other assets; retain required notices in the built artifacts. The dependency license review remains outstanding.
- Publish version, supported operating systems/architectures, release notes, integrity checksums, installation/uninstallation instructions, and a support route. Explain that uninstalling does not delete cloud matches and may leave local app data.
- Verify the final installation, sign-in, agreement, clipboard choice, import, deletion, offline queue, and uninstall flows on each supported platform before describing those releases as verified. This document does not claim those future checks have passed.

## Publication blockers

- [x] Responsible operator: Christopher Capizzuto; New York, United States
- [ ] Public support/privacy inbox working; any required business/contact disclosures resolved
- [ ] Tester locations and invitation scope decided
- [ ] Asset rights and dependency notices reviewed
- [x] Funding decision: completely free; no donations, advertisements, subscriptions, or payments
- [ ] Analytics configuration and retention confirmed
- [ ] Actual retention, account-data requests, and local queue removal procedures ready
- [ ] Final Terms, Privacy Notice, and clipboard copy reviewed for the applicable jurisdictions
- [ ] Acceptance and privacy controls implemented; installers packaged with final documents

## Desktop implementation follow-up

The September 28 follow-up is prepared in `/Users/admin/Desktop/projects/dragapultist-desktop-mac-window-fix/electron` as version `0.2.0-beta.4`:

- A local first-launch agreement precedes the hosted app, authentication requests, queue initialization, and clipboard reads.
- Terms acceptance and acknowledgement of the Privacy Notice are separate, unchecked choices. Decline quits. The existing capture-enable action remains separate.
- A local document-version/content-fingerprint receipt records acceptance per operating-system user profile; it is not a server-side account signature or part of a game record.
- New agreement versions durably pause old capture settings before any clipboard access, preserving queued logs. Interrupted resets retry on the next launch.
- Mac DMG and Windows NSIS configuration both include the agreement. Offline text copies and Electron/Chromium notices are configured for the package; a tray action opens the documents again.
- `electron/legal/terms.txt` and `privacy.txt` are the concise package templates. The longer files in this directory remain editorial working drafts.

The public contact email is still pending. Package generation rejects missing publisher details and unresolved templates. No new installer has been generated or installed yet. The one reported source-review defect was corrected and re-reviewed; tests, rendered UI, and native installer acceptance were not run. This source change does not establish legal sufficiency, asset permission, signing, or notarization.
