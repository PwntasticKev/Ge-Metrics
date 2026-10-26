import { StyleSheet, Text, View } from 'react-native'
import { useSpikeFlag } from '../api/useThinSpikes'
import { spikeText, type SpikeFlag } from '../lib/thinSpikes'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'

export const SPIKE_BADGE = 'Thin-volume spike'
const PUMP_BADGES = [SPIKE_BADGE] as const

/** Row badge for a flagged item; a stable array so memoised rows don't re-render. */
export function spikeBadges (flag: SpikeFlag | null): readonly string[] | undefined {
  return flag ? PUMP_BADGES : undefined
}

// Item sheet banner: why this price may not be real.
export function SpikeWarning ({ itemId }: { itemId: number }) {
  const { palette } = useTheme()
  const flag = useSpikeFlag(itemId)
  if (!flag) return null
  const advice = flag.kind === 'pump'
    ? 'Few trades pushed the price up. It often falls back; wait before buying.'
    : 'Few trades pushed the price down. It often bounces back; don\'t panic-sell.'
  return (
    <View style={[styles.box, { backgroundColor: palette.well, borderColor: palette.brand }]} accessibilityRole="alert">
      <Text style={[styles.title, { color: palette.brand }]}>{SPIKE_BADGE}</Text>
      <Text style={[styles.body, { color: palette.ink }]}>{spikeText(flag)}. {advice}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { borderLeftWidth: 3, borderRadius: radius.sm, padding: space.sm, gap: 2 },
  title: { fontSize: 13, fontWeight: '700' },
  body: { fontSize: 12.5, lineHeight: 17 }
})
