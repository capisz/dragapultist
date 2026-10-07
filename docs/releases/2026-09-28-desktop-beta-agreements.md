# Desktop beta agreement — implementation and release note

Date: September 28, 2026. Source inspected: `/Users/admin/Desktop/projects/dragapultist-desktop-mac-window-fix`. Desktop version: `0.2.0-beta.4`; proposed agreement version: `2026-09-28.1`.

**Status:** Source implementation documented. Package generation remains blocked by the missing public support email. Native acceptance has not been established.

## Scope and incumbent design

The selected offer is a completely free private beta for invited adults aged 18 or older, operated by Christopher Capizzuto in New York, United States. The agreement documents that policy; it does not implement invitation enforcement or age verification.

The existing root `DESIGN.md` is the visual authority; `PRODUCT.md` is absent. Its cool-blue page (`#d9ebff`), panel (`#f4f9ff`), blue ink (`#294b70`), border (`#b8d2ea`), 8px controls, and 14px panels are reflected in the local reader. The reader uses system typography, a bounded scrolling document area, visible focus styling, and a compact action footer. These are source observations, not a visual or accessibility acceptance result. The incumbent `DESIGN.md` remains unchanged; this note records only the agreement extension.

## Implementation

- `electron/agreement.html`, `agreement.css`, `agreement-renderer.js`, `agreement-preload.js`, and `agreement.cjs` provide the local document reader, restricted message bridge, content verification, and acceptance receipt.
- `electron/main.js` places the gate before the hosted website, persistent web session, queue initialization, and clipboard capture. The tray can reopen the included documents for reading.
- `electron/legal/` contains Terms and Privacy templates, publisher metadata, and maintenance notes. `electron/scripts/prepare-legal.cjs` and `electron/package.json` define the packaging hook, generated manifest, installer license, plain-text copies, and Electron/Chromium notices.

Both confirmations begin unchecked: agreement to the Terms and acknowledgement that the Privacy Notice was provided. Continuing requires both. Declining or closing the first-launch reader quits. The agreement window loads local content and restricts network access, navigation, permissions, and messages to its own top-level window.

An atomic local `agreement-acceptance.json` receipt records the exact document version and digest, choices, timestamp, and app version in the operating-system user's app profile. It is not an account signature or uploaded acceptance record. Changed document content or version requires acceptance again.

Capture needs the existing hosted Desktop settings action, “Save username & enable capture.” For a new agreement, `queue.settings.captureAgreementDigest` and `enabled: false` are saved together through the existing atomic queue writer, preserving queued logs. A mismatch on restart repeats the reset before any clipboard read. Existing queued logs may sync after acceptance and connection, as disclosed in the reader and notices.

## Review and release limits

The source reviewer marked one restart-gap finding resolved at source-inspection scope. The persisted digest/reset ordering and existing `electron/queue.cjs` temporary-file, sync, and rename path were inspected for this handoff. Runtime interruption behavior remains unverified.

`electron/legal/publisher.json` currently has `contactEmail: null`. The `beforePack` hook rejects missing publisher details and unresolved placeholders; the owner must supply a public support email before generating release documents or packages.

No tests, native UI runs, screenshots, captures, detector runs, or installer builds were performed for this extension. The Impeccable context launcher failed because of cache permissions; existing project context and source were read directly. This note records implementation evidence, not native acceptance, installer verification, or legal approval.
