---
name: Dragapultist
description: Compact match history and round review with the scoped Figma appearance and List revision.
colors:
  ui-page: "#d9ebff"
  ui-chrome: "#f7fbff"
  ui-panel: "#f4f9ff"
  ui-panel-header: "#e3eefb"
  ui-raised: "#fff"
  ui-border: "#b8d2ea"
  ui-border-soft: "#cfe0f1"
  ui-border-chrome: "#c3d9ee"
  ui-grid: "#dceaf8"
  ui-ink: "#294b70"
  ui-ink-2: "#425e79"
  ui-ink-3: "#5b7692"
  ui-ink-4: "#7a94ad"
  ui-link: "#315f91"
  ui-action: "#456d97"
  ui-action-hover: "#315f91"
  ui-action-label: "#f8fafc"
  result-win-bg: "#d3f0e2"
  result-win-fg: "#216e54"
  result-win-dot: "#559b80"
  result-loss-bg: "#fadde2"
  result-loss-fg: "#9c3349"
  result-loss-dot: "#bc7586"
  ui-fresh: "#8fb2d4"
  status-warn-bg: "#fdf0d8"
  status-warn-ink: "#8a5a12"
  dark-ui-page: "#0d1117"
  dark-ui-chrome: "#161b22"
  dark-ui-panel: "#161b22"
  dark-ui-panel-header: "#21262d"
  dark-ui-raised: "#1c2633"
  dark-ui-border: "#30363d"
  dark-ui-border-soft: "#30363d"
  dark-ui-border-chrome: "#30363d"
  dark-ui-grid: "#30363d"
  dark-ui-ink: "#e6edf3"
  dark-ui-ink-2: "#b7c3cf"
  dark-ui-ink-3: "#8b949e"
  dark-ui-ink-4: "#8b949e"
  dark-ui-link: "#58a6ff"
  dark-ui-action: "#4c667f"
  dark-ui-action-hover: "#59758f"
  dark-ui-action-label: "#ffffff"
  dark-result-win-bg: "#2e4a3e"
  dark-result-win-fg: "#7ee2a8"
  dark-result-win-dot: "#79b397"
  dark-result-loss-bg: "#49303b"
  dark-result-loss-fg: "#ffa7a5"
  dark-result-loss-dot: "#ce8c96"
typography:
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "13px"
  wordmark:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "20px"
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  review-title:
    fontSize: "19px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  label:
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.07em"
  log:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "11.5px"
    lineHeight: 1.6
rounded:
  result-square: "3px"
  group: "12px"
  control: "8px"
  inset: "10px"
  panel: "14px"
  pill: "999px"
spacing:
  control-gap: "8px"
  band-gap: "10px"
  panel-gap: "12px"
  page-gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ui-action}"
    textColor: "{colors.ui-action-label}"
    rounded: "{rounded.control}"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.ui-action-hover}"
  input-search:
    backgroundColor: "{colors.ui-raised}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.ui-panel}"
    rounded: "{rounded.panel}"
  match-brief:
    backgroundColor: "{colors.ui-raised}"
    textColor: "{colors.ui-ink-3}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 9px"
  match-square-win:
    backgroundColor: "{colors.result-win-dot}"
    rounded: "{rounded.result-square}"
    size: "14px"
  match-square-loss:
    backgroundColor: "{colors.result-loss-dot}"
    rounded: "{rounded.result-square}"
    size: "14px"
  match-square-empty:
    backgroundColor: "{colors.ui-panel-header}"
    rounded: "{rounded.result-square}"
    size: "14px"
  theme-switch:
    backgroundColor: "{colors.ui-page}"
    rounded: "{rounded.pill}"
    width: "132px"
    height: "56px"
  beta-download-disabled:
    backgroundColor: "{colors.ui-panel-header}"
    textColor: "{colors.ui-ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: Dragapultist

## Overview

The supplied Claude HTML and September 24 UI frontend redesign establish the compact Pokémon match field and practical round review. The October 1 Figma revision adds grouped List history, a charcoal dark palette, full-body pixel sprites, and Pokémon settings/help controls within that existing composition. Cool-blue light surfaces and restrained outcome colors remain; import, review, account actions, tab layouts, and tool navigation retain their existing behavior. This document records the approved implementation without introducing product claims.

Sources: `docs/design/claude-handoff.md`; supplied `Dragapultist - Redesign.dc.html` and `/Users/admin/Downloads/UI frontend redesign.zip`; `app/globals.css`; `components/design-handoff.css`, `components/game-list.css`, `components/game-review.css`, and `components/site-footer.css` (footer); `app/layout.tsx`; `components/auth/auth-header.tsx`; `components/game-list.tsx`, `components/game-detail.tsx`, `components/pokemon-tcg-analyzer.tsx`, `components/top-deck-calc-panel.tsx`, and `components/sample-hand-lab.tsx`; and `lib/game-persistence.ts`. Additional October 1 sources: the supplied `Revamp color scheme (1).zip` extracted to `/private/tmp/dragapultist-figma-revamp`; `components/appearance-settings.tsx`, `components/appearance-settings.css`, `components/header-pokemon-icon.tsx`, `components/match-history-list.tsx`, `components/archetype-icon-pair.tsx`, `components/match-sprite.tsx`, `utils/pokeapi-sprites.ts`, and `utils/local-pixel-sprites.json`. PRODUCT.md is absent. The Figma revision adds unchanged supplied header artwork and 14 supplied Pokémon sprites, plus matching cached front sprites for built-in archetypes (77 local Pokémon images total). All Pokémon display surfaces use still front sprites; uncached Pokémon use the matching remote front PNG and unavailable images use the neutral substitute. Miniature game icons, artwork, and animated sprite fallbacks are excluded. Saved identities and unknown assignments are preserved. Asset provenance, checksums, screenshots, and local verification are recorded in `docs/validation/2026-10-01-figma-revamp/VALIDATION.md` and its adjacent files. This revision has local browser/build verification only; no push, deployment, real-account sync, native Windows/Mac runtime, or live installer download was verified.

## Colors

The frontmatter records the light theme's normative `--ui-*` and `--result-*` palette, with `dark-*` entries recording the corresponding `.dark` overrides. Action and action-hover provide primary emphasis; link colors identify interactive text. Page, chrome, panel, panel-header, and raised distinguish nested surfaces. Border variants divide panels, chrome, and evidence columns; ink levels establish text hierarchy. Win and loss backgrounds, text, and dots encode outcomes alongside textual status. Fresh marks identify newly acknowledged imports; warning tokens distinguish clipboard, validation, and save feedback.

Dark mode uses the same semantic CSS tokens with the `.dark` overrides in `app/globals.css`; the frontmatter’s `dark-` prefix identifies that variant rather than a second CSS token. Charcoal page and panel surfaces, pale ink, and brighter links carry the Figma dark treatment across existing tabs. Win/loss dots have distinct light and dark values and also color the List squares. List and appearance-settings secondary text uses `ui-ink-2` in light mode and `ui-ink-3` in dark mode. Use semantic tokens rather than hardcoded light colors.

## Typography

Geist Sans is the body face; Montserrat is applied to header chrome. Search, primary controls, and round evidence use compact body text. Review headings and metric figures use semibold emphasis; metrics and briefs use tabular numerals. Uppercase labels use the label role. Import and raw-log text use a monospace stack. These are observed roles, not a new global size scale.

## Layout

The centered shell and footer cap at 1280px with 16px side gutters. Header utilities precede horizontally scrollable navigation. Search, computed metrics, sorting, and import share one wrapping band. Opening import expands its section across the band.

Match history retains its horizontally scrolling sprite filter rail and adds a compact List / Constellation selector. Constellation remains the default and uses a measured three-to-six-column field. At viewport widths of 720px and above, columns are 104px wide with 112px rows and 14px gaps. Below 720px, columns are 72px wide with 96px rows and 8px gaps. ResizeObserver selects the column count from available field width. Match buttons remain 64px with 50px sprites. Below 720px, search, metrics, and actions take full rows, import wraps, and the footer stacks.

List uses grouped deck rows and a 296px preview column at 1024px and above. Each row pairs a 130px deck summary with wrapping 14px result squares, 5px square gaps, and a 375px maximum square-grid width. Below 1024px, the preview becomes a dismissible fixed bottom panel with 16px edge insets and a 60dvh maximum height. Below 720px, deck summaries narrow to 76px; row padding and gaps become 12px; squares become 16px with 8px gaps. The settings dialog is capped at 440px wide and 85dvh high, with scrolling content and 16px outer gutters.

Round review uses three columns at 1024px and above: 148px navigation, flexible evidence, and 224px notes. From 720px through 1023px it uses two columns, with notes below evidence and navigation spanning both rows. Below 720px, navigation, evidence, and notes stack; round selection becomes a horizontal strip. Paired player evidence remains two columns at every width. Gaps are 12px. These layout boundaries are viewport queries.

Player and odds workspaces use side-by-side columns from 720px and stack below it. Sample Lab stacks below 1024px; its hand uses seven columns from 720px and four below. Deck Lab settings, canvas, deck input, tabletop, and statistics use the shared panel shell and pale header treatment.

## Elevation & Depth

Blue borders and tonal surfaces establish structure. The small ambient shadow supports inset panels; the lift shadow supports main panels; the brief shadow separates floating match summaries. Exact shadow values and motion metadata live in the sidecar and source CSS. Avoid adding new elevation levels.

## Shapes

Controls use the control radius, inset editors and metrics use the inset radius, and major panels use the panel radius. Briefs and the appearance switch are pills; Constellation matches use circular silhouettes. List results use compact rounded squares, with 12px rounded grouped rows. Preserve pixelated rendering and contain-fit artwork.

## Components

- **Header and appearance:** Klink opens Settings; Unown retains the existing help action. Supplied regular artwork appears in light mode and shiny artwork in dark mode, with generic labeled control icons if an image fails. The dialog contains a Solrock/Lunatone switch with an accessible Dark mode switch state and a separate “Follow device appearance” checkbox. The initial default stays light; light, dark, or system preference persists automatically on the device. Theme changes use the shared semantic palette and preserve each tab’s layout. Header utility targets are 44px square; below 400px their width becomes 36px while height stays 44px.
- **Browser beta downloads:** Settings shows Windows `.exe`, Mac · Apple Silicon `.dmg`, and Mac · Intel `.dmg` choices. Public links are not ready, so all three controls remain disabled and explicitly read “Coming soon.” Only verified public HTTPS installer URLs should enable them; do not imply an installer was published. In the native wrapper, Settings instead links to the existing desktop capture settings.
- **Working band and Quick add:** searchable history, calculated metrics, sort selection, a clipboard action, and expandable manual import. Quick add shows “Adding…” while saving. Clipboard denial opens and focuses manual paste; invalid clipboard text shows a warning. A duplicate shows “Already added”; successful persistence acknowledgment shows the outcome, resets search/filter and date ordering, and briefly highlights the new match for 1800ms. Save failure retains the draft and exposes retry. Manual import preserves orientation confirmation.
- **Match field:** constellation points and filter buttons use the saved archetype's icon pair, including variant and custom selections. The field keeps local pixel sprites, frames their visible pixels to remove uneven transparent margins, and uses a slightly wider badge for paired or triple icons. Singles use 42px visible bounds, pairs use 30px icons with a 6px gap, and triples use 20px icons with a 3px gap. Filter icons use 30px visible bounds, an 8px pair gap, generous outer padding, and vertical separators between archetypes. Missing assignments show an unknown-archetype placeholder; the main attacker is not substituted. Filter buttons retain pressed semantics. A compact **Your decks / Opponent decks** toggle stays in place beside the horizontally scrolling archetype filters. It has a visible selected state and keyboard focus; switching sides clears the previous archetype filter. Sort options distinguish opponent name from opponent deck, using the same archetype labels as the field. Mouse hover or keyboard focus opens the controlled Radix brief; mouse click or keyboard activation enters review. Touch/pen first tap opens the brief, and a second tap on that match enters review. Escape, outside pointer input, blur, or mouse leave dismisses it. Briefs use a portal, zero delay, 2px bottom offset, and 8px collision padding against the history boundary. Returning from review restores match focus.
- **List history and preview:** the saved List / Constellation preference applies to the current filtered and sorted matches. List groups by the selected Your decks / Opponent decks perspective without changing saved identities; each group includes its real record and win rate. Colored squares represent matches and accessible labels include outcome, opponent, deck, rounds, and date. Empty squares are decorative unused slots, never fabricated games. Mouse hover or keyboard focus previews a match; click/tap pins it. Hovering another square temporarily previews that match, then returns to the pinned match when the pointer leaves the list. Close or Escape clears the preview and restores focus to its square without reopening it. “Open match review” enters the existing review flow, which restores the originating match’s focus on return.
- **Ghost states:** loading and genuinely empty history retain a dashed field scaffold. Loading metrics use dashes; empty and filtered-empty states provide their respective import or clear-search action. Placeholder geometry is not fabricated match data. Tool loading surfaces share the scaffold language.
- **Round review:** selected rounds retain current-step semantics, a left border on larger screens, and a bottom border on mobile. Left/Right arrows navigate rounds; Escape follows the existing back/save flow. Shortcuts ignore editable fields, dialogs, comboboxes, and modified keys. Paired evidence, notes, and raw-log disclosure retain their data. Inline tags trim and lowercase entries, prevent duplicates, add on Enter, and remove the last tag on Backspace in an empty input; remove buttons remain labeled. Teams and deck tools remain available; deletion requires confirmation.
- **Persistence:** guest history uses browser-local persistence; authenticated history uses the remote contract. Keep revision/conflict handling, server search supplementation, normalized import identity, canonical acknowledgments, and draft retention on save failure. Never imply guest data is account-synced or local frontend checks verify live account/API behavior. No live database migration or production deployment is part of this revision.
- **Motion and access:** Constellation match emphasis changes shadow, without sprite scaling; box-shadow transitions take 160ms. The hover shadow follows the visible identity, 64px wide for singles or 76px when either side has multiple icons; its button shares the same dimensions. After the brief has remained open for 450ms, two stable layers crossfade from your archetype icons to the opponent's archetype icons over 180ms. Dismissal cancels the pending timer and returns to your archetype over 120ms. Keyboard focus and touch/pen first-tap previews share this behavior. Reduced motion keeps the preview delay but swaps the icons without fading. Briefs have no entry animation. Ghost scaffolds pulse over 3.4s, reaching .55 opacity midway. List squares emphasize hover or active preview with a 1.1 scale over 120ms and a visible outline. Klink’s paired gears turn in opposite directions over 1.68s on hover, keyboard focus, activation, or while Settings is open; Unown bobs and tilts over 2.6s on hover/focus. The appearance thumb slides over 250ms. Reduced motion disables those icon animations, square scaling/transitions, and the switch transition. Keep keyboard access, visible focus, and text outcomes alongside color cues. Reduced-motion CSS was inspected, but OS emulation was unavailable during local browser verification; documentation is not an accessibility certification.

## Do's and Don'ts

- Do use semantic theme tokens and preserve the supplied composition.
- Do retain real data, save states, tool navigation, saved Pokémon identities, and the approved supplied artwork.
- Do preserve responsive reflow, keyboard access to every match, and focus after closing previews or returning from review.
- Do keep unavailable installers visibly disabled until verified public links are configured.
- Don't substitute illustrative prototype records for persisted history.
- Don't claim deployment, account persistence, or native desktop verification from local frontend checks.
- Don't add a new visual concept, dashboard rail, or invented product positioning.

### October 1 sprite follow-up

The user requested the default pixel sprite style universally. Match review, archetype thumbnails, custom Pokémon suggestions, and prize mapper now share the same still front-sprite resolver. Match review has one pencil + **Change Pokémon** action centered beneath the pair; it opens the existing metadata editor. The animation toggle and duplicate details action were removed. Header Klink/Unown motion remains as requested in the redesign.

The button follow-up adds shared danger tokens for match deletion: red-tinted default and hover surfaces, a solid red confirmation state, and a contrasting focus ring. Review toolbar actions share a 36px height; cancel/back remain neutral. Primary action colors are shared by review controls and dialogs, with stronger light-theme contrast.
