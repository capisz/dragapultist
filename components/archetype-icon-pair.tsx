"use client"

import { useState, type CSSProperties } from 'react'
import { getArchetypeIconCandidatePaths } from '@/utils/archetype-mapping'
import { pixelSpriteCandidates } from '@/utils/pokeapi-sprites'

const FALLBACK_ICON = '/sprites/substitute.png'
const spriteFraming = new Map<string, CSSProperties>()

// Frame local sprites by their visible pixels; some Mega files have large,
// asymmetric transparent margins. Cache each measurement across all matches.
function visibleSpriteFrame(image: HTMLImageElement): CSSProperties | undefined {
  const source = image.currentSrc || image.src
  const cached = spriteFraming.get(source)
  if (cached) return cached
  const { naturalWidth: width, naturalHeight: height } = image
  if (!width || !height || width > 1024 || height > 1024) return
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, width, height).data
    let left = width, top = height, right = -1, bottom = -1
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!pixels[(y * width + x) * 4 + 3]) continue
      left = Math.min(left, x); right = Math.max(right, x)
      top = Math.min(top, y); bottom = Math.max(bottom, y)
    }
    if (right < left || bottom < top) return
    const visibleWidth = right - left + 1, visibleHeight = bottom - top + 1
    const side = Math.max(visibleWidth, visibleHeight)
    const frame: CSSProperties = {
      position: 'absolute', maxWidth: 'none',
      width: `${width / side * 100}%`, height: `${height / side * 100}%`,
      left: `${((side - visibleWidth) / 2 - left) / side * 100}%`,
      top: `${((side - visibleHeight) / 2 - top) / side * 100}%`,
    }
    spriteFraming.set(source, frame)
    return frame
  } catch { return undefined }
}

export function CandidateSprite({ candidates, size = 30, normalize = false }: { candidates: string[]; size?: number; normalize?: boolean }) {
  const sources = [...new Set([...candidates, FALLBACK_ICON])]
  const [index, setIndex] = useState(0)
  const [frame, setFrame] = useState<CSSProperties>()
  const sprite = <img src={sources[Math.min(index, sources.length - 1)]} alt="" loading="lazy" width={size} height={size}
    style={{ imageRendering: 'pixelated', ...(normalize ? frame : undefined) }}
    onLoad={normalize ? event => setFrame(visibleSpriteFrame(event.currentTarget)) : undefined}
    className={normalize ? 'archetype-sprite-image' : 'archetype-sprite'} onError={event => { if (index >= sources.length - 1) event.currentTarget.style.visibility = "hidden"; else { setFrame(undefined); setIndex(value => value + 1) } }} />
  return normalize ? <span className="archetype-sprite archetype-sprite-frame" style={{ '--sprite-size': `${size}px` } as CSSProperties}>{sprite}</span> : sprite
}

export function ArchetypeIconPair({ archetypeId, size = 30, localSprites = false }: { archetypeId: string | null; size?: number; localSprites?: boolean }) {
  const slots = getArchetypeIconCandidatePaths(archetypeId)
  return <span className="archetype-icons" data-count={Math.min(slots.length || 1, 3)} aria-hidden="true">
    {(slots.length ? slots : [[FALLBACK_ICON]]).slice(0, 3).map((candidates, index) => {
      const sources = localSprites ? pixelSpriteCandidates(candidates) : candidates
      return <CandidateSprite key={`${archetypeId}-${index}-${sources.join('|')}`} candidates={sources} size={size} normalize={localSprites} />
    })}
  </span>
}
