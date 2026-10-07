# Combined current app release

The owner requested that all completed changes reach production together and selected `/Users/admin/Desktop/pult-icon1.png` as the installed desktop icon. The unified release integrates the completed local decklist work with the published overlay and consolidated download workflow. The original working checkout and unfinished work remain intact.

## Included behavior

- Current deck beside Quick add opens the named-list library and current selection.
- Games and Statistics can filter one archetype by saved list, with Uncategorized retained and existing games assignable individually or in bulk.
- Deck Lab can load saved lists and generate randomized seven-card hands.
- Desktop imports resolve the selected deck at capture time. Account changes, duplicates, archived lists, saved historical snapshots, and revision conflicts retain their existing protections.
- The prior `0.2.0-beta.4` installer's agreement gate, installer license, async clipboard API, async secure-storage handling, and visible/reopenable window are restored. The overlay is initialized only after agreement acceptance and secure queue initialization; import notices and settings remain account-scoped.
- Desktop `0.3.0-beta.3` includes the exact supplied PNG (SHA-256 `37ed0b411f231dfb2b88d465917636d1e3f85fe31a52a8bb5685ec8dcb15c3d1`). Native installer conversion supplies Mac/Windows application icons. Packaging verifies that the bundled source icon matches the selected image and includes the agreement/startup files.

## Checks before release

98 web contract/component/backend tests and 28 existing unit tests passed. 63 desktop tests passed on Mac, including agreement-before-session ordering, clipboard races, queue preservation, overlay startup/settings, account changes, and duplicate notices. Type checking and the optimized production build passed. Existing image/hook lint warnings remain.

The existing synthetic browser flow was rerun against the combined local production build in an isolated context. Current selection/quick import, per-list metrics, review return, bulk assignment, create/rename/archive, manual import overrides, saved randomized hands, and reload passed. Desktop, 390px and 320px layouts passed in both themes without overflow or browser errors. The harness dropdown selector was updated to distinguish the renamed review dialog from its combobox.

The local packaged arm64 app passed strict app/helper signatures and contained the bundled overlay, focus helper, first-run documents, and new icon. The local package used the already installed native runtime because the work Mac's build environment lacks usable system Python/Xcode tooling; clean CI builds still rebuild and verify native dependencies.

Production release/download checks are recorded in the beta.3 manifest once the new public installers are built. Live signed-in cross-device mutations, actual PTCGL focus/fullscreen, and native first-launch acceptance remain acceptance checks. Mac apps remain ad-hoc signed and unnotarized, and work-device policies still apply.
