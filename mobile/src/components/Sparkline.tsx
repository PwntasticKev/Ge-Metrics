import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { fetchTimeseries, type PricePoint } from '../api/wiki'
import { gpShort } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'

const SPARK_HEIGHT = 56
const SPARK_POINTS = 48 // two days of hourly prices

export type Timestep = '5m' | '1h' | '6h' | '24h'

function pathFor (values: (number | null)[], min: number, max: number, width: number, height: number): string {
  const step = width / Math.max(1, values.length - 1)
  const y = (v: number) => height - 4 - ((v - min) / (max - min || 1)) * (height - 8)
  let d = ''
  values.forEach((v, i) => {
    if (v === null) return
    d += `${d ? 'L' : 'M'}${(i * step).toFixed(1)},${y(v).toFixed(1)} `
  })
  return d
}

// Two-day price history for an item: insta-buy (solid) and insta-sell (dashed).
export function Sparkline ({ itemId }: { itemId: number }) {
  return <PriceChart itemId={itemId} timestep="1h" points={SPARK_POINTS} height={SPARK_HEIGHT} label="48h" />
}

interface ChartProps {
  itemId: number
  timestep: Timestep
  /** How many of the most recent points to draw. */
  points: number
  height: number
  label: string
}

export function PriceChart ({ itemId, timestep, points: count, height, label }: ChartProps) {
  const { palette } = useTheme()
  const [width, setWidth] = useState(0)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['timeseries', itemId, timestep],
    queryFn: () => fetchTimeseries(itemId, timestep),
    staleTime: 10 * 60_000
  })

  const chart = useMemo(() => {
    const points: PricePoint[] = (data ?? []).slice(-count)
    const all = points.flatMap(p => [p.avgHighPrice, p.avgLowPrice]).filter((v): v is number => v !== null)
    if (all.length < 2 || !width) return null
    const min = Math.min(...all)
    const max = Math.max(...all)
    const first = points.find(p => p.avgHighPrice !== null)?.avgHighPrice ?? null
    const last = [...points].reverse().find(p => p.avgHighPrice !== null)?.avgHighPrice ?? null
    const change = first && last ? (last - first) / first : null
    return {
      high: pathFor(points.map(p => p.avgHighPrice), min, max, width, height),
      low: pathFor(points.map(p => p.avgLowPrice), min, max, width, height),
      min,
      max,
      change
    }
  }, [data, width, count, height])

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))

  return (
    <View onLayout={onLayout} style={styles.wrap} accessibilityLabel={`Price over the last ${label}`}>
      {chart ? (
        <>
          <Svg width={width} height={height}>
            <Path d={chart.low} stroke={palette.muted} strokeWidth={1.2} strokeDasharray="3 3" fill="none" />
            <Path d={chart.high} stroke={palette.brand} strokeWidth={1.8} fill="none" />
          </Svg>
          <View style={styles.legend}>
            <Text style={[styles.text, { color: palette.muted }]}>{label} {gpShort(chart.min)} to {gpShort(chart.max)}</Text>
            {chart.change !== null ? (
              <Text style={[styles.text, { color: chart.change >= 0 ? palette.profit : palette.muted }]}>
                {chart.change >= 0 ? '▲' : '▼'} {(Math.abs(chart.change) * 100).toFixed(1)}%
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={[styles.text, { color: palette.muted, height, paddingTop: height / 2 - 8 }]}>
          {!width ? '' : isError ? 'Price history unavailable' : isLoading ? 'Loading price history' : 'Not enough trades to chart'}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 2, paddingBottom: 6 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  text: { fontSize: 11.5 }
})
