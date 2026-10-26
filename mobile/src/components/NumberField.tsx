import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

/** Whole positive number from what was typed ("1,250" -> 1250), or null. */
export const toInt = (text: string) => {
  const n = Number(text.replace(/[^0-9]/g, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}

// Labelled number input used by the buy and sell forms.
export function NumberField ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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

export const formStyles = StyleSheet.create({
  form: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8, gap: 6 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.lg, paddingTop: 2 },
  linkText: { fontSize: 13, fontWeight: '600' },
  save: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  saveText: { fontSize: 14, fontWeight: '600' }
})

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { width: 80, fontSize: 13 },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontVariant: ['tabular-nums'] }
})
