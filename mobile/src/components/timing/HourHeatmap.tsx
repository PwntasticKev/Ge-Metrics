import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { SlotStats } from '../../lib/analytics/timeProfile'
import { localClock, localHourOrder } from '../../lib/analytics/localTime'
import { mixHex } from '../../lib/color'
import { useTheme } from '../../theme/ThemeProvider'

const HEIGHT = 40
const MIN_BAR = 4

const midDev = (s: SlotStats) => (s.lowDev !== null && s.highDev !== null ? (s.lowDev + s.highDev) / 2 : s.lowDev ?? s.highDev)

// 24 bars in local clock order. Height is how much trades in that hour,
// shade is the price: light blue cheap, deep blue dear.
export const HourHeatmap = memo(function HourHeatmap ({ slots, offsetMinutes, buyHour, sellHour }: { slots: readonly SlotStats[]; offsetMinutes: number; buyHour: number | null; sellHour: number | null }) {
  const { palette } = useTheme()
  const order = localHourOrder(offsetMinutes)
  const devs = slots.map(midDev).filter((v): v is number => v !== null)
  const lo = Math.min(0, ...devs)
  const hi = Math.max(0, ...devs)
  const most = Math.max(1, ...slots.map(s => s.volume))
  const shade = (dev: number | null) => (dev === null || hi === lo ? palette.well : mixHex(palette.well, palette.brand, 0.15 + 0.85 * ((dev - lo) / (hi - lo))))
  const label = (i: number) => localClock(order[i], offsetMinutes).replace(/:00$/, '')
  const clockOf = (hour: number | null) => (hour !== null ? localClock(hour, offsetMinutes) : 'no clear hour')

  return (
    <View accessible accessibilityLabel={`Prices by hour of day, local time. Cheapest around ${clockOf(buyHour)}, dearest around ${clockOf(sellHour)}.`}>
      <View style={[styles.bars, { height: HEIGHT }]}>
        {order.map(hour => (
          <View key={hour} style={styles.col}>
            <View style={{ height: Math.max(MIN_BAR, (slots[hour].volume / most) * HEIGHT), backgroundColor: shade(midDev(slots[hour])), borderRadius: 2 }} />
          </View>
        ))}
      </View>
      <View style={styles.marks}>
        {order.map(hour => (
          <Text key={hour} style={[styles.mark, { color: hour === buyHour ? palette.buyLine : palette.brand }]}>
            {hour === buyHour ? 'B' : hour === sellHour ? 'S' : ''}
          </Text>
        ))}
      </View>
      <View style={styles.axis}>
        {[0, 6, 12, 18].map(i => (
          <Text key={i} style={[styles.tick, { color: palette.muted, left: `${(i / 24) * 100}%` }]}>{label(i)}</Text>
        ))}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, justifyContent: 'flex-end' },
  marks: { flexDirection: 'row', gap: 2, height: 14 },
  mark: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  axis: { height: 14 },
  tick: { position: 'absolute', fontSize: 10.5, fontVariant: ['tabular-nums'] }
})
