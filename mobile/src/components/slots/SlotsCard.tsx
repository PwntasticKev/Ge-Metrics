import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { useSlotsSummary } from './useSlotAdvice'

// A one-line entry to My GE slots for the top of Buy now:
// "My GE slots  3/8 slots active · 1 needs action  ›".
export function SlotsCard () {
  const { palette } = useTheme()
  const summary = useSlotsSummary()
  const urgent = summary.needsAction > 0
  return (
    <Pressable
      onPress={() => router.push('/tools/slots')}
      style={({ pressed }) => [styles.card, { backgroundColor: urgent ? palette.well : palette.card, borderColor: urgent ? palette.brand : palette.rule }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`My GE slots, ${summary.text}`}
    >
      <View style={styles.text}>
        <Text style={[styles.title, { color: palette.ink }]}>My GE slots</Text>
        <Text style={[styles.meta, { color: urgent ? palette.brand : palette.muted }]} numberOfLines={1}>
          {summary.active ? summary.text : 'Track your offers and when to raise, lower or relist'}
        </Text>
      </View>
      <Text style={{ color: palette.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginBottom: space.sm, paddingHorizontal: space.md, paddingVertical: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12.5, marginTop: 1, fontWeight: '500' }
})
