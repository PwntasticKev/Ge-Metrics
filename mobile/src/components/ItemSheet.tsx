import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { computeItemFlip, geTax, type Market, type MarketItem, type WikiAverage } from '@ge/engine'
import { useAverages } from '../api/useAverages'
import { useMarket } from '../api/useMarket'
import { amountCaption } from '../lib/fillText'
import { gpFull, gpShort, percent, signed, stripUncharged } from '../lib/format'
import { sharePickFromOffer, type SharePick } from '../lib/shareCard'
import { SHEET_HORIZON_HOURS, type SheetFill } from '../lib/sheetFill'
import { RECIPES } from '../lib/ranking'
import { useSettings } from '../state/settings'
import { useWatchlist } from '../state/watchlist'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { ItemAlerts } from './alerts/ItemAlerts'
import { ItemIcon } from './ItemIcon'
import { LogBuy } from './LogBuy'
import { PlaceOffer } from './slots/PlaceOffer'
import { SheetPrices } from './sheet/SheetPrices'
import { useSheetFill } from './sheet/useSheetFill'
import { useSharePick } from './share/useSharePick'
import { SpikeWarning } from './SpikeWarning'
import { ItemChart, type Timestep } from './chart/ItemChart'
import { Tabs } from './Tabs'
import { TimingSection } from './timing/TimingSection'

const NATURE_RUNE_ID = 561

type Range = 'day' | 'week' | 'month' | 'quarter' | 'year'
const RANGES = [
  { value: 'day', label: '1D' },
  { value: 'week', label: '1W' },
  { value: 'month', label: '1M' },
  { value: 'quarter', label: '3M' },
  { value: 'year', label: '1Y' }
] as const
// The wiki returns up to 365 points per timestep; 1M and 3M share the 6h series.
const RANGE_SERIES: Record<Range, { timestep: Timestep; points: number; label: string }> = {
  day: { timestep: '5m', points: 288, label: 'Last 24 hours' },
  week: { timestep: '1h', points: 168, label: 'Last 7 days' },
  month: { timestep: '6h', points: 120, label: 'Last 30 days' },
  quarter: { timestep: '6h', points: 365, label: 'Last 3 months' },
  year: { timestep: '24h', points: 365, label: 'Last year' }
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

function sharePickOf (item: MarketItem, fill: SheetFill | null): SharePick | null {
  if (!fill || fill.qty < 1) return null
  return sharePickFromOffer(fill, item, Date.now())
}

function dayVolumes (average: WikiAverage | undefined): string {
  if (!average) return '–'
  return `${gpShort(average.lowPriceVolume)} / ${gpShort(average.highPriceVolume)}`
}

// Full details for one item: longer chart, prices to copy, limits, volume.
// The body (and its price hooks) only mounts while an item is shown.
export function ItemSheet ({ itemId, visible, exportCard = false, onClose, onDismissed }: { itemId: number | null; visible: boolean; exportCard?: boolean; onClose: () => void; onDismissed: () => void }) {
  const { palette } = useTheme()
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismissed}>
      <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
        {itemId !== null ? <ItemSheetBody key={itemId} itemId={itemId} exportCard={exportCard} onClose={onClose} /> : null}
      </View>
    </Modal>
  )
}

// Dev export (itemSheet's ?card=export): once the hourly history has set the
// prices, write the share card PNG to the documents dir instead of sharing.
function useCardExport (enabled: boolean, fill: SheetFill | null, pick: SharePick | null, exportCard: (pick: SharePick) => Promise<string | null>) {
  const done = useRef(false)
  useEffect(() => {
    if (!enabled || done.current || !pick || fill?.basis !== 'series') return
    done.current = true
    exportCard(pick).then(uri => console.log(`Share card written to ${uri}`))
  }, [enabled, fill, pick, exportCard])
}

function ItemSheetBody ({ itemId, exportCard, onClose }: { itemId: number; exportCard: boolean; onClose: () => void }) {
  const { palette } = useTheme()
  const { market, isLoading } = useMarket()
  const { h24 } = useAverages()
  const { isStarred, toggle } = useWatchlist()
  const { settings } = useSettings()
  const sharing = useSharePick()
  const [range, setRange] = useState<Range>('week')
  const [scrubbing, setScrubbing] = useState(false)

  const item = market ? market.get(itemId) : null
  const flip = useMemo(() => (item && market ? computeItemFlip(item, { nowSec: market.nowSec }) : null), [item, market])
  const fill = useSheetFill(item ?? null)
  const sharePick = useMemo(() => (item ? sharePickOf(item, fill) : null), [item, fill])
  useCardExport(exportCard, fill, sharePick, sharing.exportCard)
  const sets = useMemo(() => (item && market ? setsContaining(item.id, market) : []), [item, market])
  const series = RANGE_SERIES[range]

  const close = (
    <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
      <Text style={[styles.close, { color: palette.brand }]}>Done</Text>
    </Pressable>
  )

  // Offers and stats use the realistic prices; the live ones only until there are none.
  const deal = fill
    ? { buyAt: fill.buyAt, sellAt: fill.sellAt, margin: fill.margin, roi: fill.roi, qty: fill.qty || 1 }
    : flip ? { buyAt: flip.buyAt, sellAt: flip.sellAt, margin: flip.profit, roi: flip.roi, qty: flip.maxQty || 1 } : null

  if (!item || !market) {
    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.ink, flex: 1 }]}>{isLoading ? 'Loading prices' : 'Item not found'}</Text>
          {close}
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.content} scrollEnabled={!scrubbing} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <ItemIcon icon={item.icon} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>{stripUncharged(item.name)}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{item.members ? 'Members' : 'Free to play'}</Text>
        </View>
        {close}
      </View>
      <SpikeWarning itemId={item.id} />

      <Tabs options={RANGES} value={range} onChange={setRange} />
      <ItemChart key={range} itemId={item.id} timestep={series.timestep} points={series.points} label={series.label} onScrubbingChange={setScrubbing} />

      <SheetPrices fill={fill} instant={flip ? { buyAt: flip.buyAt, sellAt: flip.sellAt, margin: flip.profit } : null} maxSellHours={settings.maxSellHours} />

      <View style={[styles.grid, { borderColor: palette.rule }]}>
        <Stat label="Margin after tax" value={deal ? signed(deal.margin) : '–'} tone={deal && deal.margin > 0 ? 'profit' : undefined} />
        <Stat label="Return" value={deal ? percent(deal.roi) : '–'} />
        <Stat label="GE tax" value={deal ? gpFull(geTax(deal.sellAt, item.id)) : '–'} />
        <Stat label={fill && fill.qty >= 1 ? `Profit, ${amountCaption(fill.qty, `in ${SHEET_HORIZON_HOURS}h`, fill.refined)}` : `Profit in ${SHEET_HORIZON_HOURS}h`} value={fill && fill.qty >= 1 ? signed(fill.profit) : '–'} tone={fill && fill.profit > 0 ? 'profit' : undefined} />
        <Stat label="Buy limit" value={item.limit ? `${item.limit.toLocaleString('en-US')} / 4h` : 'Unknown'} />
        <Stat label="Traded today" value={item.dailyVolume !== null ? gpShort(item.dailyVolume) : '–'} />
        <Stat label="Bought / sold 24h" value={dayVolumes(h24?.[item.id])} />
        <Stat label="High alch" value={item.highalch ? gpFull(item.highalch) : '–'} />
        <Stat label="Alch profit" value={signed(alchProfit(item, market))} />
      </View>

      {deal ? <TimingSection itemId={item.id} buyAt={deal.buyAt} sellAt={deal.sellAt} profitEach={deal.margin} limit={item.limit ?? flip?.limit ?? null} /> : null}

      {sets.length ? <Text style={[styles.sub, { color: palette.muted }]}>Part of: {sets.join(', ')}</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={() => toggle({ kind: 'item', id: item.id })} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.action, { color: palette.brand }]}>{isStarred({ kind: 'item', id: item.id }) ? '★ Watching' : '☆ Watch'}</Text>
        </Pressable>
        {sharePick ? (
          <Pressable onPress={() => sharing.share({ ...sharePick, at: Date.now() })} disabled={sharing.busy} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share this pick as an image">
            <Text style={[styles.action, { color: palette.brand, opacity: sharing.busy ? 0.5 : 1 }]}>{sharing.busy ? 'Making image…' : 'Share pick'}</Text>
          </Pressable>
        ) : null}
      </View>
      {sharing.error ? <Text style={[styles.hint, { color: palette.muted }]}>{sharing.error}</Text> : null}
      <ItemAlerts item={{ itemId: item.id, name: item.name, icon: item.icon, high: item.high, low: item.low, margin: flip?.profit ?? null }} />
      {deal ? (
        <PlaceOffer offers={[
          { itemId: item.id, name: item.name, icon: item.icon, side: 'buy', price: deal.buyAt, qty: deal.qty, target: deal.sellAt },
          { itemId: item.id, name: item.name, icon: item.icon, side: 'sell', price: deal.sellAt, qty: deal.qty }
        ]} />
      ) : null}
      {deal ? <LogBuy itemId={item.id} name={item.name} icon={item.icon} qty={deal.qty} price={deal.buyAt} /> : null}
      {sharing.card}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  content: { padding: space.lg, gap: space.md, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 13 },
  close: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 11.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  stat: { width: '50%', paddingVertical: 6 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.xl },
  action: { fontSize: 14, fontWeight: '600' }
})
