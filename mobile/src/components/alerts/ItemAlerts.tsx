import { useState } from 'react'
import type { ItemFlip } from '@ge/engine'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNow } from '../../lib/useNow'
import { useAlerts } from '../../state/alerts'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { addRule } from './actions'
import { AlertForm, type AlertItem, type NewRule } from './AlertForm'
import { RuleRow } from './RuleRow'

export const alertItemFromFlip = (flip: ItemFlip): AlertItem =>
  ({ itemId: flip.id, name: flip.name, icon: flip.icon, high: flip.sellAt, low: flip.buyAt, margin: flip.profit })

export const BACKGROUND_NOTE = 'Checked live while the app is open. In the background, iOS runs checks when it allows: about every 15 to 30 minutes at best, sometimes much less, and not after you swipe the app away.'

// Alerts for one item, in the item sheet and expanded Watchlist rows.
export function ItemAlerts ({ item }: { item: AlertItem }) {
  const { palette } = useTheme()
  const { alerts } = useAlerts()
  const now = useNow()
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const rules = alerts.rules.filter(r => r.itemId === item.itemId)

  const save = async (rule: NewRule) => {
    setAdding(false)
    try {
      const allowed = await addRule(rule)
      setNotice(allowed ? 'Alert saved. ' + BACKGROUND_NOTE : 'Alert saved, but notifications are off. Turn them on in iOS Settings, GE Metrics.')
    } catch (error) {
      console.warn('[alerts] could not save the alert', error)
      setNotice('Could not save the alert. Try again.')
    }
  }

  return (
    <View style={styles.wrap}>
      {rules.length ? (
        <View>
          {rules.map((rule, i) => <RuleRow key={rule.id} rule={rule} now={now} last={i === rules.length - 1} />)}
        </View>
      ) : null}
      {adding ? (
        <AlertForm item={item} onSave={save} onCancel={() => setAdding(false)} />
      ) : (
        <Pressable onPress={() => { setNotice(null); setAdding(true) }} hitSlop={8} accessibilityRole="button" style={styles.add}>
          <Text style={[styles.addText, { color: palette.brand }]}>{rules.length ? '+ Add another alert' : '+ Price alert'}</Text>
        </Pressable>
      )}
      {notice ? <Text style={[styles.notice, { color: palette.muted }]}>{notice}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  add: { paddingTop: 8, alignSelf: 'flex-start' },
  addText: { fontSize: 13, fontWeight: '600' },
  notice: { fontSize: 12, lineHeight: 17 }
})
