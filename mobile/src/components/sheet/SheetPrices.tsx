import { StyleSheet, Text, View } from 'react-native'
import { duration, gpShort, heldFor, qty, signed } from '../../lib/format'
import { MIN_DAY_TRADES } from '../../lib/fillAware'
import { SHEET_HORIZON_HOURS, type SheetFill } from '../../lib/sheetFill'
import { useTheme } from '../../theme/ThemeProvider'
import { CopyPrice, PriceLine } from '../DetailLines'

export interface InstantPrices {
  buyAt: number
  sellAt: number
  /** Margin after tax between the live prices. */
  margin: number
}

function fillLine (fill: SheetFill, maxSellHours: number): string {
  if (fill.slow) return fill.slow
  if (!fill.rate || fill.qty < 1) return 'Fill time unknown: not enough trades on one side lately.'
  return `Fills in ${duration(fill.rate.cycleHours)} (buy ${duration(fill.rate.buyHours)}, sell ${duration(fill.rate.sellHours)}). ${qty(fill.qty)} is what buys and sells within ${SHEET_HORIZON_HOURS}h, selling inside your ${heldFor(maxSellHours)} limit.`
}

const basisText = (fill: SheetFill) =>
  fill.basis === 'series'
    ? 'Realistic prices: the median of the last 6 hours that traded with volume on each side, never above the last hour\'s or live ask.'
    : 'Realistic prices from the last hour and day averages; refining with the hourly history.'

// Headline prices in the item sheet: what you can actually buy and sell at
// (same rules as Buy now, the scanner and GE slots), with the instant live
// prices kept below as secondary, all tap to copy.
export function SheetPrices ({ fill, instant, maxSellHours }: { fill: SheetFill | null; instant: InstantPrices | null; maxSellHours: number }) {
  const { palette } = useTheme()
  const muted = { color: palette.muted }
  if (!fill) {
    if (!instant) return null
    return (
      <View style={styles.block}>
        <PriceLine tag="Buy" label="live" price={instant.buyAt} />
        <PriceLine tag="Sell" label="live" price={instant.sellAt} />
        <Text style={[styles.note, muted]}>Not enough recent trades to name a realistic price; these are the live prices. Tap a price to copy it.</Text>
      </View>
    )
  }
  return (
    <View style={styles.block}>
      <PriceLine tag="Buy" label={fill.qty >= 1 ? `${qty(fill.qty)} for ${gpShort(fill.buyAt * fill.qty)}` : 'at'} price={fill.buyAt} />
      <PriceLine tag="Sell" label={`${signed(fill.margin)} each after tax`} price={fill.sellAt} />
      <Text style={[styles.note, { color: fill.slow ? palette.ink : palette.muted }]}>{fillLine(fill, maxSellHours)}</Text>
      {fill.thin ? <Text style={[styles.note, muted]}>Trades {gpShort(fill.dayTrades)} a day, under {gpShort(MIN_DAY_TRADES)}: Buy now and the scanner leave it out.</Text> : null}
      {instant ? (
        <View style={[styles.instant, { borderColor: palette.rule }]}>
          <Text style={[styles.instantLabel, muted]}>Instant</Text>
          <Text style={[styles.instantPart, muted]}>buy</Text>
          <CopyPrice price={instant.buyAt} />
          <Text style={[styles.instantPart, muted]}>sell</Text>
          <CopyPrice price={instant.sellAt} />
          <Text style={[styles.instantMargin, muted]}>{signed(instant.margin)}</Text>
        </View>
      ) : null}
      <Text style={[styles.note, muted]}>{basisText(fill)} Instant prices are the latest single trades. Tap a price to copy it.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 2 },
  note: { fontSize: 11.5, lineHeight: 16, paddingTop: 2 },
  instant: { flexDirection: 'row', alignItems: 'baseline', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 6 },
  instantLabel: { width: 52, fontSize: 12, fontWeight: '600' },
  instantPart: { fontSize: 12 },
  instantMargin: { flex: 1, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] }
})
