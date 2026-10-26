import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { wikiIconUrl } from '../../lib/format'
import { shareCardText, type SharePick } from '../../lib/shareCard'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'

/** Card width in points; captured at the screen's scale (1080 px wide at 3x). */
export const SHARE_CARD_WIDTH = 360
const ICON = 48

// The image a shared pick becomes: icon, name, realistic buy and sell, the
// fill-sized amount, profit after tax, fill time, when, and the wordmark.
// Calls onIconSettled once the icon has loaded or failed (or there is none),
// so the capture never catches an empty frame.
export function ShareCard ({ pick, onIconSettled }: { pick: SharePick; onIconSettled: () => void }) {
  const { palette } = useTheme()
  const text = shareCardText(pick)
  const uri = wikiIconUrl(pick.icon)
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <View style={[styles.band, { backgroundColor: palette.brand }]} />
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={[styles.iconWell, { backgroundColor: palette.well }]}>
            {uri ? (
              <Image source={{ uri }} style={styles.icon} contentFit="contain" cachePolicy="disk" onLoad={onIconSettled} onError={onIconSettled} />
            ) : null}
          </View>
          <View style={styles.titles}>
            <Text style={[styles.name, { color: palette.ink }]} numberOfLines={2}>{text.name}</Text>
            <Text style={[styles.kicker, { color: palette.muted }]}>Flip pick, {text.stamp}</Text>
          </View>
        </View>

        <View style={[styles.rows, { borderColor: palette.rule }]}>
          {text.rows.map(row => (
            <View key={row.label} style={styles.row}>
              <Text style={[styles.label, { color: palette.muted }]}>{row.label}</Text>
              <Text style={[styles.value, { color: palette.ink }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.totals, { backgroundColor: palette.well }]}>
          <View style={styles.total}>
            <Text style={[styles.label, { color: palette.muted }]}>Profit after tax</Text>
            <Text style={[styles.profit, { color: palette.profit }]}>{text.profit}</Text>
            <Text style={[styles.small, { color: palette.muted }]}>{text.profitEach}</Text>
          </View>
          <View style={[styles.total, styles.right]}>
            <Text style={[styles.label, { color: palette.muted }]}>Fills in</Text>
            <Text style={[styles.fills, { color: palette.ink }]}>{text.fills}</Text>
            <Text style={[styles.small, { color: palette.muted }]}>buy, then sell</Text>
          </View>
        </View>

        <View style={styles.foot}>
          <Text style={[styles.wordmark, { color: palette.brand }]}>GE Metrics</Text>
          <Text style={[styles.small, { color: palette.muted }]}>Prices: OSRS Wiki</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { width: SHARE_CARD_WIDTH, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  band: { height: 6 },
  body: { padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconWell: { width: ICON + 12, height: ICON + 12, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  icon: { width: ICON, height: ICON },
  titles: { flex: 1, gap: 2 },
  name: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  kicker: { fontSize: 12 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 13 },
  value: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  totals: { flexDirection: 'row', borderRadius: radius.sm, padding: space.md },
  total: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end' },
  profit: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  fills: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  small: { fontSize: 11.5 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  wordmark: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }
})
