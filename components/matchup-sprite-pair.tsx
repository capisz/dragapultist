"use client"

import { MatchSprite } from './match-sprite'

export function MatchupSpritePair({ user, opponent }: { user: string; opponent: string }) {
  return <div className="review-matchup">
    {/* Each side keeps its own identity, including mirror matches. */}
    <span key={`user-${user}`} className="review-matchup-sprite" role="img" aria-label={user || 'Unknown Pokémon'}>
      <MatchSprite name={user} />
    </span>
    <span className="review-matchup-versus" aria-hidden="true">vs</span>
    <span key={`opponent-${opponent}`} className="review-matchup-sprite" role="img" aria-label={opponent || 'Unknown Pokémon'}>
      <MatchSprite name={opponent} />
    </span>
  </div>
}
