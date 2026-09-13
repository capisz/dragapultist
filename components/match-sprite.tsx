"use client"
import { useState } from 'react'
import { getPokemonSpriteCandidateSourcesForDisplayName } from '@/utils/pokeapi-sprites'

export function MatchSprite({ name }: { name: string }) {
  const sources = getPokemonSpriteCandidateSourcesForDisplayName(name).filter(src => src.startsWith('/sprites/'))
  const [failed, setFailed] = useState<string[]>([])
  const source = sources.find(src => !failed.includes(src))
  return <span className="match-sprite">{source ? <img src={source} alt="" width={48} height={48}
    onError={() => setFailed(previous => [...previous, source])} /> : <span aria-hidden="true">?</span>}</span>
}
