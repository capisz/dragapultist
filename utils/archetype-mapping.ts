// utils/archetype-mapping.ts
import type { GameSummary } from "../types/game"
import {
  FALLBACK_POKEMON_SPRITE,
  formatPokemonSpriteLabel as formatPokemonSpriteLabelFromId,
  getPokemonSpriteCandidateSources,
  getPokemonSpritePrimarySource,
  normalizePokemonSpriteId,
} from "./pokeapi-sprites"

export type IconSpec =
  | string // single sprite file, e.g. "gardevoir.png"
  | { candidates: string[] } // try in order, e.g. ["ogerpon.png", "ogerpon-wellspring.png"]

export interface ArchetypeRule {
  id: string
  label: string
  mustInclude: string[]
  variantOf?: string
  autoDetect?: boolean
  sprite?: string
  aliases?: string[]
  iconSpecs?: IconSpec[] // enables 2-icon (or 3-icon) archetypes
}

const CUSTOM_ARCHETYPE_PREFIX = "custom:"

interface CustomArchetypeSpec {
  firstPokemonId: string
  secondPokemonId: string | null
}

// Sprite IDs resolve through PokeAPI first, then local /public/sprites fallbacks.
const BASE_ARCHETYPE_RULES: ArchetypeRule[] = [
  // A Mew sighting cannot distinguish Basic Box from the current Memory Helix deck.
  { id: "basic-box", label: "Basic Box", mustInclude: ["mew"], autoDetect: false, iconSpecs: ["mew.png", "latias.png"], sprite: "mew.png", aliases: ["Basic Box"] },
  {
    id: "dragapult-ex",
    label: "Dragapult ex",
    mustInclude: ["dragapult"],
    iconSpecs: ["dragapult.png"],
    sprite: "dragapult.png",
    aliases: ["Dragapult ex", "Dragapult"],
  },
  {
    id: "raging-bolt-ex",
    label: "Raging Bolt ex",
    mustInclude: ["raging bolt"],
    iconSpecs: ["raging-bolt.png"],
    sprite: "raging-bolt.png",
    aliases: ["Raging Boltex", "Raging Bolt ex", "Raging Bolt"],
  },
  {
    id: "alakazam-powerful-hand",
    label: "Alakazam Powerful Hand",
    mustInclude: ["alakazam"],
    iconSpecs: ["alakazam.png"],
    sprite: "alakazam.png",
    aliases: ["Alakazam Powerful Hand", "Alakazam"],
  },
  {
    id: "festival-lead",
    label: "Festival Lead",
    mustInclude: ["dipplin"],
    iconSpecs: ["dipplin.png", "thwackey.png"],
    sprite: "dipplin.png",
    aliases: ["Festival Lead", "Dipplin Festival Lead"],
  },
  {
    id: "rockets-mewtwo-ex",
    label: "Rocket's Mewtwo ex",
    mustInclude: ["mewtwo"],
    iconSpecs: ["mewtwo.png", "spidops.png"],
    sprite: "mewtwo.png",
    aliases: ["Rocket's Mewtwo ex", "Rockets Mewtwo ex"],
  },
  {
    id: "mega-lopunny-ex",
    label: "Mega Lopunny ex",
    mustInclude: ["lopunny", "mega"],
    iconSpecs: ["lopunny-mega.png"],
    sprite: "lopunny-mega.png",
    aliases: ["Mega Lopunny ex"],
  },
  { id: "mega-excadrill-ex", label: "Mega Excadrill ex", mustInclude: ["excadrill", "mega"], iconSpecs: ["excadrill.png"], sprite: "excadrill.png", aliases: ["Mega Excadrill ex"] },
  { id: "dhelmise-hide-n-sneak", label: "Dhelmise Hide n' Sneak", mustInclude: ["dhelmise"], iconSpecs: ["dhelmise.png"], sprite: "dhelmise.png", aliases: ["Dhelmise", "Dhelmise Hide n' Sneak"] },
  { id: "mega-greninja-ex", label: "Mega Greninja ex", mustInclude: ["greninja", "mega"], iconSpecs: ["greninja.png"], sprite: "greninja.png", aliases: ["Mega Greninja ex"] },
  { id: "mega-chandelure-ex", label: "Mega Chandelure ex", mustInclude: ["chandelure", "mega"], iconSpecs: ["chandelure.png"], sprite: "chandelure.png", aliases: ["Mega Chandelure ex"] },
  {
    id: "ogerpon-meganium",
    label: "Ogerpon / Meganium",
    mustInclude: ["ogerpon", "meganium"],
    iconSpecs: [
      { candidates: ["ogerpon.png", "ogerpon-wellspring.png", "ogerpon-hearthflame.png", "ogerpon-cornerstone.png"] },
      "meganium.png",
    ],
    sprite: "ogerpon.png",
    aliases: ["Ogerpon Meganium", "Ogerpon / Meganium"],
  },
  {
    id: "tera-box",
    label: "Tera Box",
    mustInclude: ["noctowl", "ogerpon"],
    iconSpecs: [
      "noctowl.png",
      { candidates: ["ogerpon-wellspring.png", "ogerpon.png", "ogerpon-hearthflame.png", "ogerpon-cornerstone.png"] },
    ],
    sprite: "noctowl.png",
    aliases: ["Tera Box", "Noctowl Ogerpon", "Noctowl / Ogerpon"],
  },
  {
    id: "ogerpon-box",
    label: "Ogerpon Box",
    mustInclude: ["ogerpon"],
    iconSpecs: [{ candidates: ["ogerpon.png", "ogerpon-wellspring.png", "ogerpon-hearthflame.png", "ogerpon-cornerstone.png"] }],
    sprite: "ogerpon.png",
    aliases: ["Ogerpon Box"],
  },
  {
    id: "crustle-mysterious-rock-inn",
    label: "Crustle Mysterious Rock Inn",
    mustInclude: ["crustle"],
    iconSpecs: ["crustle.png"],
    sprite: "crustle.png",
    aliases: ["Crustle", "Crustle Mysterious Rock Inn"],
  },
  {
    id: "hydrapple-ex",
    label: "Hydrapple ex",
    mustInclude: ["hydrapple"],
    iconSpecs: ["hydrapple.png"],
    sprite: "hydrapple.png",
    aliases: ["Hydrapple ex", "Hydrapple"],
  },
  {
    id: "cynthias-garchomp-ex",
    label: "Cynthia's Garchomp ex",
    mustInclude: ["garchomp"],
    iconSpecs: ["garchomp.png"],
    sprite: "garchomp.png",
    aliases: ["Cynthia's Garchomp ex", "Cynthias Garchomp ex"],
  },
  {
    id: "n-zoroark-ex",
    label: "N's Zoroark ex",
    mustInclude: ["zoroark"],
    iconSpecs: ["zoroark.png"],
    sprite: "zoroark.png",
    aliases: ["N's Zoroark ex", "Ns Zoroark ex"],
  },
  {
    id: "mega-lucario-ex",
    label: "Mega Lucario ex",
    mustInclude: ["lucario", "mega"],
    iconSpecs: ["lucario-mega.png"],
    sprite: "lucario-mega.png",
    aliases: ["Mega Lucario ex"],
  },
  {
    id: "rockets-honchkrow",
    label: "Rocket's Honchkrow",
    mustInclude: ["honchkrow"],
    iconSpecs: ["honchkrow.png", "porygon2.png"],
    sprite: "honchkrow.png",
    aliases: ["Rocket's Honchkrow", "Rockets Honchkrow"],
  },
  {
    id: "mega-starmie-ex",
    label: "Mega Starmie ex",
    mustInclude: ["starmie", "mega"],
    iconSpecs: ["starmie-mega.png"],
    sprite: "starmie-mega.png",
    aliases: ["Mega Starmie ex"],
  },
  {
    id: "slowking-seek-inspiration",
    label: "Slowking Seek Inspiration",
    mustInclude: ["slowking"],
    iconSpecs: ["slowking.png"],
    sprite: "slowking.png",
    aliases: ["Slowking", "Slowking Seek Inspiration"],
  },
  {
    id: "lillies-clefairy-ex",
    label: "Lillie's Clefairy ex",
    mustInclude: ["clefairy"],
    iconSpecs: ["clefairy.png"],
    sprite: "clefairy.png",
    aliases: ["Lillie's Clefairy ex", "Lillies Clefairy ex"],
  },
  {
    id: "marnies-grimmsnarl-ex",
    label: "Marnie’s Grimmsnarl ex",
    mustInclude: ["grimmsnarl"],
    iconSpecs: ["grimmsnarl.png"],
    sprite: "grimmsnarl.png",
    aliases: ["Marnie’s Grimmsnarl ex", "Marnies Grimmsnarl ex"],
  },
  {
    id: "okidogi-adrena-power",
    label: "Okidogi Adrena-Power",
    mustInclude: ["okidogi"],
    iconSpecs: ["okidogi.png"],
    sprite: "okidogi.png",
    aliases: ["Okidogi", "Okidogi Adrena-Power", "Okidogi Adrena Power"],
  },
  {
    id: "greninja-ex",
    label: "Greninja ex",
    mustInclude: ["greninja"],
    iconSpecs: ["greninja.png"],
    sprite: "greninja.png",
    aliases: ["Greninja ex", "Greninja"],
  },
  {
    id: "mega-absol-box",
    label: "Mega Absol Box",
    mustInclude: ["absol"],
    iconSpecs: ["absol-mega.png", "kangaskhan-mega.png"],
    sprite: "absol-mega.png",
    aliases: ["Mega Absol Box", "Mega Absol"],
  },
  {
    id: "mega-kangaskhan-ex",
    label: "Mega Kangaskhan ex",
    mustInclude: ["kangaskhan", "mega"],
    iconSpecs: ["kangaskhan-mega.png"],
    sprite: "kangaskhan-mega.png",
    aliases: ["Mega Kangaskhan ex"],
  },
  {
    id: "mega-diancie-ex",
    label: "Mega Diancie ex",
    mustInclude: ["diancie", "mega"],
    iconSpecs: ["diancie-mega.png"],
    sprite: "diancie-mega.png",
    aliases: ["Mega Diancie ex"],
  },
  {
    id: "hops-trevenant",
    label: "Hop's Trevenant",
    mustInclude: ["trevenant"],
    iconSpecs: ["trevenant.png"],
    sprite: "trevenant.png",
    aliases: ["Hop's Trevenant", "Hops Trevenant"],
  },
  {
    id: "ethans-typhlosion",
    label: "Ethan's Typhlosion",
    mustInclude: ["typhlosion"],
    iconSpecs: ["typhlosion.png"],
    sprite: "typhlosion.png",
    aliases: ["Ethan's Typhlosion", "Ethans Typhlosion"],
  },
  {
    id: "bloodmoon-ursaluna-mad-bite",
    label: "Bloodmoon Ursaluna Mad Bite",
    mustInclude: ["ursaluna"],
    iconSpecs: ["ursaluna-bloodmoon.png"],
    sprite: "ursaluna-bloodmoon.png",
    aliases: ["Bloodmoon Ursaluna Mad Bite", "Bloodmoon Ursaluna", "Ursaluna Mad Bite"],
  },
  {
    id: "toxtricity-sinister-surge",
    label: "Toxtricity Sinister Surge",
    mustInclude: ["toxtricity"],
    iconSpecs: [{ candidates: ["toxtricity.png", "toxtricity-amped.png", "toxtricity-low-key.png"] }],
    sprite: "toxtricity.png",
    aliases: ["Toxtricity", "Toxtricity Sinister Surge"],
  },
  {
    id: "yanmega-ex",
    label: "Yanmega ex",
    mustInclude: ["yanmega"],
    iconSpecs: ["yanmega.png"],
    sprite: "yanmega.png",
    aliases: ["Yanmega ex", "Yanmega"],
  },
  {
    id: "stevens-metagross-ex",
    label: "Steven's Metagross ex",
    mustInclude: ["metagross"],
    iconSpecs: ["metagross.png"],
    sprite: "metagross.png",
    aliases: ["Steven's Metagross ex", "Stevens Metagross ex"],
  },
  {
    id: "archaludon-ex",
    label: "Archaludon ex",
    mustInclude: ["archaludon"],
    iconSpecs: ["archaludon.png"],
    sprite: "archaludon.png",
    aliases: ["Archaludon ex", "Archaludon"],
  },
  {
    id: "flareon-ex",
    label: "Flareon ex",
    mustInclude: ["flareon"],
    iconSpecs: ["flareon.png"],
    sprite: "flareon.png",
    aliases: ["Flareon ex", "Flareon"],
  },
  {
    id: "froslass-munkidori",
    label: "Froslass / Munkidori",
    mustInclude: ["froslass", "munkidori"],
    iconSpecs: ["froslass.png", "munkidori.png"],
    sprite: "froslass.png",
    aliases: ["Froslass Munkidori", "Froslass / Munkidori"],
  },
  {
    id: "ceruledge-ex",
    label: "Ceruledge ex",
    mustInclude: ["ceruledge"],
    iconSpecs: ["ceruledge.png"],
    sprite: "ceruledge.png",
    aliases: ["Ceruledge ex", "Ceruledge"],
  },
  {
    id: "rockets-spidops",
    label: "Rocket's Spidops",
    mustInclude: ["spidops"],
    iconSpecs: ["spidops.png"],
    sprite: "spidops.png",
    aliases: ["Rocket's Spidops", "Rockets Spidops"],
  },
  {
    id: "mega-venusaur-ex",
    label: "Mega Venusaur ex",
    mustInclude: ["venusaur", "mega"],
    iconSpecs: ["venusaur-mega.png"],
    sprite: "venusaur-mega.png",
    aliases: ["Mega Venusaur ex"],
  },
  {
    id: "mega-sharpedo-ex",
    label: "Mega Sharpedo ex",
    mustInclude: ["sharpedo", "mega"],
    iconSpecs: ["sharpedo-mega.png"],
    sprite: "sharpedo-mega.png",
    aliases: ["Mega Sharpedo ex"],
  },
  {
    id: "mega-froslass-ex",
    label: "Mega Froslass ex",
    mustInclude: ["froslass", "mega"],
    iconSpecs: ["froslass-mega.png"],
    sprite: "froslass-mega.png",
    aliases: ["Mega Froslass ex"],
  },
  {
    id: "mega-gardevoir-ex",
    label: "Mega Gardevoir ex",
    mustInclude: ["gardevoir", "mega"],
    iconSpecs: ["gardevoir-mega.png"],
    sprite: "gardevoir-mega.png",
    aliases: ["Mega Gardevoir ex"],
  },
  {
    id: "metagross-metal-maker",
    label: "Metagross Metal Maker",
    mustInclude: ["metagross"],
    // The summary does not retain card numbers/abilities to distinguish this printing.
    autoDetect: false,
    iconSpecs: ["metagross.png"],
    sprite: "metagross.png",
    aliases: ["Metal Maker Metagross"],
  },
  {
    id: "mega-manectric-ex",
    label: "Mega Manectric ex",
    mustInclude: ["mega manectric"],
    iconSpecs: ["manectric-mega.png"],
    sprite: "manectric-mega.png",
  },
  {
    id: "beedrill-ex",
    label: "Beedrill ex",
    mustInclude: ["beedrill ex"],
    iconSpecs: ["beedrill.png"],
    sprite: "beedrill.png",
  },
  {
    id: "mew-box-memory-helix",
    label: "Mew Box Memory Helix",
    mustInclude: ["mew"],
    autoDetect: false,
    iconSpecs: ["mew.png"],
    sprite: "mew.png",
    aliases: ["Memory Helix Mew", "Mew Box"],
  },
  {
    id: "mega-darkrai-ex",
    label: "Mega Darkrai ex",
    mustInclude: ["mega darkrai"],
    iconSpecs: [{ candidates: ["darkrai-mega.png", "darkrai.png"] }],
    sprite: "darkrai.png",
  },
  {
    id: "toucannon-feather-rondo",
    label: "Toucannon Feather Rondo",
    mustInclude: ["toucannon"],
    autoDetect: false,
    iconSpecs: ["toucannon.png"],
    sprite: "toucannon.png",
    aliases: ["Feather Rondo Toucannon"],
  },
]

// Keep historical rules for saved labels and icons. Selection and new inference
// are restricted separately to the current Standard snapshot below.
const ARCHETYPE_VARIANT_RULES: ArchetypeRule[] = [
  {
    id: "dragapult-dusknoir", label: "Dragapult Dusknoir", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "dusknoir"],
    iconSpecs: ["dragapult.png", "dusknoir.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Dusknoir", "PultNoir"],
  },
  {
    id: "dragapult-blaziken", label: "Dragapult Blaziken", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "blaziken"],
    iconSpecs: ["dragapult.png", "blaziken.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Blaziken"],
  },
  {
    id: "dragapult-dudunsparce", label: "Dragapult Dudunsparce", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "dudunsparce"],
    iconSpecs: ["dragapult.png", "dudunsparce.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Dudunsparce", "Pult Dudun"],
  },
  {
    id: "dragapult-pidgeot", label: "Dragapult Pidgeot", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "pidgeot"],
    iconSpecs: ["dragapult.png", "pidgeot.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Pidgeot ex", "Pidge Pult"],
  },
  {
    id: "dragapult-charizard", label: "Dragapult Charizard", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "charizard"],
    iconSpecs: ["dragapult.png", "charizard.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Charizard ex", "PultZard"],
  },
  {
    id: "dragapult-iron-thorns", label: "Dragapult Iron Thorns", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "iron thorns"],
    iconSpecs: ["dragapult.png", "iron-thorns.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Iron Thorns ex"],
  },
  {
    id: "dragapult-gholdengo", label: "Dragapult Gholdengo", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "gholdengo"],
    iconSpecs: ["dragapult.png", "gholdengo.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Gholdengo ex"],
  },
  {
    id: "dragapult-froslass", label: "Dragapult Froslass", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "froslass"],
    iconSpecs: ["dragapult.png", "froslass.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Froslass"],
  },
  {
    id: "dragapult-zoroark", label: "Dragapult Zoroark", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "zoroark"],
    iconSpecs: ["dragapult.png", "zoroark.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / N's Zoroark ex"],
  },
  {
    id: "dragapult-noctowl", label: "Dragapult Noctowl", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "noctowl"],
    iconSpecs: ["dragapult.png", "noctowl.png"], sprite: "dragapult.png",
    aliases: ["Dragapult ex / Noctowl"],
  },
  {
    id: "dragapult-lz-box", label: "Dragapult LZ Box", variantOf: "dragapult-ex",
    mustInclude: ["dragapult", "comfey"],
    iconSpecs: ["dragapult.png", "comfey.png"], sprite: "dragapult.png",
    aliases: ["Dragapult Lost Zone Box", "Dragapult Lost Box"],
  },
  {
    id: "alakazam-dudunsparce", label: "Alakazam Dudunsparce", variantOf: "alakazam-powerful-hand",
    mustInclude: ["alakazam", "dudunsparce"],
    iconSpecs: ["alakazam.png", "dudunsparce.png"], sprite: "alakazam.png",
  },
  {
    id: "alakazam-dusknoir", label: "Alakazam Dusknoir", variantOf: "alakazam-powerful-hand",
    mustInclude: ["alakazam", "dusknoir"],
    iconSpecs: ["alakazam.png", "dusknoir.png"], sprite: "alakazam.png",
  },
  {
    id: "clefairy-ogerpon", label: "Clefairy Ogerpon", variantOf: "lillies-clefairy-ex",
    mustInclude: ["clefairy", "ogerpon"],
    iconSpecs: ["clefairy.png", "ogerpon.png"], sprite: "clefairy.png",
    aliases: ["Lillie's Clefairy ex / Teal Mask Ogerpon ex"],
  },
  {
    id: "lucario-hariyama", label: "Lucario Hariyama", variantOf: "mega-lucario-ex",
    mustInclude: ["mega lucario", "hariyama"],
    iconSpecs: ["lucario-mega.png", "hariyama.png"], sprite: "lucario-mega.png",
    aliases: ["Mega Lucario ex / Hariyama"],
  },
  {
    id: "raging-bolt-ogerpon", label: "Raging Bolt Ogerpon", variantOf: "raging-bolt-ex",
    mustInclude: ["raging bolt", "ogerpon"],
    iconSpecs: ["raging-bolt.png", "ogerpon.png"], sprite: "raging-bolt.png",
    aliases: ["Raging Bolt ex / Teal Mask Ogerpon ex"],
  },
  {
    id: "grimmsnarl-froslass", label: "Grimmsnarl Froslass", variantOf: "marnies-grimmsnarl-ex",
    mustInclude: ["grimmsnarl", "froslass"],
    iconSpecs: ["grimmsnarl.png", "froslass.png"], sprite: "grimmsnarl.png",
    aliases: ["Marnie's Grimmsnarl ex / Froslass"],
  },
  {
    id: "lopunny-dusknoir", label: "Lopunny Dusknoir", variantOf: "mega-lopunny-ex",
    mustInclude: ["mega lopunny", "dusknoir"],
    iconSpecs: ["lopunny-mega.png", "dusknoir.png"], sprite: "lopunny-mega.png",
    aliases: ["Mega Lopunny ex / Dusknoir"],
  },
  {
    id: "lopunny-dudunsparce", label: "Lopunny Dudunsparce", variantOf: "mega-lopunny-ex",
    mustInclude: ["mega lopunny", "dudunsparce"],
    iconSpecs: ["lopunny-mega.png", "dudunsparce.png"], sprite: "lopunny-mega.png",
    aliases: ["Mega Lopunny ex / Dudunsparce"],
  },
  {
    id: "sharpedo-toxtricity", label: "Sharpedo Toxtricity", variantOf: "mega-sharpedo-ex",
    mustInclude: ["mega sharpedo", "toxtricity"],
    iconSpecs: ["sharpedo-mega.png", "toxtricity.png"], sprite: "sharpedo-mega.png",
    aliases: ["Mega Sharpedo ex / Toxtricity"],
  },
  {
    id: "seaking-festival-lead", label: "Seaking Festival Lead", variantOf: "festival-lead",
    mustInclude: ["seaking", "thwackey"],
    iconSpecs: ["seaking.png", "thwackey.png"], sprite: "seaking.png",
    aliases: ["Seaking Thwackey", "Seaking Dipplin"],
  },
  {
    id: "toxtricity-box", label: "Toxtricity Box", variantOf: "toxtricity-sinister-surge",
    mustInclude: ["toxtricity"],
    // A box classification depends on the wider deck composition, not one sighting.
    autoDetect: false,
    iconSpecs: ["toxtricity.png", "absol-mega.png"], sprite: "toxtricity.png",
    aliases: ["Toxtricity Mega Absol Box"],
  },
  {
    id: "kangaskhan-bouffalant", label: "Kangaskhan Bouffalant", variantOf: "mega-kangaskhan-ex",
    mustInclude: ["mega kangaskhan", "bouffalant"],
    iconSpecs: ["kangaskhan-mega.png", "bouffalant.png"], sprite: "kangaskhan-mega.png",
    aliases: ["Mega Kangaskhan ex / Bouffalant"],
  },
  {
    id: "starmie-dusknoir", label: "Starmie Dusknoir", variantOf: "mega-starmie-ex",
    mustInclude: ["mega starmie", "dusknoir"],
    iconSpecs: ["starmie-mega.png", "dusknoir.png"], sprite: "starmie-mega.png",
    aliases: ["Mega Starmie ex / Dusknoir"],
  },
  {
    id: "starmie-froslass", label: "Starmie Froslass", variantOf: "mega-starmie-ex",
    mustInclude: ["mega starmie", "froslass"],
    iconSpecs: ["starmie-mega.png", "froslass.png"], sprite: "starmie-mega.png",
    aliases: ["Mega Starmie ex / Froslass"],
  },
  {
    id: "diancie-dusknoir", label: "Diancie Dusknoir", variantOf: "mega-diancie-ex",
    mustInclude: ["mega diancie", "dusknoir"],
    iconSpecs: ["diancie-mega.png", "dusknoir.png"], sprite: "diancie-mega.png",
    aliases: ["Mega Diancie ex / Dusknoir"],
  },
  {
    id: "okidogi-barbaracle", label: "Okidogi Barbaracle", variantOf: "okidogi-adrena-power",
    mustInclude: ["okidogi", "barbaracle"],
    iconSpecs: ["okidogi.png", "barbaracle.png"], sprite: "okidogi.png",
    aliases: ["Okidogi Adrena-Power / Barbaracle"],
  },
  {
    id: "manectric-eelektrik", label: "Manectric Eelektrik", variantOf: "mega-manectric-ex",
    mustInclude: ["mega manectric", "eelektrik"],
    iconSpecs: ["manectric-mega.png", "eelektrik.png"], sprite: "manectric-mega.png",
    aliases: ["Mega Manectric ex / Eelektrik"],
  },
]

export const ARCHETYPE_RULES: ArchetypeRule[] = BASE_ARCHETYPE_RULES.flatMap((base) => [
  base,
  ...ARCHETYPE_VARIANT_RULES.filter((variant) => variant.variantOf === base.id),
])

// 2026 Standard (H/I/J), reviewed 2026-09-28 against Limitless's TEF-30C
// family and split-variant indexes. This is an explicit snapshot: adding a
// historical rule above must never make it a current choice automatically.
// Sources and refresh instructions: docs/archetype-catalog.md.
const CURRENT_STANDARD_ARCHETYPE_IDS = new Set<string>([
  "dragapult-ex", "dragapult-dusknoir", "dragapult-blaziken", "dragapult-dudunsparce",
  "slowking-seek-inspiration",
  "basic-box",
  "n-zoroark-ex",
  "festival-lead", "seaking-festival-lead",
  "alakazam-powerful-hand", "alakazam-dudunsparce", "alakazam-dusknoir",
  "mega-lopunny-ex", "lopunny-dusknoir", "lopunny-dudunsparce",
  "hydrapple-ex",
  "crustle-mysterious-rock-inn",
  "mega-excadrill-ex",
  "mega-lucario-ex", "lucario-hariyama",
  "dhelmise-hide-n-sneak",
  "rockets-honchkrow",
  "cynthias-garchomp-ex",
  "mega-sharpedo-ex", "sharpedo-toxtricity",
  "lillies-clefairy-ex", "clefairy-ogerpon",
  "hops-trevenant",
  "marnies-grimmsnarl-ex", "grimmsnarl-froslass",
  "ogerpon-meganium",
  "raging-bolt-ex", "raging-bolt-ogerpon",
  "mew-box-memory-helix",
  "ethans-typhlosion",
  "toxtricity-sinister-surge", "toxtricity-box",
  "greninja-ex",
  "beedrill-ex",
  "mega-absol-box",
  "tera-box",
  "mega-greninja-ex",
  "mega-starmie-ex", "starmie-froslass",
  "rockets-mewtwo-ex",
  "mega-chandelure-ex",
  "okidogi-adrena-power", "okidogi-barbaracle",
  "ceruledge-ex",
  "mega-venusaur-ex",
  "stevens-metagross-ex",
  "mega-darkrai-ex",
  "toucannon-feather-rondo",
])

const PREFERRED_ARCHETYPE_ORDER = [
  "dragapult-ex", "basic-box", "alakazam-powerful-hand", "n-zoroark-ex", "slowking-seek-inspiration", "mega-excadrill-ex", "festival-lead", "lillies-clefairy-ex", "crustle-mysterious-rock-inn", "raging-bolt-ex", "marnies-grimmsnarl-ex", "mega-lopunny-ex", "mega-lucario-ex", "dhelmise-hide-n-sneak", "hydrapple-ex", "toxtricity-sinister-surge", "mega-absol-box", "greninja-ex", "cynthias-garchomp-ex", "mega-sharpedo-ex", "mega-greninja-ex", "rockets-mewtwo-ex", "mega-venusaur-ex", "mega-kangaskhan-ex", "mega-chandelure-ex",
] as const

// Preserve the familiar family order and keep current variants by their family.
export const AVAILABLE_ARCHETYPE_IDS: string[] = [
  ...new Set<string>([...PREFERRED_ARCHETYPE_ORDER, ...BASE_ARCHETYPE_RULES.map((rule) => rule.id)]),
].flatMap((id) => [id, ...ARCHETYPE_VARIANT_RULES.filter((rule) => rule.variantOf === id).map((rule) => rule.id)])
  .filter((id) => CURRENT_STANDARD_ARCHETYPE_IDS.has(id))

export function isCurrentStandardArchetype(value?: string | null): boolean {
  const id = canonicalizeArchetypeId(value)
  return id !== null && CURRENT_STANDARD_ARCHETYPE_IDS.has(id)
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function matchesArchetypeSearch(value: string, search: string, keywords: string[] = []): boolean {
  const text = normalizeText([value, ...keywords].join(" "))
  return normalizeText(search).split(" ").every((token) => text.includes(token))
}

function slugify(input: string): string {
  return normalizeText(input).replace(/\s+/g, "-")
}

function normalizeSpriteId(value: string): string {
  return normalizePokemonSpriteId(value)
}

export function formatPokemonSpriteLabel(spriteId: string): string {
  return formatPokemonSpriteLabelFromId(spriteId)
}

export function parseCustomArchetypeId(value?: string | null): CustomArchetypeSpec | null {
  if (!value) return null
  const raw = value.trim().toLowerCase()
  if (!raw.startsWith(CUSTOM_ARCHETYPE_PREFIX)) return null

  const payload = raw.slice(CUSTOM_ARCHETYPE_PREFIX.length)
  if (!payload) return null

  const [firstRaw, secondRaw] = payload.split("+", 2)
  const firstPokemonId = normalizeSpriteId(firstRaw ?? "")
  const secondPokemonId = normalizeSpriteId(secondRaw ?? "")

  if (!firstPokemonId) return null

  return {
    firstPokemonId,
    secondPokemonId: secondPokemonId || null,
  }
}

export function buildCustomArchetypeId(firstPokemonId: string, secondPokemonId?: string | null): string | null {
  const first = normalizeSpriteId(firstPokemonId)
  if (!first) return null

  const second = normalizeSpriteId(secondPokemonId ?? "")
  return second ? `${CUSTOM_ARCHETYPE_PREFIX}${first}+${second}` : `${CUSTOM_ARCHETYPE_PREFIX}${first}`
}

export function isCustomArchetypeId(value?: string | null): boolean {
  return parseCustomArchetypeId(value) !== null
}

export function canonicalizeArchetypeId(value?: string | null): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw) return null

  const exact = ARCHETYPE_RULES.find((r) => r.id === raw)
  if (exact) return exact.id

  const custom = parseCustomArchetypeId(raw)
  if (custom) {
    return buildCustomArchetypeId(custom.firstPokemonId, custom.secondPokemonId)
  }

  const n = normalizeText(raw)

  const byLabel = ARCHETYPE_RULES.find((r) => normalizeText(r.label) === n)
  if (byLabel) return byLabel.id

  const byAlias = ARCHETYPE_RULES.find((r) =>
    (r.aliases ?? []).some((a) => normalizeText(a) === n),
  )
  if (byAlias) return byAlias.id

  const bySlug = ARCHETYPE_RULES.find((r) => slugify(r.label) === slugify(raw))
  if (bySlug) return bySlug.id

  return null
}

export function formatArchetypeLabel(value?: string | null): string {
  if (!value) return "Unknown"
  const id = canonicalizeArchetypeId(value)
  if (id) {
    const known = ARCHETYPE_RULES.find((r) => r.id === id)
    if (known) return known.label

    const custom = parseCustomArchetypeId(id)
    if (custom) {
      const firstLabel = formatPokemonSpriteLabel(custom.firstPokemonId)
      if (!custom.secondPokemonId) return firstLabel
      return `${firstLabel} / ${formatPokemonSpriteLabel(custom.secondPokemonId)}`
    }
  }

  return value
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

const FALLBACK_ICON = FALLBACK_POKEMON_SPRITE

export function getArchetypeSpritePath(value?: string | null): string {
  const custom = parseCustomArchetypeId(value ?? null)
  if (custom) return getPokemonSpritePrimarySource(custom.firstPokemonId, { preference: "artwork" })

  const id = canonicalizeArchetypeId(value ?? null)
  const rule = id ? ARCHETYPE_RULES.find((r) => r.id === id) : undefined
  if (rule?.sprite) return getPokemonSpritePrimarySource(rule.sprite, { preference: "artwork" })
  return FALLBACK_ICON
}

/**
 * Returns candidates for each icon slot: string[][] where each inner array is tried in order.
 * Example: [[PokeAPI Ogerpon candidates..., local fallbacks...], [PokeAPI Noctowl candidates...]]
 */
export function getArchetypeIconCandidatePaths(value?: string | null): string[][] {
  const custom = parseCustomArchetypeId(value ?? null)
  if (custom) {
    const slots: string[][] = [getPokemonSpriteCandidateSources(custom.firstPokemonId)]
    if (custom.secondPokemonId) {
      slots.push(getPokemonSpriteCandidateSources(custom.secondPokemonId))
    }
    return slots
  }

  const id = canonicalizeArchetypeId(value ?? null)
  const rule = id ? ARCHETYPE_RULES.find((r) => r.id === id) : undefined

  const specs = rule?.iconSpecs
  if (!specs || specs.length === 0) {
    return [rule?.sprite ? getPokemonSpriteCandidateSources(rule.sprite) : [FALLBACK_ICON]]
  }

  return specs.map((s) => {
    if (typeof s === "string") return getPokemonSpriteCandidateSources(s)
    return [
      ...s.candidates.flatMap((c) =>
        getPokemonSpriteCandidateSources(c, { includeFallback: false }),
      ),
      FALLBACK_ICON,
    ]
  })
}

function safeStringArray(maybe: unknown): string[] {
  if (Array.isArray(maybe)) return maybe.filter((x) => typeof x === "string") as string[]
  return []
}

function inferForSide(main: string, others: unknown): string | null {
  const otherArr = safeStringArray(others)
  const names = [main, ...otherArr].map(normalizeText)

  const matches = (rule: ArchetypeRule) =>
    CURRENT_STANDARD_ARCHETYPE_IDS.has(rule.id) &&
    rule.autoDetect !== false &&
    rule.mustInclude.every((token) => {
      const t = normalizeText(token)
      return names.some((name) => ` ${name} `.includes(` ${t} `))
    })

  // All required Pokémon must have appeared on this side. Never combine one
  // player's Dragapult with the other player's Dusknoir to guess a variant.
  const variants = ARCHETYPE_VARIANT_RULES.filter(matches)
  if (variants.length === 1) return variants[0].id
  if (variants.length > 1) {
    const families = new Set(variants.map((rule) => rule.variantOf))
    // Hybrid builds can satisfy several variants. Keep the broad family until
    // the player chooses a specific label rather than guessing by rule order.
    if (families.size === 1) return variants[0].variantOf ?? null
  }

  for (const rule of BASE_ARCHETYPE_RULES) {
    if (matches(rule)) return rule.id
  }
  return null
}

export function inferArchetypesForSummary(
  summary: Pick<
    GameSummary,
    "userMainAttacker" | "userOtherPokemon" | "opponentMainAttacker" | "opponentOtherPokemon"
  >,
): { userArchetype: string | null; opponentArchetype: string | null } {
  const userArchetype = inferForSide(summary.userMainAttacker, summary.userOtherPokemon)
  const opponentArchetype = inferForSide(summary.opponentMainAttacker, summary.opponentOtherPokemon)
  return { userArchetype, opponentArchetype }
}
