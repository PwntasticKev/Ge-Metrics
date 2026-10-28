import { geTax } from '@ge/engine'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTimeseries } from '../../api/useTimeseries'
import { breakEvenSale, exitRehearsal, MIN_EXIT_EXAMPLES, type ExitHorizon } from '../../lib/exitRehearsal'
import { gpFull } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { Tabs } from '../Tabs'

const OPTIONS = [{ value: '2', label: '2h' }, { value: '4', label: '4h' }, { value: '8', label: '8h' }] as const
const signedPercent = (n: number | null) => n === null ? '–' : `${n >= 0 ? '+' : '−'}${(Math.abs(n) * 100).toFixed(2)}%`

function Result ({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme()
  return <View style={styles.line}><Text style={[styles.label, { color: palette.muted }]}>{label}</Text><Text style={[styles.value, { color: palette.ink }]}>{value}</Text></View>
}

export function ExitRehearsal ({ itemId, buyAt, sellAt, nowSec }: { itemId: number; buyAt: number; sellAt: number; nowSec: number }) {
  const { palette } = useTheme()
  const [horizon, setHorizon] = useState<ExitHorizon>(2)
  const history = useTimeseries(itemId, '1h')
  const report = useMemo(() => exitRehearsal({ series: history.data ?? [], itemId, buyAt, sellAt, horizon, nowSec, tax: geTax }), [history.data, itemId, buyAt, sellAt, horizon, nowSec])
  const net = sellAt - geTax(sellAt, itemId) - buyAt
  const span = report.firstDecision !== null && report.lastDecision !== null ? Math.max(1, Math.round((report.lastDecision - report.firstDecision) / 86400)) : 0
  const small = report.exitChecked < MIN_EXIT_EXAMPLES
  return (
    <View style={[styles.wrap, { borderColor: palette.rule }]}>
      <Text style={[styles.title, { color: palette.ink }]}>Exit rehearsal</Text>
      <Text style={[styles.note, { color: palette.muted }]}>If you need your cash back, how did similar spreads hold up?</Text>
      <Result label="Break-even sale after tax" value={gpFull(breakEvenSale(buyAt, itemId, geTax))} />
      <Tabs options={OPTIONS} value={String(horizon)} onChange={value => setHorizon(value === '2' ? 2 : value === '4' ? 4 : 8)} />
      {history.isError ? <Text style={[styles.note, { color: palette.muted }]}>History unavailable. Try again when prices refresh.</Text>
        : history.isPending ? <Text style={[styles.note, { color: palette.muted }]}>Checking earlier quotes…</Text>
          : net <= 0 ? <Text style={[styles.note, { color: palette.muted }]}>No positive after-tax spread to compare right now.</Text>
            : (
              <>
                <Text style={[styles.note, { color: palette.muted }]}>{report.matched} similar quotes in {span ? `about ${span} days` : 'the available history'}. {small ? 'Small sample: treat this as examples, not an edge.' : 'Historical examples, not a forecast.'}</Text>
                <Result label={`Target supported after ${horizon}h`} value={report.targetChecked ? `${report.targetQuoted} / ${report.targetChecked}` : 'Not enough trades'} />
                <Result label="Instant exit above entry, after tax" value={report.exitChecked ? `${report.positiveExits} / ${report.exitChecked}` : 'Not enough trades'} />
                <Result label="Median instant-exit return" value={signedPercent(report.medianReturn)} />
                <Result label="Worst sampled instant exit" value={signedPercent(report.worstReturn)} />
                {report.matched > report.exitChecked ? <Text style={[styles.note, { color: palette.muted }]}>{report.matched - report.exitChecked} {report.matched - report.exitChecked === 1 ? 'example had' : 'examples had'} no usable instant-sell price at the deadline and are excluded from exit results.</Text> : null}
                <Text style={[styles.note, { color: palette.muted }]}>Matches earlier after-tax spreads between half and twice today’s return. Quotes use only the 24 closed hours before each entry; {horizon}h windows do not overlap. Assumes your buy filled. Instant exit uses the final hour’s average low minus tax; target counts use its average high. Neither proves a fill or accounts for your order’s queue or size.</Text>
              </>
            )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  title: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12.5, lineHeight: 18 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  label: { flex: 1, fontSize: 13 },
  value: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] }
})
