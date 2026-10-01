# Background refresh stability

The reported symptom was an intermittent flash or blank view that recovers by itself in both the browser and desktop wrapper.

The shared analyzer previously cleared `games`, set the full loading state, and replaced the match panel with its placeholder on every history refresh. Signed-in history refreshes every 60 seconds and on window focus, visibility, reconnect, and desktop import events. These refreshes also restarted search results. This is a confirmed source of disappearing content; it does not establish that every possible whole-window graphics fault has been reproduced.

The history loader now keeps the current account's successfully loaded data visible until all new pages arrive. Failure preserves the displayed data and shows a retry message. Focus/visibility events are coalesced. A desktop import during an active fetch schedules one follow-up read. Open reviews and unsaved changes defer refresh, mutations cancel older reads, and switching accounts clears the previous account's visible data. Search retains its existing matches during a refresh of the same query.

## Verification

- 28 existing Node tests and 55 existing Vitest tests passed.
- 10 new DOM regression tests cover slow multi-page polling, focus/visibility/reconnect bursts, failure/retry, desktop imports, paused reviews, mutation races, account isolation, empty collections, hidden/guest views, and React strict effect cleanup.
- Type checking passed. Production build passed with existing unrelated warnings. Focused lint covers the changed loader, analyzer and regression tests.
- Browser verification used the actual `GameList` and `useGameHistory` with synthetic local records and a controllable stalled request. The list, metrics, selected view and pinned match preview stayed visible during the stalled request, its failure, and a successful retry. No browser console warnings/errors were observed in that check.
- [Captured list during a deliberately stalled refresh](refresh-in-flight.png).

The desktop beta loads `https://dragapultist.vercel.app`, so the shared web deployment supplies this change on browser refresh or desktop restart; no installer rebuild is needed. This validation does not claim a native desktop window run or a signed-in production-account replay.
