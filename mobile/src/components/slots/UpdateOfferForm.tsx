import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { gpFull } from '../../lib/format'
import type { Slot } from '../../lib/slots/slots'
import { useTheme } from '../../theme/ThemeProvider'
import { formStyles, NumberField, toInt } from '../NumberField'
import { useSlotActions } from './useSlotActions'

// "Update offer": the new price (prefilled with the advice) and amount.
// Saving records the change and restarts the slot's 4h clock.
export function UpdateOfferForm ({ slot, suggested, onDone }: { slot: Slot; suggested: number | null; onDone: () => void }) {
  const { palette } = useTheme()
  const { update } = useSlotActions()
  const [priceText, setPriceText] = useState(String(suggested ?? slot.price))
  const [qtyText, setQtyText] = useState(String(slot.qty))
  const [error, setError] = useState<string | null>(null)
  const price = toInt(priceText)
  const qty = toInt(qtyText)
  const tooFew = qty !== null && qty < slot.filled
  const valid = price !== null && qty !== null && !tooFew

  const save = async () => {
    if (!valid) return
    if (await update(slot.id, price, qty)) onDone()
    else setError('Couldn\'t save that. Check the price and amount.')
  }

  const hint = tooFew
    ? `${gpFull(slot.filled)} already filled; the amount can't go under that.`
    : error ?? (price !== null ? `${price === slot.price ? 'Same price' : `${price > slot.price ? '+' : ''}${gpFull(price - slot.price)} each`}. In the GE: abort, collect, place again.` : ' ')

  return (
    <View style={[formStyles.form, { borderTopColor: palette.rule }]}>
      <NumberField label="New price" value={priceText} onChange={setPriceText} />
      <NumberField label="Amount" value={qtyText} onChange={setQtyText} />
      <Text style={[styles.hint, { color: palette.muted }]}>{hint}</Text>
      <View style={formStyles.buttons}>
        <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button">
          <Text style={[formStyles.linkText, { color: palette.muted }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={!valid} style={[formStyles.save, { backgroundColor: palette.brand, opacity: valid ? 1 : 0.4 }]} accessibilityRole="button">
          <Text style={[formStyles.saveText, { color: palette.onBrand }]}>Update</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hint: { fontSize: 12.5 }
})
