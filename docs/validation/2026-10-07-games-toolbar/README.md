# Games toolbar layout refinement

Implemented in the canonical Desktop checkout. Search and deck/import actions occupy an explicit primary row, with compact metrics and sorting in the secondary row. The layout responds to the match-history container width, uses 12px panel/row spacing and 8px control gaps, and removes inherited metric spacing. Quick add feedback has a separate row above the expanded import composer. Long deck names keep a full accessible label and tooltip.

Verification:

- Production build and standalone type checking passed. Existing image optimization and hook dependency lint warnings remain.
- 12 existing match-search, match-history-list, and deck-library tests passed.
- Loading metrics and primary/secondary/status DOM order passed an isolated static render check.
- Both themes passed browser checks at 1440, 900, 390, and 320px viewport widths, with no horizontal page overflow. Stats measured 44px high at every tested width; desktop search/actions measured 36px and phone controls measured at least 44px.
- Search and no-results metrics, sorting direction, deck-manager opening, keyboard focus order, import expansion/collapse, blocked clipboard with textarea focus, invalid clipboard feedback, and successful Quick add inheriting the current deck passed in both themes.
- Long deck names truncated without overflow and retained their full accessible label. Expanded import remained within the phone panel. 200% document CSS zoom passed reflow and overflow checks; browser-native zoom was not separately exercised.
- No browser page errors were reported. Current deck and Quick add retained identical action background colors in both themes.

Screenshots and `checks.json` contain synthetic fixture data from isolated, disposable browser contexts. No user browser storage or account records were changed. Quick add saved only temporary local guest fixtures. No publishing or native desktop release was performed.

The local production preview is available at http://127.0.0.1:3212 while its server remains running.
