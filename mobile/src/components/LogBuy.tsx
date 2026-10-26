import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFlips } from '../state/flips'
import { useTheme } from '../theme/ThemeProvider'
import { formStyles, NumberField as Field, toInt } from './NumberField'

// "I bought these": logs a purchase to the Bought tab, prefilled with the
// suggested amount and price, and sets a buy-limit reminder.
export function LogBuy ({ itemId, name, icon, qty, price }: { itemId: number; name: string; icon: string | null; qty: number; price: number }) {
  const { palette } = useTheme()
  const { addHolding } = useFlips()
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<'reminder' | 'no-reminder' | null>(null)
  const [saving, setSaving] = useState(false)
  const [qtyText, setQtyText] = useState(String(qty))
  const [priceText, setPriceText] = useState(String(price))
  const qtyValue = toInt(qtyText)
  const priceValue = toInt(priceText)
  const valid = qtyValue !== null && priceValue !== null && !saving

  if (saved) {
    const reminder = saved === 'reminder' ? ' We\'ll remind you when the buy limit resets.' : ' Turn on notifications in iOS Settings to get buy-limit reminders.'
    return <Text style={[styles.done, { color: palette.muted }]}>Saved to Watchlist, Bought.{reminder}</Text>
  }
  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityRole="button" style={styles.link}>
        <Text style={[styles.linkText, { color: palette.brand }]}>I bought these</Text>
      </Pressable>
    )
  }

  const save = async () => {
    if (qtyValue === null || priceValue === null || saving) return
    setSaving(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const reminded = await addHolding({ itemId, name, icon, qty: qtyValue, buyPrice: priceValue })
    setSaved(reminded ? 'reminder' : 'no-reminder')
  }

  return (
    <View style={[styles.form, { borderTopColor: palette.rule }]}>
      <Field label="How many" value={qtyText} onChange={setQtyText} />
      <Field label="Price each" value={priceText} onChange={setPriceText} />
      <View style={styles.buttons}>
        <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.linkText, { color: palette.muted }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={!valid} style={[styles.save, { backgroundColor: palette.brand, opacity: valid ? 1 : 0.4 }]} accessibilityRole="button">
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  ...formStyles,
  link: { paddingTop: 8, alignSelf: 'flex-start' },
  done: { fontSize: 12.5, paddingTop: 8 },
  saveText: { ...formStyles.saveText, color: '#FFFFFF' }
})
