import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'

export interface ChipOption<T> {
  value: T
  label: string
}

// Compact single-choice chips for forms (no outer padding, unlike Pills).
export function Chips<T> ({ options, value, onChange, label }: { options: readonly ChipOption<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const { palette } = useTheme()
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(option => {
        const active = option.value === value
        return (
          <Pressable
            key={option.label}
            onPress={() => {
              if (active) return
              Haptics.selectionAsync()
              onChange(option.value)
            }}
            style={[styles.chip, { backgroundColor: active ? palette.brand : palette.well }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, { color: active ? palette.onBrand : palette.muted }]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99 },
  text: { fontSize: 13, fontWeight: '600' }
})
