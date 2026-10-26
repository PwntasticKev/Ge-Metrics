import { memo } from 'react'
import type { SetFlip } from '@ge/engine'
import { gpFull, signed, shortSetName } from '../lib/format'
import { useWatchlist } from '../state/watchlist'
import { PriceLine, ProfitFooter } from './DetailLines'
import { FlipRow } from './FlipRow'
import { Sparkline } from './Sparkline'

function partLabel (name: string, setName: string): string {
  // "Torva full helm" in the Torva set reads better as "full helm".
  const prefix = shortSetName(setName)
  return name.startsWith(`${prefix} `) ? name.slice(prefix.length + 1) : name
}

export const SetFlipRow = memo(function SetFlipRow ({ flip, expanded, onToggle }: { flip: SetFlip; expanded: boolean; onToggle: (id: string) => void }) {
  const { isStarred, toggle } = useWatchlist()
  const name = shortSetName(flip.name) + (flip.variant ? ` (${flip.variant})` : '')
  const meta = flip.maxSets === null ? 'Buy limit unknown' : `${flip.maxSets} per 4h, ${signed(flip.potential)}`
  const entry = { kind: 'set', id: flip.id } as const
  return (
    <FlipRow
      icon={flip.icon}
      name={name}
      meta={flip.direction === 'split' ? `Split. ${meta}` : meta}
      value={signed(flip.profit)}
      // Sell price on the collapsed row, for when you already hold the set.
      valueCaption={`Sell ${gpFull(flip.revenue)}`}
      expanded={expanded}
      onToggle={() => onToggle(flip.id)}
    >
      <Sparkline itemId={flip.setId} />
      {flip.buy.map(line => (
        <PriceLine key={`b${line.id}`} tag="Buy" icon={line.icon} label={flip.direction === 'split' ? 'Set' : (line.qty > 1 ? `${line.qty} × ` : '') + partLabel(line.name, flip.name)} price={line.price} />
      ))}
      {flip.sell.map((line, i) => (
        <PriceLine key={`s${line.id}`} tag="Sell" icon={line.icon} divider={i === 0} label={flip.direction === 'combine' ? 'Set' : (line.qty > 1 ? `${line.qty} × ` : '') + partLabel(line.name, flip.name)} price={line.price} />
      ))}
      <ProfitFooter tax={flip.tax + flip.conversionCost} profit={flip.profit} starred={isStarred(entry)} onStar={() => toggle(entry)} />
    </FlipRow>
  )
})
