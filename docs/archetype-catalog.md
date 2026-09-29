# Archetype catalog

Source review: September 28, 2026.

The default selector and new import suggestions use only the maintained **2026
Standard** snapshot: regulation marks **H, I, and J**, with archetypes from
Limitless's **TEF–30C** family and split-variant indexes. The live index was read
with an explicit format filter on September 28, 2026; cached search results still
showed TEF–PBL. This replaces the earlier catalog that mixed current choices with
historical deck-overview variants.

The snapshot contains 37 families and 16 named variants. It is a curated
archetype list, not a live feed or a card-by-card deck-legality validator. Absence
from this list does not establish that a deck is illegal; it means that the
archetype is outside this current-format snapshot.

## Sources

- [Official Pokémon TCG Live rotation announcement](https://community.pokemon.com/en-us/discussion/23170/letter-to-the-community-march-19-2026)
- [Current deck families, explicit TEF–30C filter](https://limitlesstcg.com/decks?format=TEF-30C&show=100)
- [Current deck variants, explicit TEF–30C filter](https://limitlesstcg.com/decks?format=TEF-30C&variants=true&show=100)
- [30th Celebration release information](https://www.pokemon.com/us/news/pokemon-tcg-30th-celebration-product-showcase)

Only deck names and category relationships are used. No tournament results,
decklists, card images, or player data are copied from Limitless. Sprite display
continues to use the existing Dragapultist sprite resolver.

## Current variants

| Family | Variants and source |
| --- | --- |
| Dragapult ex | [Dusknoir](https://limitlesstcg.com/decks/284?variant=3), [Blaziken](https://limitlesstcg.com/decks/284?variant=9), [Dudunsparce](https://limitlesstcg.com/decks/284?variant=12) |
| Alakazam Powerful Hand | [Dudunsparce](https://limitlesstcg.com/decks/350?variant=1), [Dusknoir](https://limitlesstcg.com/decks/350?variant=2) |
| Lillie's Clefairy ex | [Clefairy Ogerpon](https://limitlesstcg.com/decks/326?variant=1) |
| Mega Lucario ex | [Lucario Hariyama](https://limitlesstcg.com/decks/345?variant=1) |
| Raging Bolt ex | [Raging Bolt Ogerpon](https://limitlesstcg.com/decks/280?variant=4) |
| Marnie's Grimmsnarl ex | [Grimmsnarl Froslass](https://limitlesstcg.com/decks/329?variant=1) |
| Mega Lopunny ex | [Dusknoir](https://limitlesstcg.com/decks/353?variant=1), [Dudunsparce](https://limitlesstcg.com/decks/353?variant=2) |
| Mega Sharpedo ex | [Sharpedo Toxtricity](https://limitlesstcg.com/decks/354?variant=1) |
| Festival Lead | [Seaking Festival Lead](https://limitlesstcg.com/decks/336?variant=1) |
| Toxtricity Sinister Surge | [Toxtricity Box](https://limitlesstcg.com/decks/355?variant=1) |
| Mega Starmie ex | [Starmie Froslass](https://limitlesstcg.com/decks/362?variant=2) |
| Okidogi Adrena-Power | [Okidogi Barbaracle](https://limitlesstcg.com/decks/293?variant=2) |

The current families absent from the earlier catalog are also included:
[Mew Box Memory Helix](https://limitlesstcg.com/decks/378),
[Mega Darkrai ex](https://limitlesstcg.com/decks/379), and
[Toucannon Feather Rondo](https://limitlesstcg.com/decks/380).

## Selection and inference

- `CURRENT_STANDARD_ARCHETYPE_IDS` explicitly limits the shared selector and
  new inference. The full `ARCHETYPE_RULES` registry remains available to resolve
  old saved IDs, labels, aliases, and sprites. Adding a rule to that registry does
  not automatically expose it in the current selector.
- The shared selector puts current variants beside their family. Search accepts
  either Pokémon order and punctuation such as `/` or `–`. Its placeholder names
  Standard so the format scope is visible without adding another control.
- Selected historical values still appear on the selector button, but neither
  those values nor IDs supplied by Prize Mapper can repopulate the current list
  with historical catalog entries. Existing custom selections remain supported;
  custom Pokémon combinations are not claims of Standard legality.
- The archetype popover owns its scroll lock, so the parent import/review dialog
  does not suppress wheel or touch scrolling in the portaled list. The option
  list also fits the available popup height, retaining room for its search field.
- Import and Match Review use the same selector. Choose **Edit matchup →
  Opponent's archetype → Dragapult Dusknoir** to correct an existing match.
- New import suggestions use only the Pokémon observed on each player's own
  side. Both Dragapult and Dusknoir must appear for that variant to be suggested.
- If several variants of a family fit the observed Pokémon, retain the broad
  family label. If the partner was never revealed, a broad Dragapult label does
  not establish that the deck contains no Dusknoir.
- Basic Box, Mew Box Memory Helix, Toucannon Feather Rondo, and Toxtricity Box
  require manual selection: the summary lacks the printing or deck-composition
  evidence needed to distinguish them. A Mew sighting alone cannot distinguish
  the two current Box families.
- Existing saved selections and custom IDs remain valid. Nothing migrates or
  rewrites old matches. New IDs use the existing string-valued archetype fields;
  no game-persistence contract changes are needed.
- Prize Mapper retains access to actual saved match history and its labels;
  historical entries are not offered as unused current catalog choices.

## Refreshing the snapshot

1. Confirm the current Standard regulation marks and live format on the official
   Pokémon site and Limitless. Pin the format in both source URLs.
2. Review every family and variant page of that filtered index. Do not copy the
   all-time variant menu from an individual deck overview.
3. Update `CURRENT_STANDARD_ARCHETYPE_IDS` and any missing registry entries.
   Retain excluded registry entries for saved-history compatibility.
4. Update this date and source information. Never change saved game records as
   part of a catalog refresh.

## Status

The original archetype and scrolling release is recorded in its
[release note](releases/2026-09-28-archetype-variants.md). The current-rotation
correction is recorded [separately](releases/2026-09-28-current-standard-archetypes.md).
