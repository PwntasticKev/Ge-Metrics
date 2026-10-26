import { memo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { agoText } from '../../lib/alertState'
import { gpFull, gpShort, qty as qtyText, stripUncharged } from '../../lib/format'
import type { SlotAdvice } from '../../lib/slots/advice'
import { averageFillPrice, stepTargets, type Slot } from '../../lib/slots/slots'
import { useItemSheet } from '../../state/itemSheet'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { CopyPrice } from '../DetailLines'
import { ItemIcon } from '../ItemIcon'
import { UpdateOfferForm } from './UpdateOfferForm'
import { useSlotActions } from './useSlotActions'

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function Stepper ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const { palette } = useTheme()
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={4} accessibilityRole="button" accessibilityLabel={`Filled ${label}`}
      style={({ pressed }) => [styles.step, { backgroundColor: palette.well, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <Text style={[styles.stepText, { color: palette.ink }]}>{label}</Text>
    </Pressable>
  )
}

function Progress ({ slot }: { slot: Slot }) {
  const { palette } = useTheme()
  const { fill } = useSlotActions()
  const steps = stepTargets(slot)
  const share = slot.qty ? slot.filled / slot.qty : 0
  const full = slot.filled >= slot.qty
  return (
    <View style={styles.block}>
      <View style={styles.between}>
        <Text style={[styles.meta, { color: palette.ink }]}>{qtyText(slot.filled)} / {qtyText(slot.qty)} {slot.side === 'buy' ? 'bought' : 'sold'}</Text>
        {slot.filled > 0 ? <Text style={[styles.meta, { color: palette.muted }]}>avg {gpFull(averageFillPrice(slot))}</Text> : null}
      </View>
      <View style={[styles.track, { backgroundColor: palette.well }]}>
        <View style={[styles.bar, { backgroundColor: palette.brand, width: `${Math.round(share * 100)}%` }]} />
      </View>
      <View style={styles.steps}>
        <Stepper label="−1" onPress={() => fill(slot.id, steps.minus)} disabled={slot.filled <= 0} />
        <Stepper label="+1" onPress={() => fill(slot.id, steps.plus)} disabled={full} />
        <Stepper label={`+${qtyText(steps.quarter - slot.filled || 0)}`} onPress={() => fill(slot.id, steps.quarter)} disabled={full} />
        <Stepper label="All" onPress={() => fill(slot.id, steps.full)} disabled={full} />
      </View>
    </View>
  )
}

function AdviceBox ({ slot, advice }: { slot: Slot; advice: SlotAdvice | null }) {
  const { palette } = useTheme()
  if (!advice) return <Text style={[styles.meta, { color: palette.muted }]}>Waiting for prices</Text>
  const tone = advice.action ? palette.brand : palette.muted
  return (
    <View style={[styles.advice, { backgroundColor: palette.well, borderLeftColor: tone }]} accessibilityLiveRegion="polite">
      <View style={styles.between}>
        <Text style={[styles.headline, { color: advice.action ? palette.brand : palette.ink }]}>{advice.headline}</Text>
        {advice.price !== null && advice.price !== slot.price ? <CopyPrice price={advice.price} /> : null}
      </View>
      <Text style={[styles.detail, { color: palette.ink }]}>{advice.detail}</Text>
    </View>
  )
}

function lastChange (slot: Slot): string | null {
  const changes = slot.changes
  if (changes.length < 2) return null
  const last = changes[changes.length - 1]
  const prev = changes[changes.length - 2]
  const qtyPart = last.qty !== prev.qty ? `, amount ${qtyText(prev.qty)} → ${qtyText(last.qty)}` : ''
  return `Updated ${clock(last.at)}: ${gpFull(prev.price)} → ${gpFull(last.price)}${qtyPart}. ${changes.length - 1} change${changes.length === 2 ? '' : 's'}.`
}

interface Props {
  slot: Slot
  index: number
  advice: SlotAdvice | null
  now: number
}

// One GE slot: the offer, how much went through, live advice and actions.
export const SlotCard = memo(function SlotCard ({ slot, index, advice, now }: Props) {
  const { palette } = useTheme()
  const { openItem } = useItemSheet()
  const { close } = useSlotActions()
  const [editing, setEditing] = useState(false)
  const records = slot.side === 'sell' && slot.lotId && slot.filled > 0
  const changeLine = lastChange(slot)

  const confirmClose = () => {
    const body = slot.side === 'buy' && slot.filled
      ? `The ${qtyText(slot.filled)} bought stay on your Bought list.`
      : records ? `Records ${qtyText(slot.filled)} sold at ${gpFull(averageFillPrice(slot))} in your Profit journal.` : 'Removes the offer from your slots.'
    Alert.alert('Close this slot?', body, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Close slot', onPress: () => { close(slot.id).catch(error => console.warn('[slots] close failed', error)) } }
    ])
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: advice?.action ? palette.brand : palette.rule }]}>
      <Pressable onPress={() => openItem(slot.itemId)} style={styles.head} accessibilityRole="button" accessibilityLabel={`${slot.name}, open chart`}>
        <ItemIcon icon={slot.icon} size={36} />
        <View style={styles.title}>
          <Text style={[styles.name, { color: palette.ink }]} numberOfLines={1}>{stripUncharged(slot.name)}</Text>
          <Text style={[styles.meta, { color: palette.muted }]} numberOfLines={1}>Slot {index + 1} · placed {agoText(slot.placedAt, now)}{slot.updatedAt !== slot.placedAt ? ` · updated ${agoText(slot.updatedAt, now)}` : ''}</Text>
        </View>
        <Text style={[styles.side, { color: palette.onBrand, backgroundColor: slot.side === 'buy' ? palette.brand : palette.buyLine }]}>{slot.side === 'buy' ? 'BUY' : 'SELL'}</Text>
      </Pressable>

      <View style={styles.between}>
        <Text style={[styles.meta, { color: palette.muted }]}>
          {slot.side === 'buy' ? 'Your bid' : 'Your ask'}{slot.costBasis ? ` · cost ${gpShort(slot.costBasis)}` : ''}{slot.target ? ` · sell at ${gpShort(slot.target)}` : ''}
        </Text>
        <CopyPrice price={slot.price} />
      </View>

      <Progress slot={slot} />
      <AdviceBox slot={slot} advice={advice} />
      {changeLine ? <Text style={[styles.meta, { color: palette.muted }]}>{changeLine}</Text> : null}

      {editing ? <UpdateOfferForm slot={slot} suggested={advice?.price ?? null} onDone={() => setEditing(false)} /> : (
        <View style={styles.actions}>
          <Pressable onPress={confirmClose} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: palette.muted }]}>{records ? 'Close and record sale' : 'Close slot'}</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(true)} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: palette.brand }]}>Update offer</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  side: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, overflow: 'hidden', letterSpacing: 0.5 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  block: { gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  steps: { flexDirection: 'row', gap: space.sm },
  step: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  stepText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  advice: { borderRadius: 10, borderLeftWidth: 3, paddingHorizontal: space.md, paddingVertical: space.sm, gap: 2 },
  headline: { fontSize: 14, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xl, paddingTop: 2 },
  action: { fontSize: 13.5, fontWeight: '600' }
})
