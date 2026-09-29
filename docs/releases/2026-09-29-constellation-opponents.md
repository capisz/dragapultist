# Constellation opponent preview and organization

The user requested a delayed fade to the opponent's sprite while hovering a
constellation match, plus a way to organize matches by the opponent.

## Changes

- Keep the player's sprite visible initially. After 450ms of an open match
  brief, crossfade to the opponent's main attacker over 180ms.
- Use two stable sprite layers within the existing match circle; no imperative
  image replacement, accumulating elements, layout animation, or new dependency.
- Cancel the pending preview when the brief closes or the field unmounts. Return
  to the player's sprite over 120ms on dismissal.
- Share the preview with keyboard focus and the existing touch/pen first tap.
  Reduced-motion users get the same delayed preview without an animated fade.
- Add **Opponent deck** sorting by the displayed archetype label, falling back
  to the recorded opponent attacker. Preserve **Opponent name** sorting.
- Add **Your Pokémon / Opponent Pokémon** to the existing sprite filter bar.
  Switching sides clears the previous Pokémon filter. Metrics continue to use
  the matches currently visible.
- Preserve review navigation, search, import, saved games, and persistence.

## Release preparation

- TypeScript: passed (`pnpm run typecheck`).
- Source diff and whitespace review: passed.
- Production build: passed (`pnpm run build`), including its final type check.
  The existing 17 image and hook lint warnings remain.
- No tests or browser/native interaction checks were run for this change.

Production target: https://dragapultist.vercel.app through the existing
GitHub/Vercel integration. The desktop app uses the hosted site.
