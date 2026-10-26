import { geTax } from '@ge/engine'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { signed } from '../lib/format'
import { flipProfit, isGeInt, saleTax } from '../lib/pnl/journal'
import { useFlips, type Holding } from '../state/flips'
import { useTheme } from '../theme/ThemeProvider'
import { formStyles, NumberField, toInt } from './NumberField'

// "Mark sold": how many sold and at what price. Selling part of a lot keeps
// the rest on the Bought tab; each sale goes into the Profit journal.
export function SellForm ({ holding, suggestedPrice, onDone }: { holding: Holding; suggestedPrice: number | null; onDone: () => void }) {
  const { palette } = useTheme()
  const { sellHolding } = useFlips()
  const [qtyText, setQtyText] = useState(String(holding.qty))
  const [priceText, setPriceText] = useState(suggestedPrice ? String(suggestedPrice) : '')
  const qty = toInt(qtyText)
  const price = toInt(priceText)
  const tooMany = qty !== null && qty > holding.qty
  const valid = isGeInt(qty) && isGeInt(price) && !tooMany
  const preview = valid ? flipProfit(holding.buyPrice, price, qty, saleTax(price, qty, holding.itemId, geTax)) : null

  const save = () => {
    if (!valid || !sellHolding(holding.id, price, qty)) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onDone()
  }

  return (
    <View style={[formStyles.form, { borderTopColor: palette.rule }]}>
      <NumberField label="How many" value={qtyText} onChange={setQtyText} />
      <NumberField label="Sold at each" value={priceText} onChange={setPriceText} />
      <Text style={[styles.preview, { color: palette.muted }]}>
        {tooMany ? `You hold ${holding.qty.toLocaleString('en-US')}.` : preview !== null ? `${signed(preview)} after GE tax${qty !== null && qty < holding.qty ? `, ${(holding.qty - qty).toLocaleString('en-US')} left to sell` : ''}` : ' '}
      </Text>
      <View style={formStyles.buttons}>
        <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button">
          <Text style={[formStyles.linkText, { color: palette.muted }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={!valid} style={[formStyles.save, { backgroundColor: palette.brand, opacity: valid ? 1 : 0.4 }]} accessibilityRole="button">
          <Text style={[formStyles.saveText, { color: palette.onBrand }]}>Sold</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  preview: { fontSize: 12.5, fontVariant: ['tabular-nums'] }
})
