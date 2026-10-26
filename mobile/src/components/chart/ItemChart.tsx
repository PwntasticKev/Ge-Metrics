import { useQuery } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import { useGameUpdates, useItemNameIndex } from '../../api/gameUpdates'
import { fetchTimeseries } from '../../api/wiki'
import { buildChart, midOf, nearestIndex, nearestWithin, relativeChange, type SeriesPoint } from '../../lib/chartGeometry'
import { changeText, chartTime, gpPrice, gpShort } from '../../lib/format'
import { markersInRange } from '../../lib/gameUpdates'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { ChartDrawing, STRIP_HEIGHT, type PlacedMarker } from './ChartDrawing'
import { UpdateCard } from './UpdateCard'

export type Timestep = '5m' | '1h' | '6h' | '24h'

const STEP_MS: Record<Timestep, number> = { '5m': 300_000, '1h': 3_600_000, '6h': 21_600_000, '24h': 86_400_000 }
const PRICE_HEIGHT = 170
const VOLUME_HEIGHT = 36
const LABEL_PAD = 16
const MARKER_HIT_PX = 18

interface Props {
  itemId: number
  timestep: Timestep
  /** How many of the most recent points to draw (the wiki returns up to 365). */
  points: number
  /** "Last 7 days" */
  label: string
  /** Scrubbing owns the touch; the parent should stop scrolling meanwhile. */
  onScrubbingChange?: (scrubbing: boolean) => void
}

function Swatch ({ color, label }: { color: string; label: string }) {
  const { palette } = useTheme()
  return (
    <View style={styles.swatch}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.small, { color: palette.muted }]}>{label}</Text>
    </View>
  )
}

function useSeries (itemId: number, timestep: Timestep, count: number) {
  const query = useQuery({
    queryKey: ['timeseries', itemId, timestep],
    queryFn: () => fetchTimeseries(itemId, timestep),
    staleTime: 10 * 60_000
  })
  const points = useMemo<SeriesPoint[]>(() => (query.data ?? []).slice(-count).map(p => ({
    time: p.timestamp * 1000,
    high: p.avgHighPrice,
    low: p.avgLowPrice,
    highVolume: p.highPriceVolume,
    lowVolume: p.lowPriceVolume
  })), [query.data, count])
  return { points, isLoading: query.isLoading, isError: query.isError }
}

// Item price chart: sell and buy lines, volume, min/max, drag to read any
// point, and markers for game updates and dev blogs in the range.
export function ItemChart ({ itemId, timestep, points: count, label, onScrubbingChange }: Props) {
  const { palette } = useTheme()
  const [width, setWidth] = useState(0)
  const [scrub, setScrub] = useState(-1)
  const [selected, setSelected] = useState(-1)
  const { points, isLoading, isError } = useSeries(itemId, timestep, count)
  const updates = useGameUpdates()
  const nameIndex = useItemNameIndex()

  const chart = useMemo(() => buildChart(points, { width, priceHeight: PRICE_HEIGHT, volumeHeight: VOLUME_HEIGHT, pad: LABEL_PAD }), [points, width])
  const markers = useMemo<PlacedMarker[]>(() => {
    if (!chart || !updates.data || !nameIndex) return []
    return markersInRange(updates.data, chart.start, chart.end + STEP_MS[timestep], itemId, nameIndex)
      .map(m => ({ ...m, x: Math.min(chart.width, chart.xOf(m.time)) }))
  }, [chart, updates.data, nameIndex, itemId, timestep])

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))
  const scrubTo = (e: GestureResponderEvent) => {
    if (!chart) return
    const x = Math.max(0, Math.min(chart.width, e.nativeEvent.locationX))
    setScrub(nearestIndex(chart.xs, x))
  }
  const startScrub = (e: GestureResponderEvent) => {
    Haptics.selectionAsync()
    onScrubbingChange?.(true)
    scrubTo(e)
  }
  const endScrub = () => {
    setScrub(-1)
    onScrubbingChange?.(false)
  }
  const pickMarker = (e: GestureResponderEvent) => {
    const hit = nearestWithin(markers.map(m => m.x), e.nativeEvent.locationX, MARKER_HIT_PX)
    if (hit < 0) return
    Haptics.selectionAsync()
    setSelected(prev => (prev === hit ? -1 : hit))
  }

  if (!chart) {
    return (
      <View onLayout={onLayout} style={{ height: PRICE_HEIGHT + VOLUME_HEIGHT + STRIP_HEIGHT + 44, justifyContent: 'center' }}>
        <Text style={[styles.small, { color: palette.muted, textAlign: 'center' }]}>
          {!width ? '' : isError ? 'Price history unavailable' : isLoading ? 'Loading price history' : 'Not enough trades to chart'}
        </Text>
      </View>
    )
  }

  const last = points[points.length - 1]
  const shown = scrub >= 0 ? points[scrub] : last
  const firstMid = points.map(midOf).find(v => v !== null) ?? null
  const change = scrub >= 0 ? relativeChange(firstMid, midOf(shown)) : chart.change
  const selectedMarker = markers[selected] ?? null
  // Compare with the last period that ended before the post went live.
  let beforePost = -1
  if (selectedMarker) points.forEach((p, i) => { if (p.time + STEP_MS[timestep] <= selectedMarker.time) beforePost = i })
  const sinceMarker = beforePost >= 0 ? relativeChange(midOf(points[beforePost]), midOf(last)) : null

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Text style={[styles.when, { color: palette.ink }]}>{scrub >= 0 ? chartTime(shown.time, timestep !== '24h') : label}</Text>
        {change !== null ? <Text style={[styles.when, { color: change >= 0 ? palette.profit : palette.muted }]}>{changeText(change)}</Text> : null}
      </View>
      <View style={styles.values}>
        <Text style={[styles.value, { color: palette.brand }]}>Sell {gpPrice(shown.high)}</Text>
        <Text style={[styles.value, { color: palette.buyLine }]}>Buy {gpPrice(shown.low)}</Text>
        <Text style={[styles.small, { color: palette.muted }]}>Vol {gpShort(shown.highVolume + shown.lowVolume)}</Text>
      </View>

      <View onLayout={onLayout} style={{ height: PRICE_HEIGHT + VOLUME_HEIGHT + STRIP_HEIGHT }}>
        <ChartDrawing chart={chart} markers={markers} selected={selected} palette={palette} />
        {scrub >= 0 ? (
          <Svg width={chart.width} height={PRICE_HEIGHT + VOLUME_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line x1={chart.xs[scrub]} x2={chart.xs[scrub]} y1={0} y2={PRICE_HEIGHT + VOLUME_HEIGHT} stroke={palette.ink} strokeOpacity={0.5} strokeWidth={1} />
            {shown.high !== null ? <Circle cx={chart.xs[scrub]} cy={chart.yOf(shown.high)} r={4} fill={palette.brand} stroke={palette.bg} strokeWidth={1.5} /> : null}
            {shown.low !== null ? <Circle cx={chart.xs[scrub]} cy={chart.yOf(shown.low)} r={4} fill={palette.buyLine} stroke={palette.bg} strokeWidth={1.5} /> : null}
          </Svg>
        ) : null}
        <View
          style={[styles.touch, { height: PRICE_HEIGHT + VOLUME_HEIGHT }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={startScrub}
          onResponderMove={scrubTo}
          onResponderRelease={endScrub}
          onResponderTerminate={endScrub}
          accessibilityLabel={`Price chart, ${label}. Drag to read prices.`}
        />
        {markers.length ? (
          <Pressable style={[styles.strip, { top: PRICE_HEIGHT + VOLUME_HEIGHT - 6 }]} onPress={pickMarker} accessibilityRole="button" accessibilityLabel={`${markers.length} game ${markers.length === 1 ? 'update' : 'updates'} in this range`} />
        ) : null}
      </View>

      <View style={styles.legend}>
        <Swatch color={palette.brand} label="Sell (high)" />
        <Swatch color={palette.buyLine} label="Buy (low)" />
        {markers.length ? <Text style={[styles.small, { color: palette.muted, flex: 1, textAlign: 'right' }]}>Tap a dot for its update</Text> : null}
      </View>
      {selectedMarker ? <UpdateCard marker={selectedMarker} changeSincePost={sinceMarker} onClose={() => setSelected(-1)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  readout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  when: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  values: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  value: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  small: { fontSize: 11.5 },
  touch: { position: 'absolute', left: 0, right: 0, top: 0 },
  strip: { position: 'absolute', left: 0, right: 0, height: STRIP_HEIGHT + 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  swatch: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 }
})
