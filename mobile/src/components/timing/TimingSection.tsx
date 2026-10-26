import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTimeseries } from '../../api/useTimeseries'
import { flowFromSeries, slotRate } from '../../lib/analytics/fillTime'
import { localClock, WEEKDAYS } from '../../lib/analytics/localTime'
import { dayOfWeekProfile, hourOfDayProfile, type TimingCall } from '../../lib/analytics/timeProfile'
import { duration, edgePercent, gpShort, qty } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { HourHeatmap } from './HourHeatmap'

interface Props {
  itemId: number
  buyAt: number
  sellAt: number
  /** Margin per item after tax at today's prices. */
  profitEach: number
  limit: number | null
}

const gpEach = (n: number) => (n < 1000 ? `${Math.round(n)} gp` : gpShort(n))
const confident = (call: TimingCall | null): call is TimingCall => call !== null && call.confidence !== 'low'
const timesOf = (call: TimingCall) => `${Math.round(call.beatRate * call.periods)} of ${call.periods}`

function Line ({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const { palette } = useTheme()
  return (
    <View style={styles.line}>
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
      <View style={styles.right}>
        <Text style={[styles.value, { color: palette.ink }]}>{value}</Text>
        {detail ? <Text style={[styles.detail, { color: palette.muted }]}>{detail}</Text> : null}
      </View>
    </View>
  )
}

// When to buy and sell an item, how long one buy limit takes to fill, and
// what a GE slot earns per hour on it. Uses the 1h series the week chart
// already loads, plus the 6h series for weekdays.
export function TimingSection ({ itemId, buyAt, sellAt, profitEach, limit }: Props) {
  const { palette } = useTheme()
  const hourly = useTimeseries(itemId, '1h')
  const sixHourly = useTimeseries(itemId, '6h')
  const offsetMinutes = -new Date().getTimezoneOffset()

  const hours = useMemo(() => (hourly.data ? hourOfDayProfile(hourly.data) : null), [hourly.data])
  const weekdays = useMemo(() => (sixHourly.data ? dayOfWeekProfile(sixHourly.data) : null), [sixHourly.data])
  const rate = useMemo(() => {
    const flow = hourly.data ? flowFromSeries(hourly.data) : null
    return flow && limit ? slotRate(flow, { buyAt, sellAt, profitEach, qty: limit, limit }) : null
  }, [hourly.data, buyAt, sellAt, profitEach, limit])

  let body
  if (!hours) {
    body = <Text style={[styles.note, { color: palette.muted }]}>{hourly.isError ? 'Trade timing unavailable' : 'Loading trade timing'}</Text>
  } else {
    const buy = confident(hours.buy) ? hours.buy : null
    const sell = confident(hours.sell) ? hours.sell : null
    const weekBuy = weekdays && confident(weekdays.buy) ? weekdays.buy : null
    const weekSell = weekdays && confident(weekdays.sell) ? weekdays.sell : null
    body = (
      <>
        {buy ? <Line label="Buy around" value={localClock(buy.slot, offsetMinutes)} detail={`${edgePercent(buy.edge)} cheaper, ${gpEach(buy.edgeGp)} each. ${timesOf(buy)} days`} /> : null}
        {sell ? <Line label="Sell around" value={localClock(sell.slot, offsetMinutes)} detail={`${edgePercent(sell.edge)} dearer, ${gpEach(sell.edgeGp)} each. ${timesOf(sell)} days`} /> : null}
        {!buy && !sell ? <Text style={[styles.note, { color: palette.muted }]}>No steady best hour: over the last {hours.periods} days no hour beat the rest of its day often enough to rely on.</Text> : null}
        <HourHeatmap slots={hours.slots} offsetMinutes={offsetMinutes} buyHour={buy?.slot ?? null} sellHour={sell?.slot ?? null} />
        {weekBuy || weekSell ? (
          <Text style={[styles.note, { color: palette.muted }]}>
            {[weekBuy ? `Cheapest on ${WEEKDAYS[weekBuy.slot]}s (${edgePercent(weekBuy.edge)}, ${timesOf(weekBuy)} weeks)` : null,
              weekSell ? `dearest on ${WEEKDAYS[weekSell.slot]}s (${edgePercent(weekSell.edge)}, ${timesOf(weekSell)} weeks)` : null]
              .filter(Boolean).join(', ').replace(/^d/, 'D')}. UTC days.
          </Text>
        ) : null}
      </>
    )
  }

  return (
    <View style={[styles.wrap, { borderColor: palette.rule }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: palette.ink }]}>Timing</Text>
        <Text style={[styles.detail, { color: palette.muted }]}>{hours ? `Last ${hours.periods} days, your time` : ''}</Text>
      </View>
      {body}
      {rate ? (
        <>
          <Line label={`Fill ${qty(rate.units)} (1 limit)`} value={`${duration(rate.buyHours)} + ${duration(rate.sellHours)}`} detail="buy, then sell" />
          <Line label="Per GE slot" value={profitEach > 0 && rate.gpPerHour > 0 ? `${gpShort(rate.gpPerHour)}/h` : '–'} detail={profitEach <= 0 ? 'no margin right now' : rate.gpPerHour > 0 ? 'at today\'s margin' : 'offers this far out rarely fill'} />
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 15, fontWeight: '700' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  label: { fontSize: 13 },
  right: { alignItems: 'flex-end', flexShrink: 1 },
  value: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  detail: { fontSize: 11.5, textAlign: 'right' },
  note: { fontSize: 12.5, lineHeight: 17 }
})
