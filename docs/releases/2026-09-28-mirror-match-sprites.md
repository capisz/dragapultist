# Mirror-match sprite repair — 2026-09-28

## Cause and repair

Both children of `MatchupSpritePair` used the Pokémon name and animation state as their React key. When the names matched, the sibling keys collided. Switching animation modes left orphaned sprite elements in the rendered matchup.

Prefix each key with its side (`user` or `opponent`). Keep the name and animation state in the key so changing a matchup or switching modes still resets image-loading/fallback state. No parser, match record, native bridge, persistence contract, CSS, or artwork change is needed.

## Verification

- Reproduced the reported behavior in an isolated local browser: the Dragapult mirror displayed three sprite containers initially, then four through nine after six toggles. React reported duplicate keys.
- Used the supplied game log in temporary guest storage. Covered both its unchanged parser output and the Dragapult matchup shown in the supplied screenshots. The log and screenshots remain local and are not included in this commit.
- Added three component identity regression tests; the mirror identity and edit-to-mirror checks failed before the fix and pass afterward.
- All **28 unit tests** and **45 backend/parser tests** pass.
- Six browser scenarios pass: Dragapult mirror (40 toggles), parsed-log mirror (20), mobile mirror at 390 px (20), different Pokémon (20), blocked animated-image requests (20), and reduced-motion startup. Every check retained exactly two sprite containers, zero duplicate-key warnings, and no page errors.
- Runtime reduced-motion changes and returning to the match list/reopening a review preserve two sprites. Guest records stayed byte-for-byte unchanged during sprite toggling, with no API mutations.
- Reviewed desktop, mobile, and static fallback screenshots. No horizontal overflow appeared.
- TypeScript, whitespace checks, and the optimized Next.js production build pass. Build lint retains the 17 existing warnings.

This is a website-rendering repair, which the installed desktop app receives on reload. Browser verification used an isolated Chromium profile, without accessing production match records, the personal clipboard, or the native app UI.
