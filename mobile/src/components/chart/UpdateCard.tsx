import * as WebBrowser from 'expo-web-browser'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { changeText, utcDay } from '../../lib/format'
import { kindLabel, type UpdateMarker } from '../../lib/gameUpdates'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'

function openPost (url: string) {
  WebBrowser.openBrowserAsync(url).catch(error => console.warn('Could not open the news post', error))
}

// The game update or dev blog behind a tapped chart marker.
export function UpdateCard ({ marker, changeSincePost, onClose }: { marker: UpdateMarker; changeSincePost: number | null; onClose: () => void }) {
  const { palette } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>{marker.title}</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close update">
          <Text style={{ color: palette.muted, fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>
      <Text style={[styles.meta, { color: palette.muted }]}>{kindLabel(marker.kind)}, {utcDay(marker.date)}</Text>
      <View style={styles.row}>
        {marker.mentionsItem
          ? <Text style={[styles.badge, { color: palette.onBrand, backgroundColor: palette.brand }]}>Mentions this item</Text>
          : <Text style={[styles.meta, { color: palette.muted }]}>Doesn&apos;t mention this item</Text>}
        {changeSincePost !== null
          ? <Text style={[styles.meta, { color: changeSincePost >= 0 ? palette.profit : palette.muted }]}>{changeText(changeSincePost)} since</Text>
          : null}
      </View>
      {marker.url ? (
        <Pressable onPress={() => openPost(marker.url as string)} hitSlop={6} accessibilityRole="link">
          <Text style={[styles.link, { color: palette.brand }]}>Read the news post ›</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: space.md, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginTop: 2 },
  badge: { fontSize: 11.5, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, overflow: 'hidden' },
  link: { fontSize: 14, fontWeight: '600', marginTop: 4 }
})
