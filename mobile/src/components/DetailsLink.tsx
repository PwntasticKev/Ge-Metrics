import { Pressable, StyleSheet, Text } from 'react-native'
import { useItemSheet } from '../state/itemSheet'
import { useTheme } from '../theme/ThemeProvider'

export function DetailsLink ({ itemId }: { itemId: number }) {
  const { palette } = useTheme()
  const { openItem } = useItemSheet()
  return (
    <Pressable onPress={() => openItem(itemId)} hitSlop={8} accessibilityRole="button" style={styles.link}>
      <Text style={[styles.text, { color: palette.brand }]}>Chart and details ›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  link: { paddingTop: 8, alignSelf: 'flex-start' },
  text: { fontSize: 13, fontWeight: '600' }
})
