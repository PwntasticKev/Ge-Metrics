import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { SharePick } from '../../lib/shareCard'
import { useTheme } from '../../theme/ThemeProvider'
import { useSharePick } from './useSharePick'

// "Share pick": the pick as an image card through the share sheet.
export function ShareLink ({ pick }: { pick: SharePick | null }) {
  const { palette } = useTheme()
  const { share, busy, error, card } = useSharePick()
  if (!pick) return null
  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => share({ ...pick, at: Date.now() })} disabled={busy} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share this pick as an image">
        <Text style={[styles.link, { color: palette.brand, opacity: busy ? 0.5 : 1 }]}>{busy ? 'Making image…' : 'Share pick'}</Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: palette.muted }]}>{error}</Text> : null}
      {card}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, alignSelf: 'flex-start', gap: 4 },
  link: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 12.5 }
})
