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
  value: string
  valueCaption: string
  valueTone?: 'profit' | 'ink'
  expanded: boolean
  onToggle: () => void
  /** Small pills after the name, e.g. "Thin-volume spike". */
  badges?: readonly string[]
  children?: ReactNode
}

// One slim list row. Tapping opens the detail block in place.
export const FlipRow = memo(function FlipRow ({ icon, name, meta, value, valueCaption, valueTone = 'profit', expanded, onToggle, badges, children }: Props) {
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
        accessibilityLabel={`${name}, ${badges?.length ? `${badges.join(', ')}, ` : ''}${value} ${valueCaption}`}
      >
        <ItemIcon icon={icon} />
        <View style={styles.text}>
          <View style={styles.nameRow}>
            <Text style={[type.name, styles.name, { color: palette.ink }]} numberOfLines={1}>{name}</Text>
            {badges?.map(b => <Text key={b} style={[styles.badge, { color: palette.brand, backgroundColor: palette.well }]}>{b}</Text>)}
          </View>
          <Text style={[type.meta, { color: palette.muted }]} numberOfLines={1}>{meta}</Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  badge: { fontSize: 10.5, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, overflow: 'hidden' },
  right: { alignItems: 'flex-end' },
  detail: { paddingLeft: 60, paddingRight: space.lg, paddingBottom: space.md }
})
