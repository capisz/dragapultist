# Archetype catalog

Source review: September 28, 2026.

The selector includes the deck families and variants in Limitless TCG's current
TEF–PBL index, plus the existing Dragapultist catalog and the older Dragapult
variants listed on its deck overview. This is a maintained snapshot, not a live
feed or a claim that every historical deck or format is covered.

## Sources

- [Deck families, all entries](https://limitlesstcg.com/decks?show=100)
- [Deck variants, all entries](https://limitlesstcg.com/decks?variants=true&show=100)
- [Dragapult's variant selector](https://limitlesstcg.com/decks/284)

Only deck names and category relationships are used. No tournament results,
decklists, card images, or player data are copied from Limitless. Sprite display
continues to use the existing Dragapultist sprite resolver.

## Added variants

| Family | Variants and source |
| --- | --- |
| Dragapult ex | [Dusknoir](https://limitlesstcg.com/decks/284?variant=3), [Blaziken](https://limitlesstcg.com/decks/284?variant=9), [Dudunsparce](https://limitlesstcg.com/decks/284?variant=12), [Pidgeot](https://limitlesstcg.com/decks/284?variant=2), [Charizard](https://limitlesstcg.com/decks/284?variant=6), [Iron Thorns](https://limitlesstcg.com/decks/284?variant=4), [Gholdengo](https://limitlesstcg.com/decks/284?variant=5), [Froslass](https://limitlesstcg.com/decks/284?variant=7), [Zoroark](https://limitlesstcg.com/decks/284?variant=8), [Noctowl](https://limitlesstcg.com/decks/284?variant=11), [LZ Box](https://limitlesstcg.com/decks/284?variant=1) |
| Alakazam Powerful Hand | [Dudunsparce](https://limitlesstcg.com/decks/350?variant=1), [Dusknoir](https://limitlesstcg.com/decks/350?variant=2) |
| Lillie's Clefairy ex | [Clefairy Ogerpon](https://limitlesstcg.com/decks/326?variant=1) |
| Mega Lucario ex | [Lucario Hariyama](https://limitlesstcg.com/decks/345?variant=1) |
| Raging Bolt ex | [Raging Bolt Ogerpon](https://limitlesstcg.com/decks/280?variant=4) |
| Marnie's Grimmsnarl ex | [Grimmsnarl Froslass](https://limitlesstcg.com/decks/329?variant=1) |
| Mega Lopunny ex | [Dusknoir](https://limitlesstcg.com/decks/353?variant=1), [Dudunsparce](https://limitlesstcg.com/decks/353?variant=2) |
| Mega Sharpedo ex | [Sharpedo Toxtricity](https://limitlesstcg.com/decks/354?variant=1) |
| Festival Lead | [Seaking Festival Lead](https://limitlesstcg.com/decks/336?variant=1) |
| Toxtricity Sinister Surge | [Toxtricity Box](https://limitlesstcg.com/decks/355?variant=1) |
| Mega Kangaskhan ex | [Kangaskhan Bouffalant](https://limitlesstcg.com/decks/348?variant=1) |
| Mega Starmie ex | [Starmie Dusknoir](https://limitlesstcg.com/decks/362?variant=1) |
| Mega Diancie ex | [Diancie Dusknoir](https://limitlesstcg.com/decks/365?variant=1) |
| Okidogi Adrena-Power | [Okidogi Barbaracle](https://limitlesstcg.com/decks/293?variant=2) |
| Mega Manectric ex | [Manectric Eelektrik](https://limitlesstcg.com/decks/349?variant=1) |

The missing families [Metagross Metal Maker](https://limitlesstcg.com/decks/361),
[Mega Manectric ex](https://limitlesstcg.com/decks/349), and
[Beedrill ex](https://limitlesstcg.com/decks/371) are also available. Existing
families retain their saved IDs; the Raging Bolt display-name typo is corrected
while its old spelling remains an alias.

## Selection and inference

- The shared selector exposes every catalog entry, with variants beside their
  family. Search accepts either Pokémon order and punctuation such as `/` or `–`.
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
- Metagross Metal Maker and Toxtricity Box are manual selections: the summary
  lacks the printing or deck-composition evidence needed to distinguish them.
- Existing saved selections and custom IDs remain valid. Nothing migrates or
  rewrites old matches. New IDs use the existing string-valued archetype fields;
  no game-persistence contract changes are needed.

## Status

The user authorized production deployment after the scrolling repair. Type
checking and the production build passed. No tests or browser/native interaction
checks were run for this change. See the [release note](releases/2026-09-28-archetype-variants.md).
