# Mac testing package signature repair — 2026-10-07

The browser-downloaded `0.3.0-beta.1` arm64 DMG matched its published SHA-256 and passed `hdiutil verify`. The exact app inside failed `codesign --verify --deep --strict` with `code has no resources but signature indicates they must be present`. The pipeline set `mac.identity` to null, skipped signing the renamed/repackaged Electron bundle, and published without a sealed app integrity check. Package compilation and installer checksums did not catch that launch blocker.

Version `0.3.0-beta.2` uses explicit ad-hoc signing (`identity: "-"`) for the private test app and its native game-focus helper. The after-sign hook verifies the sealed app and nested code. After creating the arm64 and x64 DMGs, the Mac build also verifies each image, mounts it read-only, and verifies the exact distributed app/helper before producing checksums or uploading artifacts. Invalid signatures fail the build. App identity and encrypted user data paths remain unchanged.

The repaired local arm64 app passed strict/deep signature and helper verification. An ad-hoc signature proves package integrity; it does not identify an Apple-approved developer or provide notarization. Gatekeeper acceptance has not been established. No Developer ID signing identity exists on the build host, and the private repository has no signing/notarization secret names configured. The normal internet-download release path still requires Developer ID signing and Apple notarization.

Do not remove quarantine, disable Gatekeeper, or instruct users to override the damaged `beta.1` app. Use the corrected build only, and distinguish any unverified-publisher prompt from a damaged/invalid-signature prompt. If a corrected, verified private build is blocked as an unidentified developer, Apple's documented app-specific approval is a user action; it must not be automated or represented as normal notarized acceptance.

References: [Apple's explanation of damaged and unverified-app alerts](https://support.apple.com/en-us/102445) and [electron-builder signing configuration](https://www.electron.build/code-signing).
