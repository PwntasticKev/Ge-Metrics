import * as Haptics from 'expo-haptics'
import { memo } from 'react'
import { Alert, LayoutAnimation, Pressable, Text, View } from 'react-native'
import { chartTime, gpFull, gpShort, heldFor, percent, qty, signed, stripUncharged } from '../../lib/format'
import type { Flip } from '../../lib/pnl/journal'
import { flipRoi, gpPerHour, holdHours } from '../../lib/pnl/metrics'
import { useTheme } from '../../theme/ThemeProvider'
import { ItemIcon } from '../ItemIcon'
import { pnlStyles, toneOf } from './styles'

// Exact for cheap items, where "9K -> 9K" would hide the margin.
const price = (n: number) => (n < 100_000 ? gpFull(n) : gpShort(n))
const signedPercent = (r: number | null) => (r === null ? '–' : `${r >= 0 ? '+' : '-'}${percent(Math.abs(r))}`)

function summary (f: Flip): string {
  if (f.buyPrice === null || f.sellPrice === null) return `${qty(f.qty)} sold ${chartTime(f.soldAt, true)}`
  return `${qty(f.qty)} × ${price(f.buyPrice)} → ${price(f.sellPrice)} · held ${heldFor(holdHours(f))}`
}

function Detail ({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme()
  return (
    <View style={pnlStyles.line}>
      <Text style={[pnlStyles.label, { color: palette.muted }]}>{label}</Text>
      <Text style={[pnlStyles.value, { color: palette.ink, fontWeight: '400' }]}>{value}</Text>
    </View>
  )
}

interface Props {
  flip: Flip
  /** Optional tag shown before the meta, e.g. "Best". */
  tag?: string
  expanded: boolean
  onToggle: (id: string) => void
  onDelete?: (id: string) => void
}

// One completed flip: profit after tax, ROI and GP/h; tap for the details.
export const JournalRow = memo(function JournalRow ({ flip: f, tag, expanded, onToggle, onDelete }: Props) {
  const { palette } = useTheme()
  const roi = flipRoi(f)
  const perHour = gpPerHour(f)
  const confirmDelete = () => Alert.alert('Delete this flip?', 'It comes out of your profit history.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(f.id) }
  ])
  return (
    <View style={{ backgroundColor: expanded ? palette.card : 'transparent' }}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync()
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          onToggle(f.id)
        }}
        style={({ pressed }) => [pnlStyles.row, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${f.name}, ${signed(f.profit)} after tax${tag ? `, ${tag}` : ''}`}
      >
        <ItemIcon icon={f.icon} />
        <View style={pnlStyles.rowText}>
          <Text style={[pnlStyles.rowTitle, { color: palette.ink }]} numberOfLines={1}>{stripUncharged(f.name)}</Text>
          <Text style={[pnlStyles.rowMeta, { color: palette.muted }]} numberOfLines={1}>{tag ? `${tag} · ` : ''}{summary(f)}</Text>
        </View>
        <View style={pnlStyles.rowRight}>
          <Text style={[pnlStyles.rowValue, { color: toneOf(f.profit, palette) }]}>{signed(f.profit)}</Text>
          <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>{roi !== null ? signedPercent(roi) : 'after tax'}</Text>
        </View>
      </Pressable>
      {expanded ? (
        <View style={{ paddingLeft: 60, paddingRight: 16, paddingBottom: 12, gap: 4 }}>
          {f.buyPrice !== null ? <Detail label={`Bought ${f.boughtAt ? chartTime(f.boughtAt, true) : ''}`} value={`${qty(f.qty)} × ${gpFull(f.buyPrice)}`} /> : null}
          {f.sellPrice !== null ? <Detail label={`Sold ${chartTime(f.soldAt, true)}`} value={`${qty(f.qty)} × ${gpFull(f.sellPrice)}`} /> : <Detail label="Sold" value={chartTime(f.soldAt, true)} />}
          <Detail label="GE tax" value={f.tax === null ? 'not recorded' : gpFull(f.tax)} />
          <Detail label="Profit after tax" value={gpFull(f.profit)} />
          <Detail label="Return on cost" value={signedPercent(roi)} />
          <Detail label="GP/h of hold" value={perHour === null ? '–' : `${signed(perHour)}/h`} />
          {f.buyPrice === null ? <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>Saved before the journal kept prices.</Text> : null}
          {onDelete ? (
            <Pressable onPress={confirmDelete} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-end', paddingTop: 6 }}>
              <Text style={[pnlStyles.link, { color: palette.muted }]}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
})
