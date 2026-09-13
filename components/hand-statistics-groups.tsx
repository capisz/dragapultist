"use client"
import type { LabCard } from '@/lib/deck-lab-parser'
import type { HandSession } from '@/utils/sample-hands'

const sections = [['pokemon', 'Pokémon'], ['trainer', 'Trainer'], ['energy', 'Energy'], ['unknown', 'Uncategorized']] as const

export function HandStatisticsGroups({ session, cards, label }: { session: HandSession; cards: LabCard[]; label: (id: string) => string }) {
  return <div className="hand-stat-groups">{sections.map(([section, title]) => {
    const entries = cards.filter(card => card.section === section)
    if (!entries.length) return null
    return <details className="hand-stat-group" key={section} open={section === 'pokemon' || (section === 'unknown' && entries.length === cards.length)}>
      <summary><span>{title}</span><small>{entries.reduce((sum, card) => sum + card.count, 0)} cards · {entries.length} entries</small></summary>
      <div className="hand-stat-column-label" aria-hidden="true">Appearance</div>
      {entries.map(entry => {
        const stat = session.cards.find(card => card.name === entry.id)
        if (!stat) return null
        const rate = (stat.handsContaining / session.hands * 100).toFixed(1)
        return <details className="hand-stat hand-stat-compact" key={entry.id}>
          <summary aria-label={`${label(entry.id)}, ${entry.code ?? 'name only'}, ${rate}% appearance; show counts`}><span><strong>{label(entry.id)}</strong><small>{entry.code ?? 'Name only'} · {entry.count} in deck</small></span><strong>{rate}%</strong></summary>
          <dl><div><dt>Hands containing</dt><dd>{stat.handsContaining.toLocaleString()}</dd></div><div><dt>Copies drawn</dt><dd>{stat.copiesDrawn.toLocaleString()}</dd></div><div><dt>Average copies / hand</dt><dd>{(stat.copiesDrawn / session.hands).toFixed(2)}</dd></div></dl>
        </details>
      })}
    </details>
  })}</div>
}
