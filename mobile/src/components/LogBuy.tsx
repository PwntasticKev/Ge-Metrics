import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFlips } from '../state/flips'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

const toInt = (text: string) => {
  const n = Number(text.replace(/[^0-9]/g, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}

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

function Field ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { palette } = useTheme()
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.input, { backgroundColor: palette.well, color: palette.ink }]}
        accessibilityLabel={label}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  link: { paddingTop: 8, alignSelf: 'flex-start' },
  linkText: { fontSize: 13, fontWeight: '600' },
  done: { fontSize: 12.5, paddingTop: 8 },
  form: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8, gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { width: 80, fontSize: 13 },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.lg, paddingTop: 2 },
  save: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' }
})
