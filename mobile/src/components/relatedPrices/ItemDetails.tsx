import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import { fetchTimeseries } from '../../api/wiki'
import { buildRelatedPrices, compareRelatedTimestamps, RELATED_PRICE_GROUPS, type PriceSide, type RelatedGroupId } from '../../lib/relatedPrices'
import { useTheme } from '../../theme/ThemeProvider'
import { indexedPath, reconcileSelection } from './geometry'

const groups = Object.keys(RELATED_PRICE_GROUPS) as RelatedGroupId[]
const number = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: 2 })
const change = (v: number | null) => v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
const date = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

/** Mount in the item sheet. Unsupported items render nothing and issue no queries. */
export function ItemDetails ({ itemId }: { itemId: number }) {
  const group = groups.find(key => [...RELATED_PRICE_GROUPS[key].inputs, RELATED_PRICE_GROUPS[key].output].some(leg => leg.id === itemId))
  return group ? <Panel key={itemId} group={group} /> : null
}

function Panel ({ group }: { group: RelatedGroupId }) {
  const { palette } = useTheme()
  const [expanded, setExpanded] = useState(false)
  return <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.rule }]}>
    <Pressable onPress={() => setExpanded(!expanded)} accessibilityRole="button" accessibilityState={{ expanded }} style={styles.header}>
      <Text style={[styles.title, { color: palette.ink }]}>Related prices</Text>
      <Text style={{ color: palette.brand }}>{expanded ? 'Hide −' : 'Compare +'}</Text>
    </Pressable>
    {expanded ? <Details group={group} /> : null}
  </View>
}

function Details ({ group }: { group: RelatedGroupId }) {
  const { palette } = useTheme()
  const [side, setSide] = useState<PriceSide>('high')
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<'from' | 'to'>('from')
  const [selection, setSelection] = useState<{ from: number; to: number } | null>(null)
  const preset = RELATED_PRICE_GROUPS[group]
  const legs = [...preset.inputs, preset.output]
  const queries = useQueries({ queries: legs.map(leg => ({
    queryKey: ['timeseries', leg.id, '1h'], queryFn: () => fetchTimeseries(leg.id, '1h'), staleTime: 10 * 60_000, gcTime: 30 * 60_000
  })) })
  // A single hourly window, at most 365 observations per allowlisted item.
  const data = queries.map(q => q.data)
  const prices = (() => {
    if (data.some(rows => !rows)) return null
    const end = Math.max(...data.flatMap(rows => rows!.map(p => p.timestamp)))
    return buildRelatedPrices(group, side, legs.map((leg, i) => ({ id: leg.id, points: data[i]!.slice(-365).filter(p => p.timestamp > end - 365 * 3600) })))
  })()
  const button = (label: string, onPress: () => void, selected = false, disabled = false) => <Pressable key={label} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected, disabled }} style={[styles.button, { backgroundColor: selected ? palette.brand : palette.well, opacity: disabled ? 0.4 : 1 }]}><Text style={{ color: selected ? palette.onBrand : palette.ink, fontSize: 12 }}>{label}</Text></Pressable>
  const colors = [palette.brand, palette.buyLine, palette.ink]
  if (queries.some(q => q.isError)) return <View style={styles.body}><Text style={{ color: palette.muted }}>Related history unavailable.</Text>{button('Retry', () => { queries.forEach(q => { void q.refetch() }) })}</View>
  if (!prices) return <Text style={[styles.body, { color: palette.muted }]}>Loading related history…</Text>
  if (!prices.buckets.length) return <Text style={[styles.body, { color: palette.muted }]}>No hourly buckets available.</Text>
  const buckets = prices.buckets
  const reconciled = reconcileSelection(buckets.map(b => b.timestamp), selection)!
  const { from, to } = reconciled
  const comparison = compareRelatedTimestamps(prices, from, to)
  const values = buckets.flatMap(b => b.legs.flatMap(l => l.indexed === null ? [] : [l.indexed]))
  const min = Math.min(100, ...values) - 1
  const max = Math.max(100, ...values) + 1
  const start = buckets[0].timestamp
  const end = buckets[buckets.length - 1].timestamp
  const x = (t: number) => 8 + (t - start) / Math.max(3600, end - start) * Math.max(0, width - 16)
  const y = (v: number) => 148 - (v - min) / (max - min) * 136
  const select = (timestamp: number) => setSelection({ from, to, [active]: timestamp })
  const move = (delta: number) => {
    const index = buckets.findIndex(b => b.timestamp === (active === 'from' ? from : to))
    select(buckets[Math.max(0, Math.min(buckets.length - 1, index + delta))].timestamp)
  }
  return <View style={styles.body}>
    <Text style={[styles.note, { color: palette.muted }]}>Hourly bucket averages, not simultaneous quotes. Choose a side, then select A and B to compare exact buckets.</Text>
    <View style={styles.row}>{button('High · instant buys', () => setSide('high'), side === 'high')}{button('Low · instant sells', () => setSide('low'), side === 'low')}</View>
    <Text style={[styles.note, { color: palette.muted }]}>{prices.baselineTimestamp === null ? 'No common valid baseline; indexed chart unavailable.' : `Index 100 at first fully matched bucket: ${date(prices.baselineTimestamp)}`}</Text>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height: 164 }}>
      {width > 0 && prices.baselineTimestamp !== null ? <Svg width={width} height={164}>
        <Line x1={8} x2={width - 8} y1={y(100)} y2={y(100)} stroke={palette.rule} />
        {legs.map((leg, i) => <Path key={leg.id} d={indexedPath(prices, i, x, y)} stroke={colors[i]} strokeWidth={2} fill="none" strokeDasharray={i === 2 ? '5 3' : undefined} />)}
        {buckets.flatMap(b => b.legs.map((leg, i) => leg.indexed === null ? null : <Circle key={`${b.timestamp}-${i}`} cx={x(b.timestamp)} cy={y(leg.indexed)} r={1.5} fill={colors[i]} />))}
        {[from, to].map((t, i) => <Line key={i} x1={x(t)} x2={x(t)} y1={4} y2={154} stroke={palette.muted} strokeDasharray="3 3" />)}
      </Svg> : null}
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`Select bucket ${active === 'from' ? 'A' : 'B'} on indexed chart. Use previous and next buttons for exact selection.`} onPress={e => {
        const target = start + Math.max(0, Math.min(1, (e.nativeEvent.locationX - 8) / Math.max(1, width - 16))) * (end - start)
        select(buckets.reduce((best, b) => Math.abs(b.timestamp - target) < Math.abs(best.timestamp - target) ? b : best).timestamp)
      }} />
    </View>
    <View style={styles.row}>{legs.map((leg, i) => <Text key={leg.id} style={[styles.note, { color: colors[i] }]}>{i === 2 ? '┄' : '━'} {leg.name}</Text>)}</View>
    <Text style={[styles.note, { color: palette.muted }]}>Gaps mean missing or unusable observations. Lines never bridge gaps.</Text>
    <View style={styles.row}>{button('A', () => setActive('from'), active === 'from')}{button('B', () => setActive('to'), active === 'to')}{button('Previous bucket', () => move(-1), false, (active === 'from' ? from : to) === start)}{button('Next bucket', () => move(1), false, (active === 'from' ? from : to) === end)}</View>
    {reconciled.reset ? <Text style={[styles.note, { color: palette.muted }]}>A selected bucket expired after refresh. That endpoint now uses the window edge; choose A/B again to compare.</Text> : null}
    <Text style={[styles.note, { color: palette.ink }]}>A · {date(from)}{'\n'}B · {date(to)}</Text>
    {comparison.legs.map((leg, i) => <View key={leg.id} style={[styles.readout, { borderColor: palette.rule }]}>
      <Text style={[styles.title, { color: colors[i] }]}>{legs[i].name}</Text>
      <Text style={[styles.note, { color: palette.ink }]}>A {number(leg.from?.rawGP)} GP · volume {number(leg.from?.volume)}{'\n'}B {number(leg.to?.rawGP)} GP · volume {number(leg.to?.volume)}{'\n'}A → B {change(leg.changePercent)}</Text>
    </View>)}
    <Text style={[styles.note, { color: palette.ink }]}>Input basket · A {number(comparison.from?.inputBasketGP)} GP · B {number(comparison.to?.inputBasketGP)} GP · {change(comparison.inputBasketChangePercent)}{'\n'}Descriptive ratio · A {number(comparison.from?.ratio)}× · B {number(comparison.to?.ratio)}×</Text>
    <Text style={[styles.note, { color: palette.muted }]}>{prices.ratioUnits}. Ratio excludes fees and tax. — means unavailable; endpoint changes require both exact observations.{'\n'}Matched coverage: {prices.coverage.matched}/{prices.coverage.total} buckets ({number((prices.coverage.fraction ?? 0) * 100)}%). {prices.coverage.perLeg.map((leg, i) => `${legs[i].name}: ${leg.valid}/${prices.coverage.total}`).join(' · ')}</Text>
  </View>
}

const styles = StyleSheet.create({
  panel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: 'hidden' },
  header: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '600' },
  body: { padding: 12, gap: 10 },
  note: { fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 7 },
  readout: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 4 }
})
