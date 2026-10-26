import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSpikeFlag } from '../api/useThinSpikes'
import { statusText, type ComingRow } from '../lib/comingUp'
import { changeText, gpPrice, gpShort, stripUncharged } from '../lib/format'
import { signalText } from '../lib/updateSignals'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { DetailsLink } from './DetailsLink'
import { FlipRow } from './FlipRow'
import { Sparkline } from './Sparkline'
import { SPIKE_BADGE } from './SpikeWarning'

const LATE = 'Late'
// Stable arrays so the memoised row only re-renders when a badge changes.
const BADGES: Record<string, readonly string[] | undefined> = {
  '00': undefined,
  '10': [LATE],
  '01': [SPIKE_BADGE],
  '11': [LATE, SPIKE_BADGE]
}

function Line ({ children }: { children: string }) {
  const { palette } = useTheme()
  return <Text style={[styles.line, { color: palette.ink }]}>{children}</Text>
}

function sinceText (row: ComingRow): string {
  const since = row.sincePost !== null ? ` (${changeText(row.sincePost)})` : ''
  return `Now ${gpPrice(row.now)}, day before the post ${gpPrice(row.before)}${since}`
}

// One item named in an upcoming-content post.
export const ComingItemRow = memo(function ComingItemRow ({ row, expanded, onToggle }: { row: ComingRow; expanded: boolean; onToggle: () => void }) {
  const { palette } = useTheme()
  const spike = useSpikeFlag(row.id)
  return (
    <FlipRow
      icon={row.icon}
      name={stripUncharged(row.name)}
      meta={`${signalText(row.signal)} · ${statusText(row)}`}
      value={row.change7d !== null ? changeText(row.change7d) : '–'}
      valueTone={row.change7d !== null && row.change7d > 0 ? 'profit' : 'ink'}
      valueCaption="7 days"
      badges={BADGES[`${Number(row.late)}${Number(Boolean(spike))}`]}
      expanded={expanded}
      onToggle={onToggle}
    >
      <View style={[styles.quote, { backgroundColor: palette.well, borderLeftColor: palette.brand }]}>
        <Text style={[styles.quoteText, { color: palette.ink }]}>“{row.sentence}”</Text>
      </View>
      <Line>{sinceText(row)}</Line>
      <Line>{`Traded ${gpShort(row.dayVolume)} a day`}</Line>
      <Line>{row.releasedIn ? `Named in a later game update: ${row.releasedIn}` : 'No game update has named it since'}</Line>
      {row.late ? <Text style={[styles.note, { color: palette.muted }]}>Already moved 10%+ since the post; the news may be priced in.</Text> : null}
      <Sparkline itemId={row.id} />
      <DetailsLink itemId={row.id} />
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  quote: { borderLeftWidth: 3, borderRadius: radius.sm, padding: space.sm, marginBottom: 6 },
  quoteText: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  line: { fontSize: 13, lineHeight: 19, fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, lineHeight: 17, paddingTop: 2 }
})
