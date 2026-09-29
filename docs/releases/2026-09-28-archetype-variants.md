# Archetype variants and scrolling repair

The user requested Limitless-based archetype choices and authorized deployment
after fixing the archetype list's sticky scrolling.

## Changes

- Add the current Limitless deck families and variants, plus the variants listed
  on Dragapult's overview; retain existing IDs and custom selections.
- Make every catalog entry selectable and searchable in either Pokémon order.
- Keep broad labels for ambiguous observed combinations; do not rewrite saved
  games or change the persistence contract.
- Give the portaled archetype list its own Radix modal scroll boundary. The
  surrounding dialog previously allowed scrolling only within its own content,
  leaving the body-portaled list outside that boundary.
- Bound list height by the available popup space and reserve room for search.

Sources and classification limits: [Archetype catalog](../archetype-catalog.md).

## Build checks

- TypeScript: passed (`pnpm run typecheck`).
- Optimized production build: passed (`pnpm run build`); the existing 17 image
  and hook lint warnings remain.
- Whitespace/diff check: passed.
- No tests or browser/native interaction checks were run for this change.

## Deployment

Approved target: https://dragapultist.vercel.app, through the existing
GitHub/Vercel production integration on `main`. The installed desktop app loads
this hosted site, so these changes do not require rebuilding its installer.
Deployment success must be confirmed against the new commit and public domain.
