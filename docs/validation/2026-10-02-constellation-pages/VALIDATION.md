# Constellation pagination and shared preview

Scope: 15 matches per page in three rows of five, bottom Previous/Next and numbered page controls, chronological default ordering, and the same preview component used by List. The compact scrolling archetype header remains intact. Explicit alternate sorts still work.

## Checks

- 76 Vitest tests pass, including 11 new checks for page boundaries, partial/empty pages, refresh stability, filter resets, review focus restoration, hover travel into the preview, touch preview/open behavior, preview dismissal, and real date/same-day ordering.
- TypeScript, focused ESLint, whitespace checks, and the production Next.js build pass. The build reports existing unrelated image and hook warnings.
- Browser checks use the real GameList with 31 synthetic matches. Desktop at 1280px renders exactly five columns and three rows, with the newest fixture (October 2) at top left. Next/Previous and page buttons traverse 15/15/1 records correctly.
- Review callback and return remount restore page two and its original match focus. Filtering resets to page one; clearing filters does not restore a stale review page. Existing List pinning still works after sharing the preview component.
- The live browser width is 790px; a compact 272px right preview is retained from 720px so this window also uses the side-by-side layout.
- At 320px in dark mode, all five columns remain visible with 44px/48px targets, no page overflow, and a dismissible bottom preview. Closing restores focus without reopening it. Viewport override was reset afterward.
- No browser errors or warnings were captured in the local fixture.

Screenshots show synthetic local matches, not account data. Desktop means desktop browser sizing; native Electron window behavior was not separately exercised. Background persistence code was not modified.
