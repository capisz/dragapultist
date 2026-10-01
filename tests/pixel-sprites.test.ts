import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getArchetypeIconCandidatePaths, getArchetypeSpritePath } from '@/utils/archetype-mapping'
import { getPokemonSpriteCandidateSourcesForDisplayName, getKnownPokemonSpriteOptions, pixelSpriteCandidates } from '@/utils/pokeapi-sprites'
import localSprites from '@/utils/local-pixel-sprites.json'

describe('Figma pixel sprite identity and fallback', () => {
  it('serves every cached sprite from an existing file', () => {
    for (const id of localSprites) expect(existsSync(resolve(`public/pokemon/${id}.png`)), String(id)).toBe(true)
  })
  it('keeps paired deck identities and uses their full front sprites', () => {
    const slots = getArchetypeIconCandidatePaths('dragapult-dusknoir').map(pixelSpriteCandidates)
    expect(slots.map(slot => slot[0])).toEqual(['/pokemon/887.png', '/pokemon/477.png'])
  })
  it('preserves a Mega form rather than substituting the base Pokemon', () => {
    const sources = pixelSpriteCandidates(getPokemonSpriteCandidateSourcesForDisplayName('Mega Lucario ex'))
    expect(sources[0]).toBe('/pokemon/10059.png')
    expect(sources).not.toContain('/pokemon/448.png')
  })
  it('resolves card-name suffixes to their Pokemon, including prize-path Rotom V', () => {
    for (const [name, id] of [['Rotom V', 479], ['Eevee VMAX', 133], ['Arceus VSTAR', 493], ['Charizard GX', 6]] as const) {
      expect(getPokemonSpriteCandidateSourcesForDisplayName(name)[0].endsWith(`/${id}.png`)).toBe(true)
    }
  })
  it('retains an explicit unknown archetype rather than guessing its attacker', () => {
    expect(getArchetypeIconCandidatePaths(null)).toEqual([['/sprites/substitute.png']])
  })
  it('uses only still front sprites throughout the picker and archetype thumbnails', () => {
    for (const option of getKnownPokemonSpriteOptions()) {
      expect(option.spriteUrls).toEqual(pixelSpriteCandidates(option.spriteUrls))
      expect(option.spriteUrls.some(source => /\.gif|\/other\/|\/icons\//.test(source))).toBe(false)
    }
    expect(getArchetypeSpritePath('dragapult-dusknoir')).toBe('/pokemon/887.png')
  })
  it('uses the same front style for uncached custom Pokemon with a local fallback', () => {
    const sources = pixelSpriteCandidates(getPokemonSpriteCandidateSourcesForDisplayName('Bulbasaur'))
    expect(sources[0]).toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png')
    expect(sources.at(-1)).toBe('/sprites/substitute.png')
    expect(sources).not.toContain('/sprites/bulbasaur.png')
    expect(sources.some(source => source.includes('/other/'))).toBe(false)
  })
})
