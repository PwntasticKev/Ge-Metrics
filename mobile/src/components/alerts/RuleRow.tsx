import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { COOLDOWNS_MS, describeRule, type AlertRule } from '../../lib/alerts'
import { agoText } from '../../lib/alertState'
import { stripUncharged } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { ItemIcon } from '../ItemIcon'
import { removeRule, setRuleEnabled } from './actions'

const SHORT_COOLDOWNS = ['15m', '1h', '4h', '1d']
const cooldownText = (ms: number) => SHORT_COOLDOWNS[COOLDOWNS_MS.indexOf(ms as never)] ?? '1h'

// One alert: what it watches, when it last fired, an on/off switch and Remove.
export function RuleRow ({ rule, now, showItem = false, onOpenItem, last = false }: { rule: AlertRule; now: number; showItem?: boolean; onOpenItem?: (itemId: number) => void; last?: boolean }) {
  const { palette } = useTheme()
  const fired = rule.lastTriggeredAt ? `Last fired ${agoText(rule.lastTriggeredAt, now)}` : 'Not fired yet'
  const meta = `${fired} · max once per ${cooldownText(rule.cooldownMs)}`
  const body = (
    <View style={{ flex: 1, minWidth: 0 }}>
      {showItem ? <Text style={[styles.name, { color: palette.ink }]} numberOfLines={1}>{stripUncharged(rule.name)}</Text> : null}
      <Text style={[showItem ? styles.rule : styles.name, { color: palette.ink, opacity: rule.enabled ? 1 : 0.5 }]} numberOfLines={2}>{describeRule(rule)}</Text>
      <Text style={[styles.meta, { color: palette.muted }]} numberOfLines={1}>{meta}</Text>
      <Pressable onPress={() => removeRule(rule.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove alert: ${describeRule(rule)}`} style={styles.remove}>
        <Text style={[styles.removeText, { color: palette.brand }]}>Remove</Text>
      </Pressable>
    </View>
  )
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.rule }]}>
      {showItem ? (
        <Pressable onPress={() => onOpenItem?.(rule.itemId)} accessibilityRole="button" accessibilityLabel={`Open ${rule.name}`}>
          <ItemIcon icon={rule.icon} size={30} />
        </Pressable>
      ) : null}
      {body}
      <Switch
        value={rule.enabled}
        onValueChange={enabled => setRuleEnabled(rule.id, enabled)}
        trackColor={{ true: palette.brand, false: palette.well }}
        accessibilityLabel={`Alert on: ${describeRule(rule)}`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  name: { fontSize: 15, fontWeight: '600' },
  rule: { fontSize: 14, marginTop: 1 },
  meta: { fontSize: 12, marginTop: 2 },
  remove: { alignSelf: 'flex-start', paddingTop: 4 },
  removeText: { fontSize: 12.5, fontWeight: '600' }
})
