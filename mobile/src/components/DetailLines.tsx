import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { gpFull } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { ItemIcon } from './ItemIcon'

// "Buy  [icon] full helm      172,500,000"
export function PriceLine ({ tag, icon, label, price, divider = false }: { tag: 'Buy' | 'Sell'; icon?: string | null; label: string; price: number; divider?: boolean }) {
  const { palette } = useTheme()
  return (
    <View style={[styles.line, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.rule, marginTop: 4, paddingTop: 7 }]}>
      <Text style={[styles.tag, { color: palette.muted }]}>{tag}</Text>
      {icon !== undefined ? <ItemIcon icon={icon} size={20} framed={false} /> : null}
      <Text style={[styles.label, { color: palette.ink }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.price, { color: palette.ink }]} selectable>{gpFull(price)}</Text>
    </View>
  )
}

// "After 5,000,000 tax        +6,659,530"  plus the watchlist star.
export function ProfitFooter ({ tax, profit, starred, onStar }: { tax: number; profit: number; starred: boolean; onStar: () => void }) {
  const { palette } = useTheme()
  return (
    <View style={styles.footer}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStar() }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={starred ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Text style={[styles.star, { color: starred ? palette.brand : palette.muted }]}>{starred ? '★ Watching' : '☆ Watch'}</Text>
      </Pressable>
      <Text style={[styles.tax, { color: palette.muted }]}>After {gpFull(tax)} tax</Text>
      <Text style={[styles.profit, { color: palette.profit }]}>{profit >= 0 ? '+' : ''}{gpFull(profit)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 3 },
  tag: { width: 30, fontSize: 12, fontWeight: '600' },
  label: { flex: 1, fontSize: 14 },
  price: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: 8 },
  star: { fontSize: 13, fontWeight: '600' },
  tax: { flex: 1, fontSize: 13, textAlign: 'right' },
  profit: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }
})
