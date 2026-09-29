# Constellation archetype icons

The user clarified that constellation icons should represent the archetype,
rather than the main attacker, and requested a cleaner toggle in place of the
new side-selection dropdown.

## Changes

- Use the assigned user archetype for each constellation point and the assigned
  opponent archetype for its delayed hover/focus/touch preview.
- Reuse the shared archetype icon definitions, including pairs such as Dragapult
  Dusknoir and custom combinations. Use local sprites to retain the field's
  existing pixel-art style; fit up to three icons within the existing circle.
- Filter with a compact **Your decks / Opponent decks** toggle, keeping variants
  distinct. The toggle stays visible while the adjacent archetype icons scroll,
  with a selected state, visible keyboard focus, and arrow-key navigation.
  Known label/alias forms are canonicalized for grouping without rewriting data.
- Sort opponent decks by these same assigned archetype labels.
- Display **Unknown archetype** with the existing placeholder when no archetype
  is assigned. Never silently replace an archetype with an attacker icon.
- Preserve the 450ms preview delay, 180ms crossfade, 120ms return, reduced-motion
  behavior, review navigation, search, import, and saved-game contracts.

## Release preparation

- Type checking passed.
- Production build passed, with the existing 17 image and hook lint warnings.
- Whitespace/diff checks passed.
- No tests or browser/native interaction checks were run for this correction.

Production target: https://dragapultist.vercel.app through the existing
GitHub/Vercel integration. The desktop app uses the hosted site.
