---
name: Dragapultist
description: Compact match history and round review from the supplied Claude handoff.
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
  ui-action: "#5e82ab"
  ui-action-hover: "#4f739d"
  ui-action-label: "#f8fafc"
  result-win-bg: "#d3f0e2"
  result-win-fg: "#216e54"
  result-win-dot: "#3f9e7b"
  result-loss-bg: "#fadde2"
  result-loss-fg: "#9c3349"
  result-loss-dot: "#c4546a"
  ui-fresh: "#8fb2d4"
  status-warn-bg: "#fdf0d8"
  status-warn-ink: "#8a5a12"
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
---

# Design System: Dragapultist

## Overview

The supplied Claude HTML and September 24 UI frontend redesign revision are the visual authority: a compact Pokémon match field followed by practical round review. Cool-blue surfaces, blue ink, pixelated sprites, and restrained outcome colors retain the existing import, history, and tool navigation model. This document records implementation; it introduces no new product claims or visual concept.

Sources: `docs/design/claude-handoff.md`; supplied `Dragapultist - Redesign.dc.html` and `/Users/admin/Downloads/UI frontend redesign.zip`; `app/globals.css`; `components/design-handoff.css`, `components/game-list.css`, `components/game-review.css`, and `components/site-footer.css` (footer); `app/layout.tsx`; `components/auth/auth-header.tsx`; `components/game-list.tsx`, `components/game-detail.tsx`, `components/pokemon-tcg-analyzer.tsx`, `components/top-deck-calc-panel.tsx`, and `components/sample-hand-lab.tsx`; and `lib/game-persistence.ts`. PRODUCT.md is absent. Existing public raster assets are reused unchanged; no raster was created or replaced for this handoff. The September 24 revision is authorized for localhost review only; a production push requires later user approval.

## Colors

The frontmatter records the light theme's normative `--ui-*` and `--result-*` palette. Action and action-hover provide primary emphasis; link colors identify interactive text. Page, chrome, panel, panel-header, and raised distinguish nested surfaces. Border variants divide panels, chrome, and evidence columns; ink levels establish text hierarchy. Win and loss backgrounds, text, and dots encode outcomes alongside textual status. Fresh marks identify newly acknowledged imports; warning tokens distinguish clipboard, validation, and save feedback.

Dark mode uses the same semantic tokens with the `.dark` overrides in `app/globals.css`; do not hardcode the light values in components. Outcome dots retain their base values in dark mode.

## Typography

Geist Sans is the body face; Montserrat is applied to header chrome. Search, primary controls, and round evidence use compact body text. Review headings and metric figures use semibold emphasis; metrics and briefs use tabular numerals. Uppercase labels use the label role. Import and raw-log text use a monospace stack. These are observed roles, not a new global size scale.

## Layout

The centered shell and footer cap at 1280px with 16px side gutters. Header utilities precede horizontally scrollable navigation. Search, computed metrics, sorting, and import share one wrapping band. Opening import expands its section across the band.

Match history uses a horizontally scrolling sprite filter rail and a measured three-to-six-column field. At viewport widths of 720px and above, columns are 104px wide with 112px rows and 14px gaps. Below 720px, columns are 72px wide with 96px rows and 8px gaps. ResizeObserver selects the column count from available field width. Match buttons remain 64px with 50px sprites. Below 720px, search, metrics, and actions take full rows, import wraps, and the footer stacks.

Round review uses three columns at 1024px and above: 148px navigation, flexible evidence, and 224px notes. From 720px through 1023px it uses two columns, with notes below evidence and navigation spanning both rows. Below 720px, navigation, evidence, and notes stack; round selection becomes a horizontal strip. Paired player evidence remains two columns at every width. Gaps are 12px. These layout boundaries are viewport queries.

Player and odds workspaces use side-by-side columns from 720px and stack below it. Sample Lab stacks below 1024px; its hand uses seven columns from 720px and four below. Deck Lab settings, canvas, deck input, tabletop, and statistics use the shared panel shell and pale header treatment.

## Elevation & Depth

Blue borders and tonal surfaces establish structure. The small ambient shadow supports inset panels; the lift shadow supports main panels; the brief shadow separates floating match summaries. Exact shadow values and motion metadata live in the sidecar and source CSS. Avoid adding new elevation levels.

## Shapes

Controls use the control radius, inset editors and metrics use the inset radius, and major panels use the panel radius. Briefs are pills; match outcomes use circular silhouettes. Preserve pixelated rendering and contain-fit artwork.

## Components

- **Working band and Quick add:** searchable history, calculated metrics, sort selection, a clipboard action, and expandable manual import. Quick add shows “Adding…” while saving. Clipboard denial opens and focuses manual paste; invalid clipboard text shows a warning. A duplicate shows “Already added”; successful persistence acknowledgment shows the outcome, resets search/filter and date ordering, and briefly highlights the new match for 1800ms. Save failure retains the draft and exposes retry. Manual import preserves orientation confirmation.
- **Match field:** filter buttons retain pressed semantics. Mouse hover or keyboard focus opens the controlled Radix brief; mouse click or keyboard activation enters review. Touch/pen first tap opens the brief, and a second tap on that match enters review. Escape, outside pointer input, blur, or mouse leave dismisses it. Briefs use a portal, zero delay, 2px bottom offset, and 8px collision padding against the history boundary. Returning from review restores match focus.
- **Ghost states:** loading and genuinely empty history retain a dashed field scaffold. Loading metrics use dashes; empty and filtered-empty states provide their respective import or clear-search action. Placeholder geometry is not fabricated match data. Tool loading surfaces share the scaffold language.
- **Round review:** selected rounds retain current-step semantics, a left border on larger screens, and a bottom border on mobile. Left/Right arrows navigate rounds; Escape follows the existing back/save flow. Shortcuts ignore editable fields, dialogs, comboboxes, and modified keys. Paired evidence, notes, and raw-log disclosure retain their data. Inline tags trim and lowercase entries, prevent duplicates, add on Enter, and remove the last tag on Backspace in an empty input; remove buttons remain labeled. Teams and deck tools remain available; deletion requires confirmation.
- **Persistence:** guest history uses browser-local persistence; authenticated history uses the remote contract. Keep revision/conflict handling, server search supplementation, normalized import identity, canonical acknowledgments, and draft retention on save failure. Never imply guest data is account-synced or local frontend checks verify live account/API behavior. No live database migration or production deployment is part of this revision.
- **Motion and access:** match emphasis changes shadow, without sprite scaling; box-shadow transitions take 160ms. The hover shadow follows the visible 64px circular identity; its button shares the same dimensions. Briefs have no entry animation. Ghost scaffolds pulse over 3.4s, reaching .55 opacity midway. Reduced-motion CSS disables affected animations and transitions. Keep keyboard access, visible focus, and text outcomes alongside color cues; documentation is not an accessibility verification report.

## Do's and Don'ts

- Do use semantic theme tokens and preserve the supplied composition.
- Do retain real data, save states, tool navigation, and existing raster artwork.
- Do preserve responsive reflow and keyboard access to every match.
- Don't substitute illustrative prototype records for persisted history.
- Don't claim deployment, account persistence, or native desktop verification from local frontend checks.
- Don't add a new visual concept, dashboard rail, or invented product positioning.
