import { memo } from 'react'
import type { ItemFlip } from '@ge/engine'
import { signed, stripUncharged } from '../lib/format'
import { useWatchlist } from '../state/watchlist'
import { PriceLine, ProfitFooter } from './DetailLines'
import { FlipRow } from './FlipRow'

export const ItemFlipRow = memo(function ItemFlipRow ({ flip, expanded, onToggle }: { flip: ItemFlip; expanded: boolean; onToggle: (id: number) => void }) {
  const { isStarred, toggle } = useWatchlist()
  const entry = { kind: 'item', id: flip.id } as const
  const limit = flip.limitAssumed ? `${flip.maxQty ?? '?'} per 4h (limit assumed)` : `${flip.maxQty ?? '?'} per 4h`
  return (
    <FlipRow
      icon={flip.icon}
      name={stripUncharged(flip.name)}
      meta={`${limit}, ${signed(flip.potential)}`}
      value={signed(flip.profit)}
      valueCaption="each"
      expanded={expanded}
      onToggle={() => onToggle(flip.id)}
    >
      <PriceLine tag="Buy" label="at" price={flip.buyAt} />
      <PriceLine tag="Sell" label="at" price={flip.sellAt} />
      <ProfitFooter tax={flip.tax} profit={flip.profit} starred={isStarred(entry)} onStar={() => toggle(entry)} />
    </FlipRow>
  )
})
