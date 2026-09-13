"use client"
import { useState } from 'react'
import type { ReviewGame } from '@/utils/match-presentation'
import { TopDeckCalcPanel } from './top-deck-calc-panel'
import { SampleHandLab } from './sample-hand-lab'
export function DeckLab({ games, currentGameId }: { games: ReviewGame[]; currentGameId?: string }) {
  const [mode,setMode]=useState<'odds'|'hands'>('odds')
  return <section><div className="lab-modes" aria-label="Deck Lab mode"><button aria-pressed={mode==='odds'} onClick={()=>setMode('odds')}>Draw Odds</button><button aria-pressed={mode==='hands'} onClick={()=>setMode('hands')}>Sample Hands</button></div><div hidden={mode!=='odds'}><TopDeckCalcPanel/></div><div hidden={mode!=='hands'}><SampleHandLab games={games} currentGameId={currentGameId}/></div></section>
}
