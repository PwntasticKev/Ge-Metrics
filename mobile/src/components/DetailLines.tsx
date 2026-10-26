import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
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
      <CopyPrice price={price} />
    </View>
  )
}

const COPIED_MS = 1200

// Tap a price to copy it, ready to paste into the GE on OSRS mobile.
export function CopyPrice ({ price }: { price: number }) {
  const { palette } = useTheme()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = () => {
    Clipboard.setStringAsync(String(Math.round(price)))
      .then(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        setCopied(true)
      })
      .catch(error => console.warn('Could not copy the price', error))
  }
  return (
    <Pressable onPress={copy} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Copy ${gpFull(price)}`}>
      <Text style={[styles.price, { color: copied ? palette.brand : palette.ink }]}>{copied ? 'Copied' : gpFull(price)}</Text>
    </Pressable>
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
      <Text style={[styles.profit, { color: profit > 0 ? palette.profit : palette.ink }]}>{profit >= 0 ? '+' : ''}{gpFull(profit)}</Text>
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
