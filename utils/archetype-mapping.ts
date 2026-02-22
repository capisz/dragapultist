// utils/archetype-mapping.ts
import type { GameSummary } from "../types/game"

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

// NOTE: Use sprite filenames that exist in /public/sprites
export const ARCHETYPE_RULES: ArchetypeRule[] = [
  {
    id: "gholdengo-lunatone",
    label: "Gholdengo/Lunatone",
    mustInclude: ["gholdengo", "lunatone"],
    iconSpecs: ["gholdengo.png", "lunatone.png"],
    sprite: "gholdengo.png",
    aliases: ["Gholdengo/Lunatone"],
  },
  {
    id: "dragapult-dusknoir",
    label: "Dragapult / Dusknoir",
    mustInclude: ["dragapult", "dusknoir"],
    iconSpecs: ["dragapult.png", "dusknoir.png"],
    sprite: "dragapult.png",
    aliases: ["Dragapult / Dusknoir"],
  },
  {
    id: "charizard-pidgeot",
    label: "Charizard / Pidgeot",
    mustInclude: ["charizard", "pidgeot"],
    iconSpecs: ["charizard.png", "pidgeot.png"],
    sprite: "charizard.png",
    aliases: ["Charizard / Pidgeot"],
  },

  // Keep BEFORE gardevoir-ex
  {
    id: "gardevoir-ex-jellicent",
    label: "Gardevoir / Jellicent",
    mustInclude: ["gardevoir", "jellicent"],
    iconSpecs: ["gardevoir.png", "jellicent.png"],
    sprite: "gardevoir.png",
    aliases: ["gardevoir-jellicent", "Gardevoir / Jellicent", "Gardevoir / Jellicent ex"],
  },
  {
    id: "gardevoir-ex",
    label: "Gardevoir ex",
    mustInclude: ["gardevoir", "ex"],
    iconSpecs: ["gardevoir.png"],
    sprite: "gardevoir.png",
    aliases: ["Gardevoir ex", "Gardevoir"],
  },

  {
    id: "charizard-noctowl",
    label: "Charizard / Noctowl",
    mustInclude: ["charizard", "noctowl"],
    iconSpecs: ["charizard.png", "noctowl.png"],
    sprite: "charizard.png",
    aliases: ["Charizard / Noctowl"],
  },
  {
    id: "mega-absol-box",
    label: "Mega Absol Box",
    mustInclude: ["absol"],
    iconSpecs: ["absol-mega.png"],
    sprite: "absol-mega.png",
    aliases: ["Mega Absol Box", "Mega Absol"],
  },
  {
    id: "lopunny-dusknoir",
    label: "Lopunny / Dusknoir",
    mustInclude: ["lopunny", "dusknoir"],
    iconSpecs: ["lopunny.png", "dusknoir.png"],
    sprite: "lopunny.png",
    aliases: ["Lopunny / Dusknoir"],
  },
  {
    id: "grimmsnarl-froslass",
    label: "Grimmsnarl / Froslass",
    mustInclude: ["grimmsnarl", "froslass"],
    iconSpecs: ["grimmsnarl.png", "froslass.png"],
    sprite: "grimmsnarl.png",
    aliases: ["Grimmsnarl / Froslass"],
  },
  {
    id: "kangaskhan-bouffalant",
    label: "Kangaskhan / Bouffalant",
    mustInclude: ["kangaskhan", "bouffalant"],
    iconSpecs: ["kangaskhan.png", "bouffalant.png"],
    sprite: "kangaskhan.png",
    aliases: ["Kangaskhan / Bouffalant"],
  },
  {
    id: "ceruledge-ex",
    label: "Ceruledge ex",
    mustInclude: ["ceruledge"],
    iconSpecs: ["ceruledge.png"],
    sprite: "ceruledge.png",
    aliases: ["Ceruledge ex", "Ceruledge"],
  },

  // Your request: Tera Box shows Ogerpon (teal OR wellspring) + Noctowl
  {
    id: "tera-box",
    label: "Tera Box",
    mustInclude: ["tera"],
    iconSpecs: [
      {
        candidates: ["ogerpon.png", "ogerpon-wellspring.png", "ogerpon-hearthflame.png", "ogerpon-cornerstone.png"],
      },
      "noctowl.png",
    ],
    sprite: "noctowl.png",
    aliases: ["Tera Box"],
  },

  {
    id: "dragapult-charizard",
    label: "Dragapult / Charizard",
    mustInclude: ["dragapult", "charizard"],
    iconSpecs: ["dragapult.png", "charizard.png"],
    sprite: "dragapult.png",
    aliases: ["Dragapult / Charizard", "Charizard Dragapult"],
  },
  {
    id: "flareon-noctowl",
    label: "Flareon / Noctowl",
    mustInclude: ["flareon", "noctowl"],
    iconSpecs: ["flareon.png", "noctowl.png"],
    sprite: "flareon.png",
    aliases: ["Flareon / Noctowl"],
  },
  {
    id: "alakazam-dudunsparce",
    label: "Alakazam / Dudunsparce",
    mustInclude: ["alakazam", "dudunsparce"],
    iconSpecs: ["alakazam.png", "dudunsparce.png"],
    sprite: "alakazam.png",
    aliases: ["Alakazam / Dudunsparce"],
  },

  {
    id: "raging-bolt-ogerpon",
    label: "Raging Bolt / Ogerpon",
    mustInclude: ["raging bolt", "ogerpon"],
    iconSpecs: [
      "raging-bolt.png",
      {
        candidates: ["ogerpon.png", "ogerpon-wellspring.png", "ogerpon-hearthflame.png", "ogerpon-cornerstone.png"],
      },
    ],
    sprite: "raging-bolt.png",
    aliases: ["Raging Bolt / Ogerpon", "Raging Bolt Ogerpon"],
  },

  {
    id: "gholdengo-joltik",
    label: "Gholdengo / Joltik Box",
    mustInclude: ["gholdengo", "joltik"],
    iconSpecs: ["gholdengo.png", "joltik.png"],
    sprite: "gholdengo.png",
    aliases: ["Gholdengo / Joltik Box"],
  },
  {
    id: "froslass-munkidori",
    label: "Froslass / Munkidori",
    mustInclude: ["froslass", "munkidori"],
    iconSpecs: ["froslass.png", "munkidori.png"],
    sprite: "froslass.png",
    aliases: ["Froslass / Munkidori"],
  },
  {
    id: "dragapult-blaziken",
    label: "Dragapult / Blaziken",
    mustInclude: ["dragapult", "blaziken"],
    iconSpecs: ["dragapult.png", "blaziken.png"],
    sprite: "dragapult.png",
    aliases: ["Dragapult / Blaziken"],
  },

  {
    id: "gholdengo-typhlosion",
    label: "Gholdengo / Typhlosion",
    mustInclude: ["gholdengo", "typhlosion"],
    iconSpecs: ["gholdengo.png", "typhlosion.png"],
    sprite: "gholdengo.png",
    aliases: ["Gholdengo / Typhlosion"],
  },
  {
    id: "gholdengo-ex",
    label: "Gholdengo ex",
    mustInclude: ["gholdengo"],
    iconSpecs: ["gholdengo.png"],
    sprite: "gholdengo.png",
    aliases: ["Gholdengo ex", "Gholdengo"],
  },

  {
    id: "joltik-box",
    label: "Joltik Box",
    mustInclude: ["joltik"],
    iconSpecs: ["joltik.png"],
    sprite: "joltik.png",
    aliases: ["Joltik Box"],
  },
  {
    id: "marnies-grimmsnarl-ex",
    label: "Marnie’s Grimmsnarl ex",
    mustInclude: ["grimmsnarl", "ex"],
    iconSpecs: ["grimmsnarl.png"],
    sprite: "grimmsnarl.png",
    aliases: ["Marnie’s Grimmsnarl ex", "Marnies Grimmsnarl ex"],
  },
  {
    id: "slaking-ex",
    label: "Slaking ex",
    mustInclude: ["slaking"],
    iconSpecs: ["slaking.png"],
    sprite: "slaking.png",
    aliases: ["Slaking ex", "Slaking"],
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
    id: "pidgeot-control",
    label: "Pidgeot Control",
    mustInclude: ["pidgeot"],
    iconSpecs: ["pidgeot.png"],
    sprite: "pidgeot.png",
    aliases: ["Pidgeot Control"],
  },
  {
    id: "iron-hands-magneton",
    label: "Iron Hands / Magneton",
    mustInclude: ["iron hands", "magneton"],
    iconSpecs: ["iron-hands.png", "magneton.png"],
    sprite: "iron-hands.png",
    aliases: ["Iron Hands Magneton", "Iron Hands / Magneton"],
  },
  {
    id: "slowking",
    label: "Slowking",
    mustInclude: ["slowking"],
    iconSpecs: ["slowking.png"],
    sprite: "slowking.png",
    aliases: ["Slowking"],
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
    id: "iron-thorns-crustle",
    label: "Iron Thorns / Crustle",
    mustInclude: ["iron thorns", "crustle"],
    iconSpecs: ["iron-thorns.png", "crustle.png"],
    sprite: "iron-thorns.png",
    aliases: ["Iron Thorns Crustle", "Iron Thorns / Crustle"],
  },
  {
    id: "crustle",
    label: "Crustle",
    mustInclude: ["crustle"],
    iconSpecs: ["crustle.png"],
    sprite: "crustle.png",
    aliases: ["Crustle"],
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
    id: "ethans-typhlosion",
    label: "Ethan's Typhlosion",
    mustInclude: ["typhlosion"],
    iconSpecs: ["typhlosion.png"],
    sprite: "typhlosion.png",
    aliases: ["Ethan's Typhlosion", "Ethans Typhlosion"],
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
    id: "conkeldurr",
    label: "Conkeldurr",
    mustInclude: ["conkeldurr"],
    iconSpecs: ["conkeldurr.png"],
    sprite: "conkeldurr.png",
    aliases: ["Conkeldurr"],
  },
  {
    id: "gutsy-swing",
    label: "Gutsy Swing",
    mustInclude: ["gutsy swing"],
    iconSpecs: ["conkeldurr.png"],
    sprite: "conkeldurr.png",
    aliases: ["Gutsy Swing"],
  },
  {
    id: "ho-oh-armarouge",
    label: "Ho-Oh / Armarouge",
    mustInclude: ["ho oh", "armarouge"],
    iconSpecs: ["ho-oh.png", "armarouge.png"],
    sprite: "ho-oh.png",
    aliases: ["Ho-Oh Armarouge", "Ho-Oh / Armarouge"],
  },
  {
    id: "ursaluna-lunatone",
    label: "Ursaluna / Lunatone",
    mustInclude: ["ursaluna", "lunatone"],
    iconSpecs: ["ursaluna.png", "lunatone.png"],
    sprite: "ursaluna.png",
    aliases: ["Ursaluna Lunatone", "Ursaluna / Lunatone"],
  },
  {
    id: "sharpedo-toxtricity",
    label: "Sharpedo / Toxtricity",
    mustInclude: ["sharpedo", "toxtricity"],
    iconSpecs: [
      "sharpedo.png",
      { candidates: ["toxtricity.png", "toxtricity-amped.png", "toxtricity-low-key.png"] },
    ],
    sprite: "sharpedo.png",
    aliases: ["Sharpedo Toxtricity", "Sharpedo / Toxtricity"],
  },
  {
    id: "chien-pao-baxcalibur",
    label: "Chien-Pao / Baxcalibur",
    mustInclude: ["chien pao", "baxcalibur"],
    iconSpecs: ["chien-pao.png", "baxcalibur.png"],
    sprite: "chien-pao.png",
    aliases: ["Chien-Pao Baxcalibur", "Chien-Pao / Baxcalibur"],
  },
  {
    id: "lucario-hariyama",
    label: "Lucario / Hariyama",
    mustInclude: ["lucario", "hariyama"],
    iconSpecs: ["lucario.png", "hariyama.png"],
    sprite: "lucario.png",
    aliases: ["Lucario Hariyama", "Lucario / Hariyama"],
  },
  {
    id: "seaking-festival-lead",
    label: "Seaking / Festival Lead",
    mustInclude: ["seaking", "dipplin"],
    iconSpecs: ["seaking.png", "dipplin.png"],
    sprite: "seaking.png",
    aliases: ["Seaking Festival Lead", "Seaking / Festival Lead"],
  },
  {
    id: "festival-lead",
    label: "Festival Lead",
    mustInclude: ["dipplin"],
    iconSpecs: ["dipplin.png"],
    sprite: "dipplin.png",
    aliases: ["Festival Lead"],
  },
  {
    id: "rockets-mewtwo-ex",
    label: "Rocket's Mewtwo ex",
    mustInclude: ["mewtwo"],
    iconSpecs: ["mewtwo.png"],
    sprite: "mewtwo.png",
    aliases: ["Rocket's Mewtwo ex", "Rockets Mewtwo ex"],
  },
  {
    id: "toxtricity-brute-bonnet",
    label: "Toxtricity / Brute Bonnet",
    mustInclude: ["toxtricity", "brute bonnet"],
    iconSpecs: [{ candidates: ["toxtricity.png", "toxtricity-amped.png", "toxtricity-low-key.png"] }, "brute-bonnet.png"],
    sprite: "toxtricity.png",
    aliases: ["Toxtricity Brute Bonnet", "Toxtricity / Brute Bonnet"],
  },
  {
    id: "roaring-moon-ex",
    label: "Roaring Moon ex",
    mustInclude: ["roaring moon"],
    iconSpecs: ["roaring-moon.png"],
    sprite: "roaring-moon.png",
    aliases: ["Roaring Moon ex", "Roaring Moon"],
  },
  {
    id: "great-tusk-mill",
    label: "Great Tusk Mill",
    mustInclude: ["great tusk"],
    iconSpecs: ["great-tusk.png"],
    sprite: "great-tusk.png",
    aliases: ["Great Tusk Mill"],
  },
  {
    id: "hops-zacian",
    label: "Hop's Zacian",
    mustInclude: ["zacian"],
    iconSpecs: ["zacian.png"],
    sprite: "zacian.png",
    aliases: ["Hop's Zacian", "Hops Zacian"],
  },
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
    id: "ogerpon-box",
    label: "Ogerpon Box",
    mustInclude: ["ogerpon"],
    iconSpecs: [{ candidates: ["ogerpon.png", "ogerpon-wellspring.png", "ogerpon-hearthflame.png", "ogerpon-cornerstone.png"] }],
    sprite: "ogerpon.png",
    aliases: ["Ogerpon Box"],
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
    id: "kangaskhan-forretress",
    label: "Kangaskhan / Forretress",
    mustInclude: ["kangaskhan", "forretress"],
    iconSpecs: ["kangaskhan.png", "forretress.png"],
    sprite: "kangaskhan.png",
    aliases: ["Kangaskhan Forretress", "Kangaskhan / Forretress"],
  },
  {
    id: "okidogi",
    label: "Okidogi",
    mustInclude: ["okidogi"],
    iconSpecs: ["okidogi.png"],
    sprite: "okidogi.png",
    aliases: ["Okidogi"],
  },
  {
    id: "adrena-power",
    label: "Adrena-Power",
    mustInclude: ["adrena power"],
    iconSpecs: ["okidogi.png"],
    sprite: "okidogi.png",
    aliases: ["Adrena-Power", "Adrena Power"],
  },
  {
    id: "toxtricity-box",
    label: "Toxtricity Box",
    mustInclude: ["toxtricity"],
    iconSpecs: [{ candidates: ["toxtricity.png", "toxtricity-amped.png", "toxtricity-low-key.png"] }],
    sprite: "toxtricity.png",
    aliases: ["Toxtricity Box"],
  },
  {
    id: "manectric-eelektrik",
    label: "Manectric / Eelektrik",
    mustInclude: ["manectric", "eelektrik"],
    iconSpecs: ["manectric.png", "eelektrik.png"],
    sprite: "manectric.png",
    aliases: ["Manectric Eelektrik", "Manectric / Eelektrik"],
  },
  {
    id: "archaludon-ex",
    label: "Archaludon ex",
    mustInclude: ["archaludon"],
    iconSpecs: ["archaludon.png"],
    sprite: "archaludon.png",
    aliases: ["Archaludon ex", "Archaludon"],
  },

  // Keep generic Dragapult last
  {
    id: "dragapult-ex",
    label: "Dragapult ex",
    mustInclude: ["dragapult"],
    iconSpecs: ["dragapult.png"],
    sprite: "dragapult.png",
    aliases: ["Dragapult ex", "Dragapult"],
  },
]

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
  return value
    .trim()
    .toLowerCase()
    .replace(/\.png$/i, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function formatPokemonSpriteLabel(spriteId: string): string {
  const normalized = normalizeSpriteId(spriteId)
  if (!normalized) return "Unknown"

  return normalized
    .split("-")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
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

const FALLBACK_ICON = "/sprites/substitute.png"

export function getArchetypeSpritePath(value?: string | null): string {
  const custom = parseCustomArchetypeId(value ?? null)
  if (custom) return `/sprites/${custom.firstPokemonId}.png`

  const id = canonicalizeArchetypeId(value ?? null)
  const rule = id ? ARCHETYPE_RULES.find((r) => r.id === id) : undefined
  if (rule?.sprite) return `/sprites/${rule.sprite}`
  return FALLBACK_ICON
}

/**
 * Returns candidates for each icon slot: string[][] where each inner array is tried in order.
 * Example: [[/sprites/ogerpon-teal..., /sprites/ogerpon-wellspring...], [/sprites/noctowl.png]]
 */
export function getArchetypeIconCandidatePaths(value?: string | null): string[][] {
  const custom = parseCustomArchetypeId(value ?? null)
  if (custom) {
    const slots: string[][] = [[`/sprites/${custom.firstPokemonId}.png`, FALLBACK_ICON]]
    if (custom.secondPokemonId) {
      slots.push([`/sprites/${custom.secondPokemonId}.png`, FALLBACK_ICON])
    }
    return slots
  }

  const id = canonicalizeArchetypeId(value ?? null)
  const rule = id ? ARCHETYPE_RULES.find((r) => r.id === id) : undefined

  const specs = rule?.iconSpecs
  if (!specs || specs.length === 0) {
    const single = rule?.sprite ? `/sprites/${rule.sprite}` : FALLBACK_ICON
    return [[single, FALLBACK_ICON]]
  }

  return specs.map((s) => {
    if (typeof s === "string") return [`/sprites/${s}`, FALLBACK_ICON]
    return [...s.candidates.map((c) => `/sprites/${c}`), FALLBACK_ICON]
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
