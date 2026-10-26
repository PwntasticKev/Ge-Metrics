import { memo, type ReactNode } from 'react'
import type { ItemFlip } from '@ge/engine'
import { gpShort, signed, stripUncharged } from '../lib/format'
import { useWatchlist } from '../state/watchlist'
import { PriceLine, ProfitFooter } from './DetailLines'
import { FlipRow } from './FlipRow'
import { DetailsLink } from './DetailsLink'
import { LogBuy } from './LogBuy'
import { Sparkline } from './Sparkline'

export const ItemFlipRow = memo(function ItemFlipRow ({ flip, expanded, onToggle, footer }: { flip: ItemFlip; expanded: boolean; onToggle: (id: number) => void; footer?: ReactNode }) {
  const { isStarred, toggle } = useWatchlist()
  const entry = { kind: 'item', id: flip.id } as const
  const losing = flip.profit <= 0
  const limit = flip.limitAssumed ? `${flip.maxQty ?? '?'} per 4h (limit assumed)` : `${flip.maxQty ?? '?'} per 4h`
  return (
    <FlipRow
      icon={flip.icon}
      name={stripUncharged(flip.name)}
      meta={`${losing ? 'No margin right now' : `${limit}, ${signed(flip.potential)}`}${flip.dailyVolume ? `, ${gpShort(flip.dailyVolume)}/day` : ''}`}
      value={signed(flip.profit)}
      valueTone={losing ? 'ink' : 'profit'}
      valueCaption="each"
      expanded={expanded}
      onToggle={() => onToggle(flip.id)}
    >
      <Sparkline itemId={flip.id} />
      <PriceLine tag="Buy" label="at" price={flip.buyAt} />
      <PriceLine tag="Sell" label="at" price={flip.sellAt} />
      <ProfitFooter tax={flip.tax} profit={flip.profit} starred={isStarred(entry)} onStar={() => toggle(entry)} />
      <DetailsLink itemId={flip.id} />
      <LogBuy itemId={flip.id} name={flip.name} icon={flip.icon} qty={flip.maxQty || 1} price={flip.buyAt} />
      {footer}
    </FlipRow>
  )
})
