import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Regime } from '../lib/regime'
import { useTheme } from '../theme/ThemeProvider'

/** Opacity of quick picks while the regime says stand aside. */
export const STAND_ASIDE_OPACITY = 0.4

interface Props {
  regime: Regime
  /** The trader chose to see stand-aside picks at full strength. */
  shownAnyway: boolean
  onToggleShown: () => void
}

// One message for Buy now's quick lists: stand aside around a big release
// (picks stay listed, dimmed, behind "Show anyway"), or risk-off half size.
export function RegimeBanner ({ regime, shownAnyway, onToggleShown }: Props) {
  const { palette } = useTheme()
  if (regime.state === 'trade') return null
  const text = regime.reasons.map(r => r.text).join(' ')
  return (
    <View style={[styles.warn, { backgroundColor: palette.well }]} accessibilityRole="alert">
      <Text style={[styles.text, { color: palette.ink }]}>{text}</Text>
      {regime.state === 'stand-aside'
        ? (
          <Pressable onPress={onToggleShown} accessibilityRole="button" hitSlop={8} style={styles.action}>
            <Text style={[styles.actionText, { color: palette.brand }]}>{shownAnyway ? 'Dim picks again' : 'Show anyway'}</Text>
          </Pressable>
          )
        : null}
    </View>
  )
}

const styles = StyleSheet.create({
  warn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden', gap: 6 },
  text: { fontSize: 13, lineHeight: 18 },
  action: { alignSelf: 'flex-start' },
  actionText: { fontSize: 13, fontWeight: '600' }
})
