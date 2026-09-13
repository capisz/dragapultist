"use client"
import { useEffect, useState } from 'react'
import { MatchSprite } from './match-sprite'
import { getPokemonSpriteCandidateSourcesForDisplayName, getPokeApiPokemonSpriteNumber } from '@/utils/pokeapi-sprites'
import verified from '@/utils/verified-animated-sprites.json'

export function verifiedAnimation(name: string): string | null {
  // Use only the first (exact-form) local candidate; never fall through to a base form for animation.
  const exact = getPokemonSpriteCandidateSourcesForDisplayName(name).find(source => source.startsWith('/sprites/'))
  if (!exact) return null
  const id = getPokeApiPokemonSpriteNumber(exact)
  if (!id || !Object.hasOwn(verified.assets, String(id))) return null
  return `https://raw.githubusercontent.com/PokeAPI/sprites/${verified.revision}/${verified.directory}/${id}.gif`
}
function AnimatedPokemon({ name, animate }: { name: string; animate: boolean }) {
  const url = animate ? verifiedAnimation(name) : null
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!url || loaded || failed) return
    const timeout = setTimeout(() => setFailed(true), 4000)
    return () => clearTimeout(timeout)
  }, [url, loaded, failed])
  return <span className="review-matchup-sprite" role="img" aria-label={name}>
    <span style={{ visibility: loaded && url && !failed ? 'hidden' : 'visible' }}><MatchSprite name={name} /></span>
    {url && !failed && <img src={url} alt="" width={80} height={80} style={{ opacity: loaded ? 1 : 0 }}
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
  </span>
}
export function MatchupSpritePair({ user, opponent }: { user: string; opponent: string }) {
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotionAllowed(!media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const animate = motionAllowed && !paused
  return <div className="review-matchup">
    <div><AnimatedPokemon key={`${user}-${animate}`} name={user} animate={animate} /><span aria-hidden="true">vs</span><AnimatedPokemon key={`${opponent}-${animate}`} name={opponent} animate={animate} /></div>
    {motionAllowed && (verifiedAnimation(user) || verifiedAnimation(opponent)) && <button type="button" onClick={() => setPaused(value => !value)}>{paused ? 'Animate sprites' : 'Pause sprites'}</button>}
  </div>
}
