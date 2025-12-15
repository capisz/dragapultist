// utils/archetype-mapping.ts
import type { GameSummary } from "../types/game"

export type IconSpec =
  | string // single sprite file, e.g. "gardevoir.png"
  | { candidates: string[] } // try in order, e.g. ["ogerpon-teal-mask.png", "ogerpon-wellspring-mask.png"]

export interface ArchetypeRule {
  id: string
  label: string
  mustInclude: string[]
  sprite?: string
  aliases?: string[]
  iconSpecs?: IconSpec[] // enables 2-icon (or 3-icon) archetypes
}

// NOTE: Use sprite filenames that exist in /public/sprites
export const ARCHETYPE_RULES: ArchetypeRule[] = [
  {
    id: "gholdengo-lunatone",
    label: "Gholdengo/Lunatone",
    mustInclude: ["gholdengo", "lunatone"],
    iconSpecs: ["gholdengo.png","lunatone.png"],
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
      { candidates: ["ogerpon-teal-mask.png", "ogerpon-wellspring-mask.png", "ogerpon.png"] },
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
    aliases: ["Dragapult / Charizard"],
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
    iconSpecs: ["raging-bolt.png", { candidates: ["ogerpon-teal-mask.png", "ogerpon-wellspring-mask.png", "ogerpon.png"] }],
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

export function canonicalizeArchetypeId(value?: string | null): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw) return null

  const exact = ARCHETYPE_RULES.find((r) => r.id === raw)
  if (exact) return exact.id

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
  if (id) return ARCHETYPE_RULES.find((r) => r.id === id)?.label ?? "Unknown"

  return value
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

const FALLBACK_ICON = "/sprites/substitute.png"

export function getArchetypeSpritePath(value?: string | null): string {
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
