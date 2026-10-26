import * as Haptics from 'expo-haptics'
import { memo, type ReactNode } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { space, type } from '../theme/tokens'
import { ItemIcon } from './ItemIcon'

interface Props {
  icon: string | null
  name: string
  meta: string
  /** Optional third line under the meta, e.g. the sell helper. */
  note?: string
  value: string
  valueCaption: string
  valueTone?: 'profit' | 'ink'
  expanded: boolean
  onToggle: () => void
  children?: ReactNode
}

// One slim list row. Tapping opens the detail block in place.
export const FlipRow = memo(function FlipRow ({ icon, name, meta, note, value, valueCaption, valueTone = 'profit', expanded, onToggle, children }: Props) {
  const { palette } = useTheme()
  return (
    <View style={[styles.wrap, { borderBottomColor: palette.rule, backgroundColor: expanded ? palette.card : palette.bg }]}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync()
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          onToggle()
        }}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${name}, ${value} ${valueCaption}${note ? `. ${note}` : ''}`}
      >
        <ItemIcon icon={icon} />
        <View style={styles.text}>
          <Text style={[type.name, { color: palette.ink }]} numberOfLines={1}>{name}</Text>
          <Text style={[type.meta, { color: palette.muted }]} numberOfLines={1}>{meta}</Text>
          {note ? <Text style={[type.meta, { color: palette.ink }]} numberOfLines={2}>{note}</Text> : null}
        </View>
        <View style={styles.right}>
          <Text style={[type.profit, { color: valueTone === 'profit' ? palette.profit : palette.ink }]}>{value}</Text>
          <Text style={[type.meta, { color: palette.muted }]}>{valueCaption}</Text>
        </View>
      </Pressable>
      {expanded && children ? <View style={styles.detail}>{children}</View> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  text: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
  detail: { paddingLeft: 60, paddingRight: space.lg, paddingBottom: space.md }
})
