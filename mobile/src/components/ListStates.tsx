import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

export function LoadingState () {
  const { palette } = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={palette.brand} />
      <Text style={[styles.text, { color: palette.muted }]}>Loading live prices</Text>
    </View>
  )
}

export function ErrorState ({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { palette } = useTheme()
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: palette.ink }]}>{message}</Text>
      <Text style={[styles.text, { color: palette.muted }]}>Check your connection. Prices come from the OSRS Wiki.</Text>
      <Pressable onPress={onRetry} style={[styles.button, { backgroundColor: palette.brand }]} accessibilityRole="button">
        <Text style={[styles.buttonText, { color: palette.onBrand }]}>Try again</Text>
      </Pressable>
    </View>
  )
}

export function EmptyState ({ title, body }: { title: string; body: string }) {
  const { palette } = useTheme()
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.text, { color: palette.muted }]}>{body}</Text>
    </View>
  )
}

// Thin notice above a list, e.g. when a refresh failed but older prices show.
export function Notice ({ text }: { text: string }) {
  const { palette } = useTheme()
  return <Text style={[styles.notice, { color: palette.muted, backgroundColor: palette.well }]}>{text}</Text>
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm, minHeight: 280 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  text: { fontSize: 14, textAlign: 'center' },
  button: { marginTop: space.md, paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  notice: { fontSize: 12.5, paddingHorizontal: space.lg, paddingVertical: 6 }
})
