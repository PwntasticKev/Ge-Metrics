import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { computeItemFlip, geTax, type Market, type MarketItem, type WikiAverage } from '@ge/engine'
import { useAverages } from '../api/useAverages'
import { useMarket } from '../api/useMarket'
import { gpFull, gpShort, percent, signed, stripUncharged } from '../lib/format'
import { RECIPES } from '../lib/ranking'
import { useWatchlist } from '../state/watchlist'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { PriceLine } from './DetailLines'
import { ItemIcon } from './ItemIcon'
import { LogBuy } from './LogBuy'
import { PriceChart, type Timestep } from './Sparkline'
import { Tabs } from './Tabs'

const NATURE_RUNE_ID = 561

type Range = 'day' | 'week' | 'month' | 'year'
const RANGES = [
  { value: 'day', label: '1D' },
  { value: 'week', label: '1W' },
  { value: 'month', label: '1M' },
  { value: 'year', label: '1Y' }
] as const
// The wiki returns up to 365 points per timestep.
const RANGE_SERIES: Record<Range, { timestep: Timestep; points: number; label: string }> = {
  day: { timestep: '5m', points: 288, label: '24h' },
  week: { timestep: '1h', points: 168, label: '7d' },
  month: { timestep: '6h', points: 120, label: '30d' },
  year: { timestep: '24h', points: 365, label: '1y' }
}

function Stat ({ label, value, tone }: { label: string; value: string; tone?: 'profit' }) {
  const { palette } = useTheme()
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tone === 'profit' ? palette.profit : palette.ink }]}>{value}</Text>
    </View>
  )
}

function alchProfit (item: MarketItem, market: Market): number | null {
  const nature = market.get(NATURE_RUNE_ID)?.high ?? null
  if (!item.highalch || !item.low || nature === null) return null
  return item.highalch - item.low - nature
}

function setsContaining (itemId: number, market: Market): string[] {
  const names = RECIPES
    .filter(r => r.setId === itemId || r.parts.some(p => p.id === itemId))
    .map(r => market.get(r.setId)?.name)
    .filter((n): n is string => Boolean(n))
  return [...new Set(names)]
}

function dayVolumes (average: WikiAverage | undefined): string {
  if (!average) return '–'
  return `${gpShort(average.lowPriceVolume)} / ${gpShort(average.highPriceVolume)}`
}

// Full details for one item: longer chart, prices to copy, limits, volume.
export function ItemSheet ({ itemId, onClose }: { itemId: number | null; onClose: () => void }) {
  const { palette } = useTheme()
  const { market } = useMarket()
  const { h24 } = useAverages()
  const { isStarred, toggle } = useWatchlist()
  const [range, setRange] = useState<Range>('week')

  const item = itemId !== null && market ? market.get(itemId) : null
  const flip = useMemo(() => (item && market ? computeItemFlip(item, { nowSec: market.nowSec }) : null), [item, market])
  const sets = useMemo(() => (item && market ? setsContaining(item.id, market) : []), [item, market])
  const series = RANGE_SERIES[range]

  return (
    <Modal visible={itemId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
        {item && market ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <ItemIcon icon={item.icon} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>{stripUncharged(item.name)}</Text>
                <Text style={[styles.sub, { color: palette.muted }]}>{item.members ? 'Members' : 'Free to play'}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={[styles.close, { color: palette.brand }]}>Done</Text>
              </Pressable>
            </View>

            <Tabs options={RANGES} value={range} onChange={setRange} />
            <PriceChart key={range} itemId={item.id} timestep={series.timestep} points={series.points} height={150} label={series.label} />

            {flip ? (
              <View style={styles.block}>
                <PriceLine tag="Buy" label="at" price={flip.buyAt} />
                <PriceLine tag="Sell" label="at" price={flip.sellAt} />
                <Text style={[styles.hint, { color: palette.muted }]}>Tap a price to copy it.</Text>
              </View>
            ) : null}

            <View style={[styles.grid, { borderColor: palette.rule }]}>
              <Stat label="Margin after tax" value={flip ? signed(flip.profit) : '–'} tone={flip && flip.profit > 0 ? 'profit' : undefined} />
              <Stat label="Return" value={flip ? percent(flip.roi) : '–'} />
              <Stat label="GE tax" value={flip ? gpFull(geTax(flip.sellAt, item.id)) : '–'} />
              <Stat label="Buy limit" value={item.limit ? `${item.limit.toLocaleString('en-US')} / 4h` : 'Unknown'} />
              <Stat label="Traded today" value={item.dailyVolume !== null ? gpShort(item.dailyVolume) : '–'} />
              <Stat label="Bought / sold 24h" value={dayVolumes(h24?.[item.id])} />
              <Stat label="High alch" value={item.highalch ? gpFull(item.highalch) : '–'} />
              <Stat label="Alch profit" value={signed(alchProfit(item, market))} />
            </View>

            {sets.length ? <Text style={[styles.sub, { color: palette.muted }]}>Part of: {sets.join(', ')}</Text> : null}

            <View style={styles.actions}>
              <Pressable onPress={() => toggle({ kind: 'item', id: item.id })} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.action, { color: palette.brand }]}>{isStarred({ kind: 'item', id: item.id }) ? '★ Watching' : '☆ Watch'}</Text>
              </Pressable>
            </View>
            {flip ? <LogBuy itemId={item.id} name={item.name} icon={item.icon} qty={flip.maxQty || 1} price={flip.buyAt} /> : null}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  content: { padding: space.lg, gap: space.md, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 13 },
  close: { fontSize: 16, fontWeight: '600' },
  block: { gap: 2 },
  hint: { fontSize: 11.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  stat: { width: '50%', paddingVertical: 6 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.xl },
  action: { fontSize: 14, fontWeight: '600' }
})
