import type { MarketItem } from '@ge/engine'
import { memo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { fillsIn } from '../../lib/fillText'
import { duration, gpFull, gpPrice, gpShort, stripUncharged } from '../../lib/format'
import type { Move } from '../../lib/marketMoves'
import { multipleText, signedPct } from '../../lib/scanText'
import type { SpreadCheck } from '../../lib/spreadFill'
import { SPREAD_Z, type SpreadHistory } from '../../lib/spreadScan'
import type { Reversion, Trend } from '../../lib/trendScan'
import { useTheme } from '../../theme/ThemeProvider'
import { DetailsLink } from '../DetailsLink'
import { FlipRow } from '../FlipRow'
import { Sparkline } from '../Sparkline'

export interface SpreadEntry extends SpreadCheck {
  dump: boolean
}
export interface TrendEntry { item: MarketItem; move: Move; trend: Trend }
export interface DipEntry { item: MarketItem; move: Move; reversion: Reversion }

interface RowProps<T> { entry: T; expanded: boolean; onToggle: (id: number) => void }

function Line ({ text, muted = false }: { text: string; muted?: boolean }) {
  const { palette } = useTheme()
  return <Text style={[styles.line, { color: muted ? palette.muted : palette.ink }]}>{text}</Text>
}

function historyMeta (h: SpreadHistory | null | undefined): string {
  if (h === undefined) return 'checking 7d'
  if (h === null) return 'no 7d check'
  return `z ${h.z.toFixed(1)} vs 7d`
}

function priceLine ({ row, fill }: SpreadEntry): string {
  const basis = fill.basis === 'series'
    ? 'the median of the last few hours that traded with volume on each side'
    : 'the last hour\'s average where it traded with volume, else the day\'s'
  return `Buy ${gpPrice(fill.buyAt)}, sell ${gpPrice(fill.sellAt)}: ${basis}, held to the worse of that and live (live buy ${gpPrice(row.item.low)}, sell ${gpPrice(row.item.high)}, ${gpFull(row.rawLive)} after tax). Margin ${gpFull(fill.margin)} each.`
}

function fillLine ({ row, fill }: SpreadEntry): string {
  const lot = row.item.limit ? `One buy limit (${row.item.limit.toLocaleString('en-US')})` : 'One item (limit unknown)'
  const rate = fill.rate
  return `${lot}: buy ${duration(rate.buyHours)}, sell ${duration(rate.sellHours)}${rate.gpPerHour > 0 ? `, ${gpShort(rate.gpPerHour)}/h for the GE slot` : ''}.`
}

export const SpreadScanRow = memo(function SpreadScanRow ({ entry, expanded, onToggle }: RowProps<SpreadEntry>) {
  const { row, fill, history, dump } = entry
  const { item } = row
  const norm = history ? history.norm : row.dayNorm
  return (
    <FlipRow
      icon={item.icon}
      name={stripUncharged(item.name)}
      badges={dump ? ['Thin dump'] : undefined}
      meta={`Norm ${gpShort(norm)} → now ${gpShort(fill.margin)} · ${multipleText(fill.multiple)} · ${historyMeta(history)}`}
      note={fillsIn(fill.rate)}
      value={fill.profitPerLimit !== null ? `+${gpShort(fill.profitPerLimit)}` : `+${gpShort(fill.margin)}`}
      valueCaption={fill.profitPerLimit !== null ? 'per limit' : 'each'}
      valueTone={history === null || history?.unusual !== false ? 'profit' : 'ink'}
      expanded={expanded}
      onToggle={() => onToggle(item.id)}
    >
      <Sparkline itemId={item.id} />
      <Line text={priceLine(entry)} />
      <Line text={fillLine(entry)} />
      <Line text={`Day average margin ${gpFull(row.dayNorm)}; last hour ${row.hourMargin !== null ? gpFull(row.hourMargin) : 'no two-sided trades'}.`} />
      {history ? (
        <Line text={`Median hourly margin over ${history.hours}h: ${gpFull(history.norm)}. Now is ${history.z.toFixed(1)} robust σ above it${history.unusual ? '' : ` (under ${SPREAD_Z}σ, within its usual range)`}.`} />
      ) : null}
      <Line muted text={`${gpShort(row.dayTrades)} traded in 24h.`} />
      <DetailsLink itemId={item.id} />
    </FlipRow>
  )
})

/** Detail line for a scanner row in Slow to fill. */
export function slowSpreadDetail (entry: SpreadEntry): string {
  return `${priceLine(entry)} ${fillLine(entry)}`
}

export const TrendScanRow = memo(function TrendScanRow ({ entry, expanded, onToggle }: RowProps<TrendEntry>) {
  const { item, move, trend } = entry
  return (
    <FlipRow
      icon={item.icon}
      name={stripUncharged(item.name)}
      meta={`7d ${signedPct(move.change7d)} · fit R² ${trend.r2.toFixed(2)} · ${gpShort(move.valueTraded)}/day`}
      value={`${signedPct(trend.daily)}/d`}
      valueCaption="trend"
      valueTone={trend.daily >= 0 ? 'profit' : 'ink'}
      expanded={expanded}
      onToggle={() => onToggle(item.id)}
    >
      <Sparkline itemId={item.id} />
      <Line text={`A line through ${trend.points} six-hour prices over 7 days moves ${signedPct(trend.daily, 2)} a day (${signedPct(trend.week)} for the week) and explains ${Math.round(trend.r2 * 100)}% of the moves.`} />
      <Line text={`Hour vs same hour: ${signedPct(move.change24h)} in 24h, ${signedPct(move.change7d)} in 7d.`} />
      <Line muted text={`Now ${gpPrice(Math.round(move.now))} mid; ${gpShort(move.dayTrades)} traded in 24h.`} />
      <DetailsLink itemId={item.id} />
    </FlipRow>
  )
})

export const DipScanRow = memo(function DipScanRow ({ entry, expanded, onToggle }: RowProps<DipEntry>) {
  const { item, move, reversion } = entry
  const volume = reversion.volumeRatio !== null ? `${reversion.volumeRatio.toFixed(1)}× usual volume` : 'volume unknown'
  return (
    <FlipRow
      icon={item.icon}
      name={stripUncharged(item.name)}
      meta={`Mean ${gpShort(reversion.mean)} → now ${gpShort(move.now)} · z ${reversion.z.toFixed(1)} · ${reversion.volumeRatio !== null ? `${reversion.volumeRatio.toFixed(1)}× vol` : 'vol ?'}`}
      value={signedPct(reversion.gap)}
      valueCaption="vs 30d mean"
      expanded={expanded}
      onToggle={() => onToggle(item.id)}
    >
      <Sparkline itemId={item.id} />
      <Line text={`Last hour's mid ${gpPrice(Math.round(move.now))} is ${signedPct(reversion.gap)} from the 30-day mean of ${gpPrice(Math.round(reversion.mean))}, ${Math.abs(reversion.z).toFixed(1)} standard deviations down.`} />
      <Line text={`${signedPct(move.change24h)} in 24h, ${signedPct(move.change7d)} in 7d; ${gpShort(move.dayTrades)} traded in 24h (${volume}).`} />
      <Line muted text={`The month before moved ${signedPct(reversion.drift)} on its trend line. A drop on normal volume can be real news; check the chart for an update marker before buying.`} />
      <DetailsLink itemId={item.id} />
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  line: { fontSize: 13, lineHeight: 18, paddingTop: 4 }
})
