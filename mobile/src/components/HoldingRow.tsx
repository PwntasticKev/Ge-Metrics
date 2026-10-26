import { memo } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { geTax, type MarketItem } from '@ge/engine'
import { gpFull, qty, signed, stripUncharged } from '../lib/format'
import { BUY_LIMIT_WINDOW_MS } from '../lib/reminders'
import { useFlips, type Holding } from '../state/flips'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { PriceLine } from './DetailLines'
import { FlipRow } from './FlipRow'
import { Sparkline } from './Sparkline'

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function limitText (windowStart: number, now: number): string {
  const resetAt = windowStart + BUY_LIMIT_WINDOW_MS
  return resetAt > now ? `limit resets ${clock(resetAt)}` : 'limit has reset'
}

// Something you bought and still hold: what it's worth if you sell now.
export const HoldingRow = memo(function HoldingRow ({ holding, item, now, expanded, onToggle }: { holding: Holding; item: MarketItem | null; now: number; expanded: boolean; onToggle: (id: string) => void }) {
  const { palette } = useTheme()
  const { sellHolding, removeHolding } = useFlips()
  const sellAt = item?.high ?? null
  const tax = sellAt === null ? 0 : geTax(sellAt, holding.itemId)
  const profitNow = sellAt === null ? null : (sellAt - tax - holding.buyPrice) * holding.qty

  // Asks what it actually sold for, prefilled with the current price.
  const confirmSold = () => {
    Alert.prompt(
      'Sold for how much each?',
      `${qty(holding.qty)} ${holding.name}, bought at ${gpFull(holding.buyPrice)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sold',
          onPress: (text?: string) => {
            const price = Number((text ?? '').replace(/[^0-9]/g, ''))
            if (!Number.isInteger(price) || price <= 0) return
            sellHolding(holding.id, price, geTax(price, holding.itemId))
          }
        }
      ],
      'plain-text',
      sellAt === null ? '' : String(sellAt),
      'number-pad'
    )
  }
  const confirmRemove = () => {
    Alert.alert('Remove without selling?', 'It won\'t count toward what you\'ve made.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeHolding(holding.id) }
    ])
  }

  return (
    <FlipRow
      icon={holding.icon}
      name={stripUncharged(holding.name)}
      meta={`${qty(holding.qty)} at ${gpFull(holding.buyPrice)}, ${limitText(holding.windowStart, now)}`}
      value={signed(profitNow)}
      valueCaption="if sold now"
      valueTone={profitNow !== null && profitNow > 0 ? 'profit' : 'ink'}
      expanded={expanded}
      onToggle={() => onToggle(holding.id)}
    >
      <Sparkline itemId={holding.itemId} />
      <PriceLine tag="Buy" label={`${qty(holding.qty)} paid`} price={holding.buyPrice} />
      {sellAt !== null ? <PriceLine tag="Sell" label="now at" price={sellAt} /> : null}
      <View style={styles.actions}>
        <Pressable onPress={confirmRemove} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.action, { color: palette.muted }]}>Remove</Text>
        </Pressable>
        <Pressable onPress={confirmSold} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.action, { color: palette.brand }]}>Mark sold</Text>
        </Pressable>
      </View>
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xl, paddingTop: 8 },
  action: { fontSize: 13, fontWeight: '600' }
})
