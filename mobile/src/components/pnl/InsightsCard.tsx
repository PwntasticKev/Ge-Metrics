import { Text, View } from 'react-native'
import { gpShort, heldFor, signed } from '../../lib/format'
import { LIMIT_WINDOW_HOURS, MIN_FLIPS_FOR_EXPECTANCY, type HoldSummary } from '../../lib/pnl/insights'
import type { ItemRecord } from '../../lib/pnl/summary'
import { useTheme } from '../../theme/ThemeProvider'
import { ItemIcon } from '../ItemIcon'
import { pnlStyles, toneOf } from './styles'

const MAX_LOSERS = 5

function holdLine (hold: HoldSummary): string {
  if (hold.avgHours === null) return 'No hold times yet. They\'re recorded for flips sold from the Bought tab.'
  const over = Math.round((hold.overWindowShare ?? 0) * 100)
  const base = `Average ${heldFor(hold.avgHours)}, median ${heldFor(hold.medianHours)}, against the ${LIMIT_WINDOW_HOURS}h buy-limit window. ${over}% of flips sat longer.`
  if (hold.avgProfitOver === null || hold.avgProfitInside === null) return base
  return `${base} Those averaged ${signed(hold.avgProfitOver)} a flip, vs ${signed(hold.avgProfitInside)} for quicker ones.`
}

// What to change: items that lose on average, holding too long, tax paid.
export function InsightsCard ({ losers, hold, taxPaid, profit }: { losers: readonly ItemRecord[]; hold: HoldSummary; taxPaid: number; profit: number }) {
  const { palette } = useTheme()
  const gross = profit + taxPaid
  return (
    <View style={[pnlStyles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <Text style={[pnlStyles.cardTitle, { color: palette.ink }]}>Items you lose on</Text>
      {losers.length ? losers.slice(0, MAX_LOSERS).map(r => (
        <View key={r.itemId} style={[pnlStyles.line, { alignItems: 'center' }]}>
          <ItemIcon icon={r.icon} size={24} />
          <Text style={[pnlStyles.label, { flex: 1, color: palette.ink }]} numberOfLines={1}>{r.name}</Text>
          <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>{r.flips} flips, {signed(r.avgProfit)} avg</Text>
          <Text style={[pnlStyles.value, { color: toneOf(r.profit, palette), minWidth: 56, textAlign: 'right' }]}>{signed(r.profit)}</Text>
        </View>
      )) : (
        <Text style={[pnlStyles.note, { color: palette.muted }]}>None. Every item with {MIN_FLIPS_FOR_EXPECTANCY}+ flips makes money on average.</Text>
      )}
      {losers.length ? <Text style={[pnlStyles.note, { color: palette.muted }]}>Negative expectancy over {MIN_FLIPS_FOR_EXPECTANCY}+ flips. Skip them or buy lower.</Text> : null}

      <Text style={[pnlStyles.cardTitle, { color: palette.ink, marginTop: 6 }]}>Hold time</Text>
      <Text style={[pnlStyles.note, { color: palette.ink }]}>{holdLine(hold)}</Text>

      <Text style={[pnlStyles.cardTitle, { color: palette.ink, marginTop: 6 }]}>GE tax</Text>
      <Text style={[pnlStyles.note, { color: palette.ink }]}>
        {taxPaid > 0
          ? `${gpShort(taxPaid)} paid${gross > 0 ? `, ${Math.round((taxPaid / gross) * 100)}% of your margin before tax` : ''}. Bonds and items sold under 50 gp are tax-free; it caps at 5M an item.`
          : 'No tax recorded yet.'}
      </Text>
    </View>
  )
}
