import { Skeleton } from '@/components/ui/skeleton'

export function GhostScaffold({ kind = 'matches', count = 12 }: { kind?: 'matches' | 'players' | 'prizes'; count?: number }) {
  return <div className={`ghost-scaffold ghost-scaffold--${kind}`} aria-hidden="true">
    {kind === 'matches' ? <>
      <div className="ghost-filter">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} />)}</div>
      <div className="constellation-field ghost-field">{Array.from({ length: count }, (_, i) => <div className="ghost-tile" key={i}><Skeleton /><Skeleton /></div>)}</div>
    </> : <div className="ghost-panels">{Array.from({ length: kind === 'players' ? 2 : 4 }, (_, i) => <div className="ghost-panel" key={i}><Skeleton /><Skeleton /><Skeleton /></div>)}</div>}
  </div>
}
