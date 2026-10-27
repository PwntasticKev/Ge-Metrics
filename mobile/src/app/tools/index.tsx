import { router, useScrollToTop, type Href } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native'
import type { Market } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { ItemIcon } from '../../components/ItemIcon'
import { ScreenHeader } from '../../components/ScreenHeader'
import { useSlotsSummary } from '../../components/slots/useSlotAdvice'
import { useGameUpdates } from '../../api/gameUpdates'
import { cookingAssumptions } from '../../lib/cookingAssumptions'
import { gpShort, signed, utcDay } from '../../lib/format'
import { PRICE_MOVING_KINDS } from '../../lib/gameUpdates'
import { METHODS, PROCESSING_METHODS, rankMethod, type MethodDef } from '../../lib/methods'
import { agoText, enabledCount } from '../../lib/alertState'
import { useNow } from '../../lib/useNow'
import { useAlerts } from '../../state/alerts'
import { useSettings, type Settings } from '../../state/settings'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'

interface Best {
  assumption?: string
  name: string
  icon: string | null
  value: string
}

function bestFor (method: MethodDef, market: Market | null, settings: Settings): Best | null {
  if (!market) return null
  const top = rankMethod(market, method, method.defaultSort, settings)[0]
  if (!top) return null
  const value = method.defaultSort === 'perHour' && top.perHour !== null ? `${signed(top.perHour)}/hr` : `${signed(top.potential)} per 4h`
  return { name: top.name, icon: top.icon, value, assumption: cookingAssumptions(top.id)?.summary }
}

const FEATURED: { key: string; icon: string }[] = [
  { key: 'money-makers', icon: 'Coins 10000.png' },
  { key: 'decanting', icon: 'Prayer potion(4).png' }
]

function FeaturedCard ({ href, title, blurb, icon, best, bestLabel = 'Best now' }: { href: Href; title: string; blurb: string; icon: string; best: Best | null; bestLabel?: string }) {
  const { palette } = useTheme()
  return (
      <Pressable onPress={() => router.push(href)} style={({ pressed }) => [styles.card, { backgroundColor: palette.card, borderColor: palette.rule }, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <View style={styles.cardTop}>
          <ItemIcon icon={icon} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: palette.ink }]}>{title}</Text>
            <Text style={[styles.blurb, { color: palette.muted }]}>{blurb}</Text>
          </View>
          <Text style={{ color: palette.muted, fontSize: 20 }}>›</Text>
        </View>
        {best ? (
          <View style={[styles.best, { borderTopColor: palette.rule }]}>
            <Text style={[styles.bestLabel, { color: palette.muted }]} numberOfLines={1}>{bestLabel}: {best.name}</Text>
            <Text style={[styles.bestValue, { color: palette.profit }]}>{best.value}</Text>
          </View>
        ) : null}
        {best?.assumption ? <Text style={[styles.blurb, { color: palette.muted }]}>{best.assumption}</Text> : null}
      </Pressable>
  )
}

function SettingsLink () {
  const { palette } = useTheme()
  const { settings } = useSettings()
  const cash = settings.budget ? `Cash stack ${gpShort(settings.budget)}` : 'No cash stack set'
  return (
    <Pressable onPress={() => router.push('/tools/settings')} style={({ pressed }) => [styles.group, styles.row, { backgroundColor: palette.card, borderColor: palette.rule }, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: palette.ink }]}>Settings</Text>
        <Text style={[styles.rowMeta, { color: palette.muted }]}>{cash}, theme, orientation, filters</Text>
      </View>
      <Text style={{ color: palette.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  )
}

function AlertsCard () {
  const { alerts } = useAlerts()
  const now = useNow()
  const on = enabledCount(alerts)
  const latest = alerts.log[0]
  const best = on ? { name: latest ? latest.name : `${on} on`, icon: null, value: latest ? agoText(latest.at, now) : 'Watching' } : null
  return (
    <FeaturedCard
      href="/tools/alerts"
      title="Alerts"
      blurb="Price, margin and 1h dump or pump alerts for any item, checked on your phone. No account."
      icon="Bell.png"
      best={best}
      bestLabel={latest ? 'Last fired' : 'Alerts'}
    />
  )
}

function SlotsToolCard () {
  const summary = useSlotsSummary()
  const best = summary.active ? { name: summary.text, icon: null, value: summary.needsAction ? 'Act now' : 'On track' } : null
  return (
    <FeaturedCard
      href="/tools/slots"
      title="My GE slots"
      blurb="Your offers in the GE with live advice: raise a bid that fell behind, lower an ask in a falling market, relist after 4h."
      icon="Grand Exchange icon.png"
      best={best}
      bestLabel="Now"
    />
  )
}

function MethodRow ({ method, best, last }: { method: MethodDef; best: Best | null; last: boolean }) {
  const { palette } = useTheme()
  return (
      <Pressable onPress={() => router.push(`/tools/${method.key}`)} style={({ pressed }) => [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.rule }, pressed && { opacity: 0.6 }]} accessibilityRole="button">
        <ItemIcon icon={best?.icon ?? null} size={30} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowTitle, { color: palette.ink }]} numberOfLines={1}>{method.title}</Text>
          <Text style={[styles.rowMeta, { color: palette.muted }]} numberOfLines={1}>{best ? best.name : 'Nothing profitable right now'}</Text>
          {best?.assumption ? <Text style={[styles.rowMeta, { color: palette.muted }]}>{best.assumption}</Text> : null}
        </View>
        {best ? <Text style={[styles.rowValue, { color: palette.profit }]}>{best.value}</Text> : null}
      </Pressable>
  )
}

export default function ToolsHub () {
  const { palette } = useTheme()
  const { market } = useMarket()
  const { settings } = useSettings()
  // Tapping Tools again pops back here (native), then scrolls to the top.
  const scrollRef = useRef<ScrollViewInstance>(null)
  useScrollToTop(scrollRef)

  const updates = useGameUpdates()
  const latestPost = useMemo<Best | null>(() => {
    const post = updates.data?.find(u => PRICE_MOVING_KINDS.includes(u.kind))
    return post ? { name: post.title, icon: null, value: utcDay(post.date).replace(/ \d{4}$/, '') } : null
  }, [updates.data])

  const featured = useMemo(() => FEATURED.map(f => ({ ...f, method: METHODS[f.key], best: bestFor(METHODS[f.key], market, settings) })), [market, settings])
  const processing = useMemo(
    () => PROCESSING_METHODS
      .map(method => ({ method, best: bestFor(method, market, settings) }))
      .sort((a, b) => Number(Boolean(b.best)) - Number(Boolean(a.best))),
    [market, settings]
  )

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScreenHeader title="Tools" meta={market ? 'Live prices' : undefined} />
      <ScrollView ref={scrollRef} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
        <Text style={[styles.section, styles.firstSection, { color: palette.muted }]}>Market</Text>
        <FeaturedCard href="/tools/scanner" title="Market scanner" blurb="Margins that just opened, steady 7-day trends, dips below the 30-day mean, and whether the market is up or down today." icon="Market stall.png" best={null} />
        <FeaturedCard href="/tools/coming-up" title="Coming up" blurb="Items named in dev blogs, polls and next-week news, before they ship. Buy early; see what already moved." icon="Spyglass.png" best={null} />
        <FeaturedCard href="/tools/pumps" title="Pumps & dumps" blurb="Sharp price moves on few trades. They often snap back, so don't buy into them." icon="Grand Exchange icon.png" best={null} />
        <FeaturedCard
          href="/tools/update-movers"
          title="Update movers"
          blurb="Items named in the latest game updates and dev blogs, and how far their price moved since."
          icon="Newspaper.png"
          best={latestPost}
          bestLabel="Latest"
        />

        <Text style={[styles.section, { color: palette.muted }]}>While you play</Text>
        <SlotsToolCard />
        <AlertsCard />
        <FeaturedCard href="/tools/mini-window" title="Mini window" blurb="Live prices in a small floating window over the game. Picture in Picture, like a video." icon="Watch.png" best={null} />

        <Text style={[styles.section, { color: palette.muted }]}>Money making</Text>
        {featured.map(f => (
          <FeaturedCard key={f.key} href={`/tools/${f.key}`} title={f.method.title} blurb={f.method.blurb} icon={f.icon} best={f.best} />
        ))}
        <FeaturedCard href="/tools/high-alchemy" title="High Alchemy" blurb="Buy at the GE, cast High Level Alchemy, keep the coins. Nature rune included." icon="Nature rune.png" best={null} />

        <Text style={[styles.section, { color: palette.muted }]}>Processing</Text>
        <FeaturedCard href="/tools/runelite-evidence" title="RuneLite evidence" blurb="Preview a local recorder export, with exact GP values, recording gaps and reconciliation warnings." icon="Grand Exchange icon.png" best={null} />
        <FeaturedCard href="/tools/dose-basket" title="Prayer dose basket" blurb="Compare one- and two-source decanting baskets with exact leftover doses, vial costs and shared limits." icon="Prayer potion(4).png" best={null} />
        <FeaturedCard href="/tools/production-routes" title="Make or buy?" blurb="Compare raw materials, bought intermediates and early exits, including the value of stock you own." icon="Coins 10000.png" best={null} />
        <FeaturedCard href="/tools/set-profit-lab" title="Set profit lab" blurb="See which component moved a set margin, then stress prices and size a cash-limited scenario." icon="Grand Exchange icon.png" best={null} />
        <FeaturedCard href="/tools/batch-coordinator" title="Recipe batch coordinator" blurb="Plan complete batches from your ingredients, cash and remaining shopping. See bottlenecks and surplus." icon="Coins 10000.png" best={null} />
        <FeaturedCard href="/tools/processing-lab" title="Processing profit lab" blurb="Compare what your cash and active time can earn across methods. Try instant and patient prices, and see the bottleneck." icon="Coins 10000.png" best={null} />
        <View style={[styles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>
          {processing.map((p, i) => <MethodRow key={p.method.key} method={p.method} best={p.best} last={i === processing.length - 1} />)}
        </View>

        <SettingsLink />

        <Text style={[styles.note, { color: palette.muted }]}>Everything here comes from the OSRS Wiki and only includes methods you can fully buy and sell on the Grand Exchange, so profits are live. GP/hour is capped by buy limits.</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md, paddingBottom: 120 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontSize: 17, fontWeight: '600' },
  blurb: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  best: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.md, paddingTop: space.sm },
  bestLabel: { flex: 1, fontSize: 13 },
  bestValue: { fontSize: 15, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '600', marginTop: space.sm },
  firstSection: { marginTop: 0 },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 11 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12.5, marginTop: 1 },
  rowValue: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.lg }
})
