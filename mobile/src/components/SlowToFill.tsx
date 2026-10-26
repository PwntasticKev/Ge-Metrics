import * as Haptics from 'expo-haptics'
import { memo } from 'react'
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native'
import type { SlowReason } from '../lib/fillAware'
import { slowShort, slowText } from '../lib/fillText'
import { stripUncharged } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { DetailsLink } from './DetailsLink'
import { FlipRow } from './FlipRow'
import { Sparkline } from './Sparkline'

// The collapsed "Slow to fill" section under Buy now and the scanner: offers
// that would take longer to sell than the trader's limit.

interface HeaderProps {
  count: number
  maxHours: number
  /** Overrides the "would take over Xh to sell" line. */
  subtitle?: string
  open: boolean
  onToggle: () => void
}

export const SlowHeader = memo(function SlowHeader ({ count, maxHours, subtitle, open, onToggle }: HeaderProps) {
  const { palette } = useTheme()
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync()
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        onToggle()
      }}
      style={({ pressed }) => [styles.header, { borderBottomColor: palette.rule, backgroundColor: palette.well }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`Slow to fill, ${count} items. ${subtitle ?? `Would take over ${maxHours} hours to sell.`}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.ink }]}>Slow to fill ({count})</Text>
        <Text style={[styles.sub, { color: palette.muted }]}>{subtitle ?? `Would take over ${maxHours}h to sell at these prices`}</Text>
      </View>
      <Text style={[styles.chevron, { color: palette.brand }]}>{open ? 'Hide' : 'Show'}</Text>
    </Pressable>
  )
})

interface RowProps {
  id: number
  name: string
  icon: string | null
  /** What the margin would have been, e.g. "+29.9M per limit". */
  value: string
  valueCaption: string
  reason: SlowReason
  maxHours: number
  /** Replaces the reason line. */
  text?: string
  /** Extra detail lines, e.g. the prices used. */
  detail?: string
  expanded: boolean
  onToggle: (id: number) => void
}

export const SlowRow = memo(function SlowRow ({ id, name, icon, value, valueCaption, reason, maxHours, text, detail, expanded, onToggle }: RowProps) {
  const { palette } = useTheme()
  return (
    <FlipRow
      icon={icon}
      name={stripUncharged(name)}
      meta={slowShort(reason)}
      value={value}
      valueCaption={valueCaption}
      valueTone="ink"
      expanded={expanded}
      onToggle={() => onToggle(id)}
    >
      <Sparkline itemId={id} />
      <Text style={[styles.line, { color: palette.ink }]}>{text ?? slowText(reason, maxHours)}</Text>
      {detail ? <Text style={[styles.line, { color: palette.muted }]}>{detail}</Text> : null}
      <DetailsLink itemId={id} />
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12.5, marginTop: 2 },
  chevron: { fontSize: 14, fontWeight: '600' },
  line: { fontSize: 13, lineHeight: 18, paddingTop: 4 }
})
