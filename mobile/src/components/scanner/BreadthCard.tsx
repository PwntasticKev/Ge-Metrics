import type { Market } from '@ge/engine'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Breadth } from '../../lib/breadth'
import { gpShort, stripUncharged } from '../../lib/format'
import type { Move } from '../../lib/marketMoves'
import { breadthShares, MOOD_LABEL, signedPct } from '../../lib/scanText'
import { useItemSheet } from '../../state/itemSheet'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { ItemIcon } from '../ItemIcon'

function MoverLine ({ move, market }: { move: Move; market: Market }) {
  const { palette } = useTheme()
  const { openItem } = useItemSheet()
  const item = market.get(move.id)
  if (!item) return null
  const up = (move.change24h ?? 0) >= 0
  return (
    <Pressable onPress={() => openItem(move.id)} style={({ pressed }) => [styles.mover, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`${item.name}, ${signedPct(move.change24h)} in 24 hours`}>
      <ItemIcon icon={item.icon} size={22} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.moverName, { color: palette.ink }]} numberOfLines={1}>{stripUncharged(item.name)}</Text>
        <Text style={[styles.small, { color: palette.muted }]}>{gpShort(move.valueTraded)} traded in 24h</Text>
      </View>
      <Text style={[styles.moverPct, { color: up ? palette.profit : palette.muted }]}>{signedPct(move.change24h)}</Text>
    </Pressable>
  )
}

function ShareBar ({ breadth }: { breadth: Breadth }) {
  const { palette } = useTheme()
  const shares = breadthShares(breadth)
  return (
    <View style={[styles.bar, { backgroundColor: palette.well }]} accessibilityLabel={`${shares.up}% up, ${shares.down}% down`}>
      <View style={{ flex: Math.max(breadth.up, 0.001), backgroundColor: palette.brand }} />
      <View style={{ flex: Math.max(breadth.flat, 0.001), backgroundColor: palette.well }} />
      <View style={{ flex: Math.max(breadth.down, 0.001), backgroundColor: palette.muted }} />
    </View>
  )
}

// Header card: how much of the market rose or fell in 24h, a value-weighted
// index of the most traded items, and that index's biggest movers.
export function BreadthCard ({ breadth, market }: { breadth: Breadth | null; market: Market | null }) {
  const { palette } = useTheme()
  if (!breadth || !market) {
    return (
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
        <Text style={[styles.title, { color: palette.ink }]}>Market</Text>
        <Text style={[styles.small, { color: palette.muted }]}>Loading yesterday&apos;s prices to compare</Text>
      </View>
    )
  }
  const shares = breadthShares(breadth)
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: palette.ink }]}>Market</Text>
        <Text style={[styles.mood, { color: palette.brand, backgroundColor: palette.well }]}>{MOOD_LABEL[breadth.mood]}</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: (breadth.index24h ?? 0) >= 0 ? palette.profit : palette.ink }]}>{signedPct(breadth.index24h)}</Text>
          <Text style={[styles.small, { color: palette.muted }]}>Top {breadth.indexSize} index, 24h</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: (breadth.index7d ?? 0) >= 0 ? palette.profit : palette.ink }]}>{signedPct(breadth.index7d)}</Text>
          <Text style={[styles.small, { color: palette.muted }]}>Index, 7d</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: palette.ink }]}>{shares.up}% / {shares.down}%</Text>
          <Text style={[styles.small, { color: palette.muted }]}>Up / down, 24h</Text>
        </View>
      </View>
      <ShareBar breadth={breadth} />
      <Text style={[styles.small, { color: palette.muted, marginTop: 4 }]}>{breadth.up} up, {breadth.down} down, {breadth.flat} within 1% of {breadth.counted} liquid items</Text>
      <View style={styles.movers}>
        <View style={styles.column}>
          <Text style={[styles.columnTitle, { color: palette.muted }]}>Index gainers</Text>
          {breadth.gainers.map(m => <MoverLine key={m.id} move={m} market={market} />)}
        </View>
        <View style={styles.column}>
          <Text style={[styles.columnTitle, { color: palette.muted }]}>Index losers</Text>
          {breadth.losers.map(m => <MoverLine key={m.id} move={m} market={market} />)}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { margin: space.lg, marginBottom: space.sm, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '600' },
  mood: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, overflow: 'hidden' },
  stats: { flexDirection: 'row', marginTop: space.md, marginBottom: space.sm },
  stat: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  small: { fontSize: 11.5 },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  movers: { gap: space.md, marginTop: space.md },
  column: { gap: 6 },
  columnTitle: { fontSize: 12, fontWeight: '600' },
  mover: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moverName: { fontSize: 13, fontWeight: '600' },
  moverPct: { fontSize: 13, fontWeight: '700' }
})
