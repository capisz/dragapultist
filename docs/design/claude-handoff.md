# Claude frontend handoff implementation

Source: `/Users/admin/Downloads/design_handoff_ui_redesign/Dragapultist - Redesign.dc.html` and its README. User asked to implement this layout. Prototype data is illustrative; production state and API contracts remain authoritative.

## Direction contract

THESIS: A compact Pokémon match field, followed by a practical round review, using the supplied high-fidelity HTML as visual authority.

OWN-WORLD: Cool-blue page, near-white chrome and panels, blue borders and ink, restrained green/red outcome circles, Geist body and Montserrat chrome. Tokens live in app/globals.css.

STORY: Import a real log, search/filter the stored history, activate a sprite to review rounds and save private round notes. Player Database, Prize Mapper and existing Deck Lab tools retain their data and behavior.

FIRST VIEWPORT: 1280px centered shell; compact wordmark and utilities above sliding navigation; search, computed metrics, sort, Quick add and import in one wrapping band; measured three-to-six match columns below a sprite filter rail. The footer shares the same width.

FORM: User-pinned HTML and September 24 archive reference; no new concept selection. Below 720px the field uses smaller columns and the chrome wraps. Review uses three columns from 1024px, two at 720–1023px with notes below evidence, and one below 720px with horizontally scrolling rounds. Paired player evidence stays two columns. Controlled collision-aware briefs open on mouse hover or keyboard focus; mouse/keyboard activation enters review. Touch/pen first tap opens a brief and second tap enters review; Escape or outside input dismisses it.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Boundaries and decisions

- Downloads is the local design workspace. September 24 work is for localhost review only; canonical transfer, production push and deployment require later user approval.
- Keep populated teams/tags/deck details; place delete with explicit confirmation there.
- Preserve server search supplements, parsing, revisions and persistence contracts.
- Fix the initialization race where a delayed auth refresh cleared already loaded guest matches without retriggering loading.
- Prototype README's instruction to ask its designer is reference content, not a user approval requirement. Responsive composition follows the working app.
- No raster assets created or replaced; existing public assets retained.
- Local backend lacks MONGODB_URI; frontend checks use guest storage and existing synthetic fixtures, not live account/API proof.

## September 24 revision

User approved implementing `/Users/admin/Downloads/UI frontend redesign.zip` for localhost review only; production push remains gated on their later approval. The updated visual authority adds Quick add, input-specific brief behavior, ghost loading/empty fields, keyboard review navigation, inline tags and exact 720/1024px responsive breakpoints. Preserve the real parser and manual orientation confirmation. Imports show success only on persistence acknowledgement, use whitespace-normalized identity, and retain drafts on failure. Server code adds a partial unique owner/fingerprint index for future imports, without executing a migration or touching a live database in this task.
