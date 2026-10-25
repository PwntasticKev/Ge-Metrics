import { memo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { ProcessFlip } from '@ge/engine'
import { gpFull, qty, signed } from '../lib/format'
import { recipeMeta, type ProcessSort } from '../lib/methods'
import { useTheme } from '../theme/ThemeProvider'
import { PriceLine } from './DetailLines'
import { FlipRow } from './FlipRow'

function headline (flip: ProcessFlip, sortBy: ProcessSort): { value: string; caption: string } {
  if (sortBy === 'perHour' && flip.perHour !== null) return { value: signed(flip.perHour), caption: 'per hour' }
  return { value: signed(flip.profit), caption: 'each' }
}

function metaLine (flip: ProcessFlip, sortBy: ProcessSort): string {
  const skill = recipeMeta(flip.id)?.skill
  const volume = flip.maxActions === null ? null : `${flip.maxActions.toLocaleString('en-US')} per 4h`
  if (sortBy === 'perHour') return [skill, `${signed(flip.profit)} each`].filter(Boolean).join(', ')
  return [volume, flip.potential !== null ? signed(flip.potential) : null].filter(Boolean).join(', ')
}

export const ProcessFlipRow = memo(function ProcessFlipRow ({ flip, sortBy, expanded, onToggle }: { flip: ProcessFlip; sortBy: ProcessSort; expanded: boolean; onToggle: (id: string) => void }) {
  const { palette } = useTheme()
  const meta = recipeMeta(flip.id)
  const { value, caption } = headline(flip, sortBy)
  return (
    <FlipRow
      icon={flip.icon}
      name={flip.name}
      meta={metaLine(flip, sortBy)}
      value={value}
      valueCaption={caption}
      expanded={expanded}
      onToggle={() => onToggle(flip.id)}
    >
      {flip.buy.map(l => <PriceLine key={`b${l.id}`} tag="Buy" icon={l.icon} label={`${qty(l.qty)} × ${l.name}`} price={l.price} />)}
      {flip.sell.map((l, i) => <PriceLine key={`s${l.id}`} tag="Sell" icon={l.icon} divider={i === 0} label={`${qty(l.qty)} × ${l.name}`} price={l.price} />)}
      <View style={styles.footer}>
        <Text style={[styles.small, { color: palette.muted }]}>
          {flip.coinCost > 0 ? `Coins ${gpFull(flip.coinCost)}, ` : ''}Tax {gpFull(flip.tax)}
        </Text>
        <Text style={[styles.profit, { color: palette.profit }]}>{flip.profit >= 0 ? '+' : ''}{gpFull(flip.profit)} each</Text>
      </View>
      {meta?.source ? (
        <Pressable onPress={() => Linking.openURL(meta.source!)} accessibilityRole="link" hitSlop={8}>
          <Text style={[styles.link, { color: palette.brand }]}>Wiki guide{meta.location ? `, ${meta.location}` : ''}</Text>
        </Pressable>
      ) : null}
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  small: { fontSize: 12.5 },
  profit: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  link: { fontSize: 13, fontWeight: '600', paddingTop: 8 }
})
