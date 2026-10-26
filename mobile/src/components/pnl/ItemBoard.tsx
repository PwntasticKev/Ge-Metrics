import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { heldFor, signed } from '../../lib/format'
import type { ItemRecord } from '../../lib/pnl/summary'
import { useTheme } from '../../theme/ThemeProvider'
import { ItemIcon } from '../ItemIcon'
import { pnlStyles, toneOf } from './styles'

const SHOWN = 8

// Per-item results: total profit, flips, win rate, average hold.
export function ItemBoard ({ records }: { records: readonly ItemRecord[] }) {
  const { palette } = useTheme()
  const [all, setAll] = useState(false)
  const shown = all ? records : records.slice(0, SHOWN)
  return (
    <View style={[pnlStyles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      {shown.map((r, i) => (
        <View key={r.itemId} style={[pnlStyles.row, i > 0 && { borderTopWidth: 0.5, borderTopColor: palette.rule }]}>
          <Text style={[pnlStyles.rowMeta, { color: palette.muted, width: 18, textAlign: 'right' }]}>{i + 1}</Text>
          <ItemIcon icon={r.icon} />
          <View style={pnlStyles.rowText}>
            <Text style={[pnlStyles.rowTitle, { color: palette.ink }]} numberOfLines={1}>{r.name}</Text>
            <Text style={[pnlStyles.rowMeta, { color: palette.muted }]} numberOfLines={1}>
              {r.flips} flip{r.flips === 1 ? '' : 's'} · {Math.round(r.winRate * 100)}% won · held {heldFor(r.avgHoldHours)}
            </Text>
          </View>
          <View style={pnlStyles.rowRight}>
            <Text style={[pnlStyles.rowValue, { color: toneOf(r.profit, palette) }]}>{signed(r.profit)}</Text>
            <Text style={[pnlStyles.rowMeta, { color: palette.muted }]}>{signed(r.avgProfit)} avg</Text>
          </View>
        </View>
      ))}
      {records.length > SHOWN ? (
        <Pressable onPress={() => setAll(v => !v)} style={[pnlStyles.row, { borderTopWidth: 0.5, borderTopColor: palette.rule, justifyContent: 'center' }]} accessibilityRole="button">
          <Text style={[pnlStyles.link, { color: palette.brand }]}>{all ? 'Show fewer' : `Show all ${records.length} items`}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
