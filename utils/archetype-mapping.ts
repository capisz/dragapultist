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
export const ARCHETYPE_RULES: ArchetypeRule[] = [
  { id: "basic-box", label: "Basic Box", mustInclude: ["mew"], iconSpecs: ["mew.png", "latias.png"], sprite: "mew.png", aliases: ["Basic Box"] },
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
    label: "Raging Boltex",
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
]

export const AVAILABLE_ARCHETYPE_IDS = [
  "dragapult-ex", "basic-box", "alakazam-powerful-hand", "n-zoroark-ex", "slowking-seek-inspiration", "mega-excadrill-ex", "festival-lead", "lillies-clefairy-ex", "crustle-mysterious-rock-inn", "raging-bolt-ex", "marnies-grimmsnarl-ex", "mega-lopunny-ex", "mega-lucario-ex", "dhelmise-hide-n-sneak", "hydrapple-ex", "toxtricity-sinister-surge", "mega-absol-box", "greninja-ex", "cynthias-garchomp-ex", "mega-sharpedo-ex", "mega-greninja-ex", "rockets-mewtwo-ex", "mega-venusaur-ex", "mega-kangaskhan-ex", "mega-chandelure-ex",
] as const

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
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

  for (const rule of ARCHETYPE_RULES) {
    const matches = rule.mustInclude.every((token) => {
      const t = normalizeText(token)
      return names.some((n) => n.includes(t))
    })
    if (matches) return rule.id
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
