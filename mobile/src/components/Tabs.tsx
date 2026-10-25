import * as Haptics from 'expo-haptics'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

export interface TabOption<T extends string> {
  value: T
  label: string
}

// Text tabs with an underline, used for sorting and filtering lists.
export function Tabs<T extends string> ({ options, value, onChange }: { options: readonly TabOption<T>[]; value: T; onChange: (v: T) => void }) {
  const { palette } = useTheme()
  return (
    <View style={[styles.row, { borderBottomColor: palette.rule }]} accessibilityRole="tablist">
      {options.map(option => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (active) return
              Haptics.selectionAsync()
              onChange(option.value)
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={8}
          >
            <Text style={[styles.label, { color: active ? palette.ink : palette.muted, fontWeight: active ? '600' : '400', borderBottomColor: active ? palette.brand : 'transparent' }]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 18, paddingHorizontal: space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 14, paddingBottom: 8, borderBottomWidth: 2 }
})
