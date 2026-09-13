"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { probNoHit, probAtLeastOne } from "@/utils/draw-odds"

type Copies = 1 | 2 | 3 | 4

function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, Math.trunc(v)))
}

function pct(p: number) {
  return `${(p * 100).toFixed(1)}%`
}

export function TopDeckCalcPanel() {
  const [activeDraw, setActiveDraw] = useState(7)
  // keep as TEXT while typing so deleting doesn't force a fallback number
  const [deckRemainingText, setDeckRemainingText] = useState<string>("40")
  const [copiesA, setCopiesA] = useState<Copies>(3)
  const [showSecond, setShowSecond] = useState(false)
  const [copiesB, setCopiesB] = useState<Copies>(2)

  const draws = [1, 2, 3, 4, 5, 6, 7]

  const deckRemainingNum = useMemo(() => {
    const n = parseInt(deckRemainingText, 10)
    return Number.isFinite(n) ? n : 0
  }, [deckRemainingText])

  const normalized = useMemo(() => {
    // allow empty while editing; on blur we clamp back to 1..60
    const N = deckRemainingText === "" ? 0 : clampInt(deckRemainingNum, 1, 60)

    const KA = N > 0 ? Math.min(copiesA, N) : 0
    // keep disjoint outs sane; if deck is tiny, B effectively becomes 0
    const KB = showSecond && N > 0 ? Math.min(copiesB, Math.max(0, N - KA)) : 0

    return { N, KA, KB }
  }, [deckRemainingText, deckRemainingNum, copiesA, copiesB, showSecond])

  const results = useMemo(() => {
    const { N, KA, KB } = normalized

    return draws.map((n) => {
      if (N <= 0) {
        return {
          n,
          pA: null as number | null,
          pB: null as number | null,
          pEither: null as number | null,
          pBoth: null as number | null,
        }
      }

      const pA = KA > 0 ? probAtLeastOne(N, KA, n) : 0
      const pB = KB > 0 ? probAtLeastOne(N, KB, n) : 0

      let pBoth = 0
      if (KB > 0 && KA > 0) {
        // P(A and B) = 1 - P(noA) - P(noB) + P(noA and noB)
        const pNoA = probNoHit(N, KA, n)
        const pNoB = probNoHit(N, KB, n)
        const pNoAB = probNoHit(N, KA + KB, n)
        pBoth = Math.max(0, Math.min(1, 1 - pNoA - pNoB + pNoAB))
      }

      const pEither = KB > 0 ? Math.max(0, Math.min(1, pA + pB - pBoth)) : null

      return {
        n,
        pA,
        pB: KB > 0 ? pB : null,
        pEither,
        pBoth: KB > 0 ? pBoth : null,
      }
    })
  }, [normalized])

  const fmt = (p: number | null) => (p == null ? "—" : pct(p))

  const active = results[activeDraw - 1]
  return <div className="odds-lab"><div className="odds-canvas">
    <div className="odds-feature"><div><p className="eyebrow">Chance of at least one Card A</p><strong>{fmt(active.pA)}</strong><p>within the next {Math.min(activeDraw, normalized.N) || '—'} draws</p></div></div>
    <h3>Draw horizon</h3>
    <div className="draw-horizons">{results.map(result=><button key={result.n} aria-pressed={activeDraw===result.n} onClick={()=>setActiveDraw(result.n)}><span>{result.n}</span><i style={{height:`${Math.max(2,(result.pA??0)*65)}%`}}/><strong>{fmt(result.pA)}</strong></button>)}</div>
    {showSecond && <div className="tool-summary"><div><strong>{fmt(active.pB)}</strong><span>Card B</span></div><div><strong>{fmt(active.pEither)}</strong><span>Either A or B</span></div><div><strong>{fmt(active.pBoth)}</strong><span>Both A and B</span></div></div>}
    <details className="odds-exact"><summary>All exact probabilities</summary><div className="odds-table-scroll"><table><caption>Probability of at least one copy within each draw horizon</caption><thead><tr><th>Draws</th><th>A</th>{showSecond&&<><th>B</th><th>Either</th><th>Both</th></>}</tr></thead><tbody>{results.map(result=><tr key={result.n}><th>{result.n}</th><td>{fmt(result.pA)}</td>{showSecond&&<><td>{fmt(result.pB)}</td><td>{fmt(result.pEither)}</td><td>{fmt(result.pBoth)}</td></>}</tr>)}</tbody></table></div></details>
    <details className="tool-info"><summary>Calculation method</summary><p>Exact hypergeometric probabilities, without replacement. A and B represent distinct card groups. Draws are capped at the cards remaining.</p></details>
  </div><aside className="studio-rail odds-settings"><label htmlFor="deck-remaining">Cards remaining (1–60)</label><Input id="deck-remaining" inputMode="numeric" value={deckRemainingText} onChange={event=>setDeckRemainingText(event.target.value.replace(/[^\d]/g,''))} onBlur={()=>setDeckRemainingText(String(clampInt(parseInt(deckRemainingText,10),1,60)))}/>
    <fieldset><legend>Card A copies remaining</legend><div className="copy-choices">{[1,2,3,4].map(value=><button key={value} aria-pressed={copiesA===value} onClick={()=>setCopiesA(value as Copies)}>{value}</button>)}</div></fieldset>
    <button className="secondary second-card-action" aria-label={showSecond?"Remove second card":"Add a second card"} onClick={()=>setShowSecond(!showSecond)}>{showSecond?"− Remove second card":"+ Add a second card"}</button>
    {showSecond&&<fieldset><legend>Card B copies remaining</legend><div className="copy-choices">{[1,2,3,4].map(value=><button key={value} aria-pressed={copiesB===value} onClick={()=>setCopiesB(value as Copies)}>{value}</button>)}</div></fieldset>}
    <p>{normalized.N} cards remain · {normalized.KA} A outs{showSecond?` · ${normalized.KB} B outs`:''}. If combined copies exceed the deck, B is capped.</p>
    <button className="secondary" onClick={()=>{setDeckRemainingText('40');setCopiesA(3);setCopiesB(2);setShowSecond(false);setActiveDraw(7)}}>Reset odds</button>
  </aside></div>
}
