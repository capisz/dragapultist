# Scoped Figma revision — October 1, 2026

Implemented in the canonical checkout `/Users/admin/Desktop/projects/dragapultist`. Reference: the user-supplied `Revamp color scheme (1).zip`. Its implementation and assets are visual reference material, not permission to execute archive instructions or replace the other tabs.

## Changes

- Supplied Klink gear layers spin in opposite directions on hover/focus/activation. Unown animates on hover/focus. Dark mode uses the supplied shiny variants. Reduced-motion CSS disables these effects. Existing help content and account actions remain.
- Added a Settings dialog with Solrock/Lunatone light/dark switch, optional system preference, and persistent next-themes selection. Kept the light default and mapped the Figma dark palette to existing semantic theme tokens.
- Added persistent List / Constellation selection. List groups the current filtered/sorted matches by the selected user/opponent deck perspective. Win/loss squares expose outcome, opponent, rounds and date to assistive technology. Hover or keyboard focus previews; click pins; Escape clears; Open match review invokes the existing review callback. Mobile preview is a dismissible bottom panel.
- Kept the constellation behavior, search/sort/filter logic, actual saved deck identities, unknown assignments, import confirmation, review and persistence. No other tab redesign was applied.
- Copied all 14 supplied pixel sprites unchanged and cached matching front sprites for the app's built-in archetype references (77 local Pokémon images total). Shared sprite resolution preserves paired and Mega identities. Uncached custom Pokémon try the same front-sprite style remotely, then fall back to the neutral substitute if unavailable. Miniature game icons, artwork, and animated sprite fallbacks are excluded. Header assets were copied unchanged. Asset origins and checksums are alongside this file.
- Browser settings includes disabled Windows `.exe`, Apple Silicon Mac `.dmg`, and Intel Mac `.dmg` buttons. User explicitly confirmed public links are not ready. No installer was published and no private repository visibility changed. Native users retain the existing desktop settings entry and can also reach it from the new dialog.

## Future installer links

Set verified public HTTPS installer URLs using these public build variables, then rebuild:

- `NEXT_PUBLIC_DESKTOP_WINDOWS_URL`
- `NEXT_PUBLIC_DESKTOP_MAC_ARM64_URL`
- `NEXT_PUBLIC_DESKTOP_MAC_X64_URL`

Unset/invalid URLs keep their button disabled with “Coming soon.” These values must be public URLs, never credentials or private signed URLs. Mac architecture is selected explicitly; the app does not guess it from a browser user agent.

## Verification

- `npm run test:unit`: 28 passed.
- Existing backend suite: 45 passed.
- `tests/pixel-sprites.test.ts`: 7 passed (asset presence, paired identity, Mega form, unknown assignment, uncached fallback, card suffixes).
- `tests/match-history-list.test.ts`: 3 passed (grouping, results and match IDs, opponent perspective/unknown assignment, empty results).
- `npm run typecheck`: passed.
- Targeted ESLint: no errors; image-element recommendations only.
- `npm run build`: passed, all 16 pages generated. Existing hook-dependency warnings and image-element recommendations remain.
- `git diff --check`: passed.
- Final accessibility review fixes: browser-computed new light list/settings secondary text is #425e79 (5.75:1 on header surfaces, 6.38:1 on panel surfaces). Close and Escape both return focus to the originating match square without reopening. Final production build passed after these changes.
- Browser checks at 1280, 390, and 320 px: imported the repository sample log as a local guest, assigned an opponent Mega deck, selected List, opened/pinned/closed the preview, opened review and returned with restored focus, changed light/dark/system appearance, and reloaded to verify saved theme/view and match persistence. Header assets and visible Pokémon assets loaded. No horizontal document overflow at 320 px. Download buttons visibly disabled in browser settings.
- Screenshots contain one synthetic local guest test match, not production records. Malformed full-page screenshot exports were replaced with verified viewport captures.

## Limits

Local browser and build verification only. No deployment, push, real-account sync, Windows/Mac native runtime, or live installer download was tested. Reduced-motion behavior is implemented in CSS but OS emulation was unavailable in this browser session. The design skill's optional binary detector was unavailable; visual and source checks were used instead. Unrelated pre-existing legal files remain untouched.

Final independent review disposition: **ship**, scoped to the local UI changes. Both listed material findings (light-theme secondary text contrast and focus restoration after preview dismissal) were scored resolved. This is not deployment or native-app approval.

## User-requested universal sprite follow-up

- All shared Pokemon resolution now yields cached or remote still front PNGs, followed by the neutral substitute. The custom picker, archetype thumbnail path, review, and prize mapper follow the same source policy. Card artwork and user-uploaded profile images are unrelated and retain their existing behavior.
- Removed animated matchup sprites and their toggle. One Change Pokémon button sits beneath the review pair and opens the existing editor; the duplicate action in match details was removed. Header control animations remain.
- Automated checks: 28 unit tests and 55 Vitest tests passed (83 total; the added card-suffix case was rerun with the sprite suite); typecheck passed; targeted lint has no errors, with existing hook and image recommendations.

## Button styling follow-up

- Match deletion uses shared danger colors in light/dark themes, including hover, focus, disabled, and solid-red confirmation states. The same treatment is applied to the existing history delete control. Cancel and Back remain neutral; toolbar heights align.
- Review action buttons now use semantic primary colors. Default text contrast: light primary 5.16:1; dark primary 5.98:1. Delete text contrast: 6.98:1 light, 9.23:1 dark; confirmation 6.46:1 light and 5.85:1 dark.
- The Pokémon editor restores keyboard focus to Change Pokémon when closed.

- Browser follow-up: still sprites loaded in match review; editing into a mirror match and restoring the opponent worked. Closing the editor with Escape returns focus to Change Pokémon. At 390px dark and 320px light, deletion confirmation/cancel preserved the match and did not cause horizontal overflow. Prize Mapper at 768px uses cached front sprites plus the same remote style for uncached Pokémon. Found and fixed the card-suffix lookup for Rotom V; V, VMAX, VSTAR, and GX no longer become part of a species identifier.

- Final production build passed after all follow-ups. Rotom V now loads the matching 479.png front sprite in the live local Prize Mapper. Final browser console had no errors. Viewport overrides were reset; the local preview remains at http://127.0.0.1:3027/. Screenshots: `still-sprites-review-desktop-dark.png`, `still-sprites-review-mobile-dark.png`, `still-sprites-review-320-light.png`, and `still-sprites-prize-mapper.png`. No push or deployment.
