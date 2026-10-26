import { router, useLocalSearchParams } from 'expo-router'
import { geTax, type Market, type WikiAverage } from '@ge/engine'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View, type ScrollViewInstance } from 'react-native'
import { useAverages } from '../../api/useAverages'
import { useMarket } from '../../api/useMarket'
import { SlotCard } from '../../components/slots/SlotCard'
import { useSlotActions } from '../../components/slots/useSlotActions'
import { useSlotAdvice, useSlotsSummary } from '../../components/slots/useSlotAdvice'
import { minutesAgo } from '../../lib/format'
import { sampleSlots, type SampleItem } from '../../lib/slots/sample'
import { useNow } from '../../lib/useNow'
import { useSlots } from '../../state/slots'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'

// Only in builds made with EXPO_PUBLIC_SAMPLE_SLOTS=1 (screenshots, demos).
// `gemetrics:///tools/slots?sample=1` adds them without a tap.
const SAMPLES_ENABLED = process.env.EXPO_PUBLIC_SAMPLE_SLOTS === '1'

const SAMPLE_MIN_VOLUME = 20_000
const SAMPLE_MIN_PRICE = 1_000

/** Busy items whose live and last-hour prices both leave a margin after tax. */
function sampleItems (market: Market, h1: Record<string, WikiAverage> | undefined): SampleItem[] {
  return market.all()
    .flatMap(item => {
      const hourHigh = h1?.[String(item.id)]?.avgHighPrice ?? null
      if (!item.low || !item.high || hourHigh === null || item.low < SAMPLE_MIN_PRICE || (item.dailyVolume ?? 0) < SAMPLE_MIN_VOLUME) return []
      const sellAt = Math.min(item.high, hourHigh)
      const margin = sellAt - geTax(sellAt, item.id) - item.low
      return margin > item.low * 0.01 ? [{ item, volume: item.dailyVolume ?? 0, sample: { itemId: item.id, name: item.name, icon: item.icon, low: item.low, high: item.high } }] : []
    })
    .sort((a, b) => b.volume - a.volume)
    .map(x => x.sample)
}

function useSampleLink (add: () => void, ready: boolean) {
  const { sample } = useLocalSearchParams<{ sample?: string }>()
  const done = useRef(false)
  useEffect(() => {
    if (!SAMPLES_ENABLED || sample !== '1' || !ready || done.current) return
    done.current = true
    add()
    router.setParams({ sample: undefined })
  }, [sample, ready, add])
}

/**
 * `?slot=` (a slot id from a notification, or a 1-based slot number)
 * scrolls to that slot once its card has been laid out.
 */
function useSlotScroll (ids: readonly string[]) {
  const { slot } = useLocalSearchParams<{ slot?: string }>()
  const scrollRef = useRef<ScrollViewInstance>(null)
  const offsets = useRef(new Map<string, number>())
  const target = slot ? (ids.includes(slot) ? slot : ids[Number(slot) - 1]) : undefined
  const scrollTo = (id: string | undefined) => {
    const y = id ? offsets.current.get(id) : undefined
    if (y === undefined) return
    scrollRef.current?.scrollTo({ y: Math.max(0, y - space.md), animated: true })
    router.setParams({ slot: undefined })
  }
  const onCardLayout = (id: string, y: number) => {
    offsets.current.set(id, y)
    if (id === target) scrollTo(id)
  }
  // A link can arrive while the screen is already laid out.
  useEffect(() => {
    // Short delay so a push transition settles before scrolling.
    const timer = setTimeout(() => scrollTo(target), 300)
    return () => clearTimeout(timer)
  })
  return { scrollRef, onCardLayout }
}

function EmptySlot ({ index }: { index: number }) {
  const { palette } = useTheme()
  return (
    <View style={[styles.empty, { borderColor: palette.rule }]}>
      <Text style={[styles.emptyText, { color: palette.muted }]}>Slot {index + 1} · empty</Text>
    </View>
  )
}

function NotifyRow () {
  const { palette } = useTheme()
  const { slots } = useSlots()
  const { setNotify } = useSlotActions()
  const toggle = async (on: boolean) => {
    const allowed = await setNotify(on)
    if (!allowed) Alert.alert('Notifications are off', 'Turn on notifications for GE Metrics in iOS Settings to get slot alerts.')
  }
  return (
    <View style={[styles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: palette.ink }]}>Notify me when a slot needs action</Text>
          <Text style={[styles.small, { color: palette.muted }]}>Raise, lower, relist or cancel. At most once an hour per slot, checked with your alerts.</Text>
        </View>
        <Switch value={slots.notify} onValueChange={toggle} trackColor={{ true: palette.brand, false: palette.well }} />
      </View>
    </View>
  )
}

export default function SlotsScreen () {
  const { palette } = useTheme()
  const { slots } = useSlots()
  const prices = useMarket()
  const averages = useAverages()
  const advice = useSlotAdvice(slots.slots)
  const summary = useSlotsSummary()
  const now = useNow()
  const { addSamples, newId } = useSlotActions()
  const [refreshing, setRefreshing] = useState(false)

  const market = prices.market
  const addSampleSlots = () => {
    if (!market) return
    addSamples(sampleSlots(Date.now(), sampleItems(market, averages.h1), newId)).catch(error => console.warn('[slots] samples failed', error))
  }
  useSampleLink(addSampleSlots, Boolean(market))

  const refresh = () => {
    setRefreshing(true)
    prices.refresh()
    averages.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const { scrollRef, onCardLayout } = useSlotScroll(slots.slots.map(s => s.id))
  const empties = Math.max(0, summary.total - slots.slots.length)
  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: palette.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.brand} />}
    >
      <View style={styles.between}>
        <Text style={[styles.summary, { color: summary.needsAction ? palette.brand : palette.ink }]}>{summary.text}</Text>
        <Text style={[styles.small, { color: palette.muted }]}>{market ? `Prices ${minutesAgo(prices.updatedAt, now)}` : 'Loading prices'}</Text>
      </View>
      <Text style={[styles.body, { color: palette.muted }]}>
        Mirror the offers you have up in the GE. Tap the steppers as they fill; buys land on your Bought list. Advice uses live and last-hour prices on each side and the fill-time model.
      </Text>

      {slots.slots.map((slot, i) => (
        <View key={slot.id} onLayout={event => onCardLayout(slot.id, event.nativeEvent.layout.y)}>
          <SlotCard slot={slot} index={i} advice={advice.get(slot.id) ?? null} now={now} />
        </View>
      ))}
      {Array.from({ length: empties }, (_, i) => <EmptySlot key={`empty-${i}`} index={slots.slots.length + i} />)}
      {!slots.slots.length ? (
        <Text style={[styles.body, { color: palette.muted, textAlign: 'center' }]}>
          Place a buy from any pick on Buy now or an item&apos;s details, or a sell from Watchlist, Bought.
        </Text>
      ) : null}

      <NotifyRow />
      {SAMPLES_ENABLED ? (
        <Pressable onPress={addSampleSlots} hitSlop={10} accessibilityRole="button" style={{ alignSelf: 'center' }}>
          <Text style={[styles.label, { color: palette.muted }]}>Sample slots</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.note, { color: palette.muted }]}>
        In a 14-day backtest, realized profit was about half of predicted, mostly from offers that never filled at their price and got dumped. Raise bids that fall behind, lower asks when the market falls, and relist anything up for 4 hours.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md, paddingBottom: 120 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  summary: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 13.5, lineHeight: 19 },
  small: { fontSize: 12.5, lineHeight: 17 },
  label: { fontSize: 15 },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12 },
  empty: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  note: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.sm }
})
