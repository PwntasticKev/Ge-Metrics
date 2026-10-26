import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { BuyPick } from '@ge/engine'
import type { SlotRate } from '../lib/analytics/fillTime'
import { duration, gpFull, gpShort, percent, qty, signed, stripUncharged } from '../lib/format'
import type { PickMode } from '../lib/picks'
import { useWatchlist } from '../state/watchlist'
import { useTheme } from '../theme/ThemeProvider'
import { PriceLine, ProfitFooter } from './DetailLines'
import { FlipRow } from './FlipRow'
import { DetailsLink } from './DetailsLink'
import { LogBuy } from './LogBuy'
import { Sparkline } from './Sparkline'

function whyLine (pick: BuyPick, mode: PickMode): string {
  const volume = `${gpShort(pick.dayVolume)} trade a day`
  if (mode === 'dips') {
    return `Down ${percent(pick.drop ?? 0)} from the day's typical low. Sell target is the day's middle price. ${volume}.`
  }
  if (mode === 'overnight') {
    const trend = pick.trend ?? 0
    return `Typical low and high over 24h. ${volume}. Price ${trend >= 0 ? 'up' : 'down'} ${percent(Math.abs(trend))} in the last hour.`
  }
  const held = pick.liveProfit !== undefined && pick.liveProfit > pick.profit
    ? `Live prices show ${gpFull(pick.liveProfit)} each, but these are last hour's prices, which held.`
    : 'Margin held over the last hour.'
  return `${held} ${volume}.`
}

function rateLine (rate: SlotRate): string {
  return `Fills in ${duration(rate.buyHours)} to buy and ${duration(rate.sellHours)} to sell: ${gpShort(rate.gpPerHour)}/h for the GE slot.`
}

// One "buy this now" row: what to offer, what to sell at, and how many.
interface Props {
  pick: BuyPick
  mode: PickMode
  /** Expected fill times and GP/h per GE slot, when the averages allow it. */
  rate: SlotRate | null
  /** Lead with GP/h per slot instead of total profit. */
  bySpeed: boolean
  expanded: boolean
  onToggle: (id: number) => void
}

export const PickRow = memo(function PickRow ({ pick, mode, rate, bySpeed, expanded, onToggle }: Props) {
  const { palette } = useTheme()
  const { isStarred, toggle } = useWatchlist()
  const entry = { kind: 'item', id: pick.id } as const
  return (
    <FlipRow
      icon={pick.icon}
      name={stripUncharged(pick.name)}
      meta={`Buy ${gpFull(pick.buyAt)}, sell ${gpFull(pick.sellAt)}`}
      value={bySpeed && rate ? `${gpShort(rate.gpPerHour)}/h` : signed(pick.potential)}
      valueCaption={bySpeed && rate ? `${signed(pick.potential)}, ${duration(rate.cycleHours)}` : `${qty(pick.maxQty)} ${mode === 'overnight' ? 'overnight' : 'in 4h'}`}
      expanded={expanded}
      onToggle={() => onToggle(pick.id)}
    >
      <Sparkline itemId={pick.id} />
      <PriceLine tag="Buy" label={`${qty(pick.maxQty)} for ${gpShort(pick.cost)}`} price={pick.buyAt} />
      <PriceLine tag="Sell" label={`${signed(pick.profit)} each after tax`} price={pick.sellAt} />
      <Text style={[styles.why, { color: palette.muted }]}>{whyLine(pick, mode)}{rate && mode !== 'overnight' ? ` ${rateLine(rate)}` : ''}</Text>
      <ProfitFooter tax={pick.tax * pick.maxQty} profit={pick.potential} starred={isStarred(entry)} onStar={() => toggle(entry)} />
      <DetailsLink itemId={pick.id} />
      <LogBuy itemId={pick.id} name={pick.name} icon={pick.icon} qty={pick.maxQty} price={pick.buyAt} />
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  why: { fontSize: 12.5, lineHeight: 17, paddingTop: 6 }
})
