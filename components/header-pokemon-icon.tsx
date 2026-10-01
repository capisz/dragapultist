"use client"

import { useState } from 'react'
import { CircleHelp, Settings } from 'lucide-react'

export function HeaderPokemonIcon({ kind }: { kind: 'help' | 'settings' }) {
  const [failed, setFailed] = useState(false)
  if (failed) return kind === 'help' ? <CircleHelp aria-hidden="true" /> : <Settings aria-hidden="true" />
  return <span className={`header-pokemon-icon header-pokemon-icon--${kind}`} aria-hidden="true">
    {(['light', 'dark'] as const).map(theme => <span key={theme} className={`pokemon-icon-${theme}`}>
      {kind === 'help' ? <img src={`/settings/unown-question${theme === 'dark' ? '-shiny' : ''}.png`} alt="" draggable={false} onError={() => setFailed(true)} /> : <>
        <img className="klink-first" src={`/settings/klink-gear-1${theme === 'dark' ? '-shiny' : ''}.png`} alt="" draggable={false} onError={() => setFailed(true)} />
        <img className="klink-second" src={`/settings/klink-gear-2${theme === 'dark' ? '-shiny' : ''}.png`} alt="" draggable={false} onError={() => setFailed(true)} />
      </>}
    </span>)}
  </span>
}
