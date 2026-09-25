"use client"
import { useState } from 'react'
import { getPokemonSpriteCandidateSourcesForDisplayName } from '@/utils/pokeapi-sprites'

export function MatchSprite({ name }: { name: string }) {
  const sources = getPokemonSpriteCandidateSourcesForDisplayName(name).filter(src => src.startsWith('/sprites/'))
  const [failed, setFailed] = useState<string[]>([])
  const source = sources.find(src => !failed.includes(src))
  const isMega = /\bmega\b/i.test(name)
  const isMegaKangaskhan = isMega && /kangaskhan/i.test(name)
  return <span className={`match-sprite${isMega ? ' match-sprite--mega' : ''}${isMegaKangaskhan ? ' match-sprite--mega-kangaskhan' : ''}`}>{source ? <img src={source} alt="" loading="lazy" width={50} height={50}
    onError={() => setFailed(previous => [...previous, source])} /> : <span aria-hidden="true" style={{ visibility: "hidden" }} />}</span>
}
