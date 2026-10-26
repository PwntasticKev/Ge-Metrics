import { memo, useState } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'
import { gpShort, shortDay, signed } from '../../lib/format'
import { profitChartGeometry } from '../../lib/pnl/chart'
import type { DayBar } from '../../lib/pnl/summary'
import { useTheme } from '../../theme/ThemeProvider'
import { pnlStyles, toneOf } from './styles'

const HEIGHT = 120

// Daily realized profit: blue bars up for winning days, grey bars down for
// losing days, and the running total as a line on its own scale.
export const ProfitChart = memo(function ProfitChart ({ days }: { days: readonly DayBar[] }) {
  const { palette } = useTheme()
  const [width, setWidth] = useState(0)
  const g = profitChartGeometry(days, width, HEIGHT)
  const last = days[days.length - 1]
  const won = days.filter(d => d.profit > 0).length
  const lost = days.filter(d => d.profit < 0).length

  return (
    <View
      style={{ gap: 6 }}
      accessible
      accessibilityLabel={`Daily realized profit over ${days.length} days: ${won} winning days, ${lost} losing days, ${signed(last?.cumulative ?? 0)} in total.`}
    >
      <View style={pnlStyles.line}>
        <Text style={[pnlStyles.label, { color: palette.muted }]}>Daily profit, last {days.length} days</Text>
        <Text style={[pnlStyles.value, { color: toneOf(last?.cumulative ?? 0, palette) }]}>{signed(last?.cumulative ?? 0)}</Text>
      </View>
      <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {g.bars.map((b, i) => b.height > 0 ? (
              <Rect key={i} x={b.x} y={b.y} width={b.width} height={b.height} rx={Math.min(2, b.width / 3)} fill={b.loss ? palette.muted : palette.brand} fillOpacity={b.loss ? 0.55 : 0.85} />
            ) : null)}
            <Line x1={0} x2={width} y1={g.zeroY} y2={g.zeroY} stroke={palette.rule} strokeWidth={1} />
            <Path d={g.linePath} stroke={palette.buyLine} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
            {g.lineEnd ? <Circle cx={g.lineEnd.x} cy={g.lineEnd.y} r={3} fill={palette.buyLine} /> : null}
          </Svg>
        ) : null}
      </View>
      <View style={pnlStyles.line}>
        <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>{days.length ? shortDay(days[0].dayStart) : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Legend color={palette.brand} label="Day" />
          <Legend color={palette.buyLine} label="Running total" />
        </View>
        <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>Today</Text>
      </View>
      <Text style={[pnlStyles.rowMeta, { color: palette.muted, textAlign: 'center' }]}>
        Best day {gpShort(Math.max(0, ...days.map(d => d.profit)))} · {won} up, {lost} down
      </Text>
    </View>
  )
})

function Legend ({ color, label }: { color: string; label: string }) {
  const { palette } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Text style={[pnlStyles.rowMeta, { color: palette.muted, marginTop: 0 }]}>{label}</Text>
    </View>
  )
}
