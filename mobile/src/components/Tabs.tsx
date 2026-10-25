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

// Small pill filters, used under the sort tabs so two rows of underlines
// don't stack.
export function Pills<T extends string> ({ options, value, onChange }: { options: readonly TabOption<T>[]; value: T; onChange: (v: T) => void }) {
  const { palette } = useTheme()
  return (
    <View style={pillStyles.row} accessibilityRole="radiogroup">
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
            style={[pillStyles.pill, { backgroundColor: active ? palette.ink : palette.well }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? palette.bg : palette.muted }}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const pillStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 }
})
