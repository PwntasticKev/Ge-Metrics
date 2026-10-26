import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { gpFull } from '../../lib/format'
import { COOLDOWNS_MS, DEFAULT_COOLDOWN_MS, describeRule, type AlertKind, type AlertRule, type MoveDirection, type PriceSide } from '../../lib/alerts'
import { parseGp, parsePercent } from '../../lib/alertState'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { Chips } from './Chips'

export interface AlertItem {
  itemId: number
  name: string
  icon: string | null
  /** Live wiki high / low, used to prefill sensible thresholds. */
  high: number | null
  low: number | null
  margin: number | null
}

export type NewRule = Omit<AlertRule, 'id' | 'createdAt' | 'lastTriggeredAt' | 'enabled'>

const KINDS = [
  { value: 'below', label: 'Price drops to' },
  { value: 'above', label: 'Price rises to' },
  { value: 'margin', label: 'Margin' },
  { value: 'move', label: '1h dump/pump' }
] as const
const SIDES = [
  { value: 'buy', label: 'Buy price' },
  { value: 'sell', label: 'Sell price' }
] as const
const DIRECTIONS = [
  { value: 'down', label: 'Drops' },
  { value: 'up', label: 'Rises' },
  { value: 'either', label: 'Either way' }
] as const
const COOLDOWN_LABELS = ['15 min', '1 hour', '4 hours', '1 day']
const COOLDOWNS = COOLDOWNS_MS.map((value, i) => ({ value: value as number, label: COOLDOWN_LABELS[i] }))

const PRICE_STEP = 0.05
const DEFAULT_MOVE_PCT = 5

function suggested (kind: AlertKind, side: PriceSide, item: AlertItem): string {
  const price = side === 'buy' ? item.low : item.high
  if (kind === 'move') return String(DEFAULT_MOVE_PCT)
  if (kind === 'margin') return item.margin && item.margin > 0 ? String(item.margin) : ''
  if (!price) return ''
  return String(Math.round(price * (kind === 'below' ? 1 - PRICE_STEP : 1 + PRICE_STEP)))
}

const defaultSide = (kind: AlertKind): PriceSide => (kind === 'above' ? 'sell' : 'buy')

// New alert for one item: what to watch, the line, and how often it may ping.
export function AlertForm ({ item, onSave, onCancel }: { item: AlertItem; onSave: (rule: NewRule) => void; onCancel: () => void }) {
  const { palette } = useTheme()
  const [kind, setKind] = useState<AlertKind>('below')
  const [side, setSide] = useState<PriceSide>('buy')
  const [direction, setDirection] = useState<MoveDirection>('down')
  const [cooldownMs, setCooldownMs] = useState(DEFAULT_COOLDOWN_MS)
  const [text, setText] = useState(() => suggested('below', 'buy', item))

  const threshold = kind === 'move' ? parsePercent(text) : parseGp(text)
  const draft = threshold !== null ? { kind, side, direction, threshold } : null
  const current = kind === 'margin' ? item.margin : kind === 'move' ? null : (side === 'buy' ? item.low : item.high)

  const pickKind = (next: AlertKind) => {
    const nextSide = defaultSide(next)
    setKind(next)
    setSide(nextSide)
    setText(suggested(next, nextSide, item))
  }
  const pickSide = (next: PriceSide) => {
    setSide(next)
    setText(suggested(kind, next, item))
  }
  const save = () => {
    if (threshold === null) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSave({ itemId: item.itemId, name: item.name, icon: item.icon, kind, side, direction, threshold, cooldownMs })
  }

  return (
    <View style={[styles.form, { borderColor: palette.rule, backgroundColor: palette.card }]}>
      <Chips label="Alert type" options={KINDS} value={kind} onChange={pickKind} />
      {kind === 'below' || kind === 'above' ? <Chips label="Price side" options={SIDES} value={side} onChange={pickSide} /> : null}
      {kind === 'move' ? <Chips label="Direction" options={DIRECTIONS} value={direction} onChange={setDirection} /> : null}
      <View style={styles.field}>
        <Text style={[styles.label, { color: palette.muted }]}>{kind === 'move' ? 'Move %' : kind === 'margin' ? 'At least' : 'Price'}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          keyboardType={kind === 'move' ? 'decimal-pad' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus
          returnKeyType="done"
          placeholder={kind === 'move' ? '5' : 'e.g. 1.2m or 25k'}
          placeholderTextColor={palette.muted}
          style={[styles.input, { backgroundColor: palette.well, color: palette.ink }]}
          accessibilityLabel="Alert threshold"
        />
      </View>
      {current !== null ? <Text style={[styles.hint, { color: palette.muted }]}>Now {gpFull(current)}</Text> : null}
      <Text style={[styles.label, { color: palette.muted }]}>At most once every</Text>
      <Chips label="Cooldown" options={COOLDOWNS} value={cooldownMs} onChange={setCooldownMs} />
      <Text style={[styles.preview, { color: palette.ink }]}>{draft ? describeRule(draft) : 'Enter an amount like 1.2m, 25k or 1500'}</Text>
      <View style={styles.buttons}>
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.link, { color: palette.muted }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={!draft} style={[styles.save, { backgroundColor: palette.brand, opacity: draft ? 1 : 0.4 }]} accessibilityRole="button">
          <Text style={[styles.saveText, { color: palette.onBrand }]}>Save alert</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: space.md, gap: space.sm },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { fontSize: 13 },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12 },
  preview: { fontSize: 13.5, fontWeight: '600' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.lg },
  link: { fontSize: 13, fontWeight: '600' },
  save: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  saveText: { fontSize: 14, fontWeight: '600' }
})
