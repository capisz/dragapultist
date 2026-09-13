"use client"

import { useState } from 'react'
import { getArchetypeIconCandidatePaths } from '@/utils/archetype-mapping'

const FALLBACK_ICON = '/sprites/substitute.png'

export function CandidateSprite({ candidates, size = 30 }: { candidates: string[]; size?: number }) {
  const sources = [...new Set([...candidates, FALLBACK_ICON])]
  const [index, setIndex] = useState(0)
  return <img src={sources[Math.min(index, sources.length - 1)]} alt="" width={size} height={size}
    className="archetype-sprite" onError={() => setIndex(value => Math.min(value + 1, sources.length - 1))} />
}

export function ArchetypeIconPair({ archetypeId, size = 30 }: { archetypeId: string | null; size?: number }) {
  const slots = getArchetypeIconCandidatePaths(archetypeId)
  return <span className="archetype-icons" aria-hidden="true">
    {(slots.length ? slots : [[FALLBACK_ICON]]).slice(0, 3).map((candidates, index) =>
      <CandidateSprite key={`${archetypeId}-${index}-${candidates.join('|')}`} candidates={candidates} size={size} />)}
  </span>
}
