import { Text, View } from 'react-native'
import { gpShort, percent, signed } from '../../lib/format'
import type { Unrealized } from '../../lib/pnl/insights'
import type { Totals } from '../../lib/pnl/summary'
import { useTheme } from '../../theme/ThemeProvider'
import { pnlStyles, toneOf } from './styles'

function Line ({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { palette } = useTheme()
  return (
    <View style={pnlStyles.line}>
      <Text style={[pnlStyles.label, { color: palette.muted }]}>{label}</Text>
      <Text style={[pnlStyles.value, { color: tone ?? palette.ink }]}>{value}</Text>
    </View>
  )
}

// Realized profit for the chosen period, plus open lots at today's price.
export function SummaryCard ({ totals, periodLabel, open }: { totals: Totals; periodLabel: string; open: Unrealized }) {
  const { palette } = useTheme()
  const winRate = totals.flips ? `${totals.wins} of ${totals.flips} won (${Math.round((totals.wins / totals.flips) * 100)}%)` : 'none yet'
  const unpriced = open.unpriced ? `, ${open.unpriced} unpriced` : ''
  return (
    <View style={[pnlStyles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <Text style={[pnlStyles.label, { color: palette.muted }]}>Realized profit, {periodLabel}</Text>
      <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.5, color: toneOf(totals.profit, palette), fontVariant: ['tabular-nums'] }}>
        {signed(totals.profit)}
      </Text>
      <Line label="Flips" value={winRate} />
      <Line label="Return on cost" value={totals.roi === null ? '–' : `${totals.roi >= 0 ? '+' : '-'}${percent(Math.abs(totals.roi))}`} tone={toneOf(totals.roi, palette)} />
      <Line label="GE tax paid" value={gpShort(totals.taxPaid)} />
      <View style={{ height: 1, backgroundColor: palette.rule, marginVertical: 2 }} />
      <Line
        label={`Open: ${open.priced} lot${open.priced === 1 ? '' : 's'} if sold now${unpriced}`}
        value={open.priced ? signed(open.profit) : '–'}
        tone={toneOf(open.priced ? open.profit : null, palette)}
      />
      {open.priced ? <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>At the instant-sell price after tax, on {gpShort(open.cost)} held.</Text> : null}
    </View>
  )
}
