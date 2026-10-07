# Deck library styling refinement

Scope: Current deck button and dialog, archetype list filters, match assignment, bulk assignment, and Deck Lab’s saved deck picker. Keep the existing library and capture behavior and app navigation.

The feature now uses the app’s semantic panel colors in both themes, pixel archetype identities, compact field groups, a deck count with section totals, and separate primary and maintenance actions. Historical deck text and bulk game rows have matching surfaces and explicit results. All changes are in the canonical Desktop repository.

Validation:
- 27 relevant deck-library, deck API, games API, and history tests passed.
- Source whitespace check passed.
- Type checking passed; final production build passed. Existing image and hook lint warnings remain.
- Confirmed computed dialog backgrounds are #f4f9ff in light and #161b22 in dark, with zero inherited padding/gap and 560px maximum width.
- Confirmed no horizontal overflow at 1440px light, 390px light, and 320px dark; phone dialog scroll remains within its height limit.
- Filled an unsaved 60-card example: section totals were 12 Pokémon, 40 Trainer, 8 Energy; save enabled after choosing archetype and name.
- Tab reached the archetype chooser; ArrowDown opened it; selection and current-deck checkbox worked; keyboard focus stayed inside the phone dialog.
- Restored the original dark theme and reset the viewport override.
- Saved screenshots show corrected light desktop/mobile and dark filled/mobile states. The additional live Deck Lab walkthrough stopped when the preview browser became unavailable. Review and bulk dialogs share the verified panel styles, but were not separately exercised in this styling pass.

The browser checks use unsaved example input. No account records or guest library contents are created by the style check. No publishing or native release is included.

## Current deck button color follow-up

Current deck uses the same shared `action` style as Quick add, replacing its separate neutral color and hover overrides. The production build passed. In the dark production preview, both buttons rendered background rgb(76, 102, 127), white text, and border rgb(89, 117, 143). Screenshot: `current-deck-button-colors.jpg`. The preview remains in production mode after the development preview encountered a loading error.
