# Current Standard archetype correction

The user reported that the expanded picker included outdated lists and requested
only archetypes from the current card rotation.

## Changes

- Restrict catalog choices and new import inference to the current 2026 Standard
  snapshot (H/I/J), sourced from Limitless's explicit TEF–30C family and variant
  indexes: 37 families and 16 variants.
- Retain Dragapult Dusknoir, Blaziken, and Dudunsparce. Remove the older Dragapult
  overview variants from the picker, including Lost Zone, Pidgeot, Charizard,
  and Gholdengo.
- Keep historical registry entries for saved labels and sprites. Selected
  historical values and Prize Mapper history cannot reintroduce them into the
  current catalog. No saved games or persistence contracts are changed.
- Include the current index's Mew Box Memory Helix, Mega Darkrai ex, Toucannon
  Feather Rondo, and Starmie Froslass entries.
- Avoid identifying a Box deck from a Mew sighting alone. Printing/composition
  dependent labels require manual selection.
- Retain the existing modal scrolling fix and custom selection support.

Sources, scope, and refresh procedure: [Archetype catalog](../archetype-catalog.md).

## Release preparation

- TypeScript: passed (`pnpm run typecheck`).
- Production build: passed (`pnpm run build`), including its final type check.
  The existing 17 image and hook lint warnings remain.
- Source diff and whitespace review: passed.
- No tests or browser/native interaction checks were run for this correction.

Production target: https://dragapultist.vercel.app through the existing
GitHub/Vercel integration. The installed desktop app uses this hosted site.
