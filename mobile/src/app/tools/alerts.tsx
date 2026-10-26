import * as Notifications from 'expo-notifications'
import { useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ItemIcon } from '../../components/ItemIcon'
import { BACKGROUND_NOTE } from '../../components/alerts/ItemAlerts'
import { RuleRow } from '../../components/alerts/RuleRow'
import { runAlertCheck } from '../../lib/alertCheck'
import { agoText, type CheckSource, type LastCheck } from '../../lib/alertState'
import { backgroundAvailable, triggerAlertTaskForTesting } from '../../lib/alertTask'
import { stripUncharged } from '../../lib/format'
import { BUY_LIMIT_WINDOW_MS } from '../../lib/reminders'
import { useNow } from '../../lib/useNow'
import { updateAlerts, useAlerts } from '../../state/alerts'
import { useFlips } from '../../state/flips'
import { useItemSheet } from '../../state/itemSheet'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'

const SOURCE_TEXT: Record<CheckSource, string> = { app: 'in the app', background: 'in the background', manual: 'Check now' }

function Section ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: palette.muted }]}>{title}</Text>
        {action}
      </View>
      <View style={[styles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>{children}</View>
    </View>
  )
}

function checkText (check: LastCheck | null, now: number): string {
  if (!check) return 'No checks yet'
  const when = `Last check ${agoText(check.at, now)} (${SOURCE_TEXT[check.source]})`
  if (check.error) return `${when}: ${check.error}`
  return `${when}, ${check.fired ? `${check.fired} fired` : 'nothing fired'}`
}

function useNotificationsAllowed (): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    Notifications.getPermissionsAsync().then(p => setAllowed(p.granted), () => setAllowed(null))
  }, [])
  return allowed
}

function useBackgroundAvailable (): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => { backgroundAvailable().then(setAvailable) }, [])
  return available
}

function StatusCard () {
  const { palette } = useTheme()
  const { alerts } = useAlerts()
  const now = useNow(30_000)
  const notifications = useNotificationsAllowed()
  const background = useBackgroundAvailable()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const checkNow = async () => {
    setChecking(true)
    setResult(null)
    try {
      const { fired, error } = await runAlertCheck('manual')
      setResult(error ?? (fired ? `${fired} alert${fired === 1 ? '' : 's'} fired.` : 'Checked. Nothing crossed a line.'))
    } catch (error) {
      console.warn('[alerts] manual check failed', error)
      setResult('Could not check right now. Try again.')
    } finally {
      setChecking(false)
    }
  }
  const debugTrigger = async () => {
    try {
      setResult(await triggerAlertTaskForTesting() ? 'Asked iOS to run the background task.' : 'iOS did not run the task (simulators cannot).')
    } catch (error) {
      setResult(`Background trigger failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <Text style={[styles.body, { color: palette.ink }]}>{BACKGROUND_NOTE}</Text>
      {background === false ? <Text style={[styles.small, { color: palette.muted }]}>Background checks are not available right now. Check that Background App Refresh is on for GE Metrics and Low Power Mode is off. (Simulators never run them.)</Text> : null}
      {notifications === false ? (
        <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
          <Text style={[styles.small, { color: palette.brand }]}>Notifications are off for GE Metrics. Open Settings ›</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.small, { color: palette.muted }]}>{checkText(alerts.lastCheck, now)}</Text>
      <View style={styles.buttons}>
        <Pressable onPress={checkNow} disabled={checking} style={[styles.button, { backgroundColor: palette.brand, opacity: checking ? 0.5 : 1 }]} accessibilityRole="button">
          <Text style={[styles.buttonText, { color: palette.onBrand }]}>{checking ? 'Checking' : 'Check now'}</Text>
        </Pressable>
        {__DEV__ ? (
          <Pressable onPress={debugTrigger} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.link, { color: palette.brand }]}>Run background task (debug)</Text>
          </Pressable>
        ) : null}
      </View>
      {result ? <Text style={[styles.small, { color: palette.muted }]}>{result}</Text> : null}
    </View>
  )
}

function LimitResets ({ now }: { now: number }) {
  const { palette } = useTheme()
  const { holdings } = useFlips()
  // One line per item: the earliest open window is the one that resets next.
  const open = useMemo(() => {
    const byItem = new Map<number, (typeof holdings)[number]>()
    for (const h of holdings) {
      if (h.windowStart + BUY_LIMIT_WINDOW_MS <= now) continue
      const seen = byItem.get(h.itemId)
      if (!seen || h.windowStart < seen.windowStart) byItem.set(h.itemId, h)
    }
    return [...byItem.values()].sort((a, b) => a.windowStart - b.windowStart)
  }, [holdings, now])

  if (!open.length) {
    return <Text style={[styles.empty, { color: palette.muted }]}>Log a buy with &quot;I bought these&quot; and you get a notification when the 4 hour buy limit resets.</Text>
  }
  return open.map((h, i) => {
    const mins = Math.max(1, Math.ceil((h.windowStart + BUY_LIMIT_WINDOW_MS - now) / 60_000))
    const left = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
    return (
      <View key={h.id} style={[styles.logRow, i < open.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.rule }]}>
        <ItemIcon icon={h.icon} size={26} />
        <Text style={[styles.logTitle, { color: palette.ink, flex: 1 }]} numberOfLines={1}>{stripUncharged(h.name)}</Text>
        <Text style={[styles.small, { color: palette.muted }]}>{h.reminderId ? 'Reminder in' : 'Resets in'} {left}</Text>
      </View>
    )
  })
}

export default function AlertsScreen () {
  const { palette } = useTheme()
  const { alerts, ready } = useAlerts()
  const { openItem } = useItemSheet()
  const now = useNow()
  const rules = useMemo(() => [...alerts.rules].sort((a, b) => a.name.localeCompare(b.name)), [alerts.rules])
  const clearLog = () => updateAlerts(state => ({ ...state, log: [] })).catch(error => console.warn('[alerts] could not clear the log', error))

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      <StatusCard />

      <Section title={`Your alerts${rules.length ? ` (${rules.length})` : ''}`}>
        {rules.length ? rules.map((rule, i) => (
          <View key={rule.id} style={styles.pad}>
            <RuleRow rule={rule} now={now} showItem onOpenItem={openItem} last={i === rules.length - 1} />
          </View>
        )) : (
          <Text style={[styles.empty, { color: palette.muted }]}>{ready ? 'No alerts yet. Open any item\'s chart and details, or expand a starred item on Watchlist, and tap "+ Price alert".' : 'Loading'}</Text>
        )}
      </Section>

      <Section title="Buy limit resets">
        <LimitResets now={now} />
      </Section>

      <Section
        title="Recent alerts"
        action={alerts.log.length ? <Pressable onPress={clearLog} hitSlop={8} accessibilityRole="button"><Text style={[styles.link, { color: palette.brand }]}>Clear</Text></Pressable> : undefined}
      >
        {alerts.log.length ? alerts.log.map((t, i) => (
          <Pressable key={`${t.ruleId}-${t.at}`} onPress={() => openItem(t.itemId)} accessibilityRole="button" style={[styles.logRow, i < alerts.log.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.rule }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.logTitle, { color: palette.ink }]} numberOfLines={2}>{t.title}</Text>
              <Text style={[styles.small, { color: palette.muted }]} numberOfLines={2}>{t.body.replace(' Tap for the chart.', '')}</Text>
              <Text style={[styles.small, { color: palette.muted }]}>{agoText(t.at, now)}, {SOURCE_TEXT[t.source]}</Text>
            </View>
          </Pressable>
        )) : (
          <Text style={[styles.empty, { color: palette.muted }]}>Alerts that fire show up here.</Text>
        )}
      </Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.lg, paddingBottom: 120 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  body: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 12.5, lineHeight: 17 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xs },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  buttonText: { fontSize: 14, fontWeight: '600' },
  link: { fontSize: 13, fontWeight: '600' },
  section: { gap: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  pad: { paddingHorizontal: space.lg },
  empty: { fontSize: 13, lineHeight: 18, padding: space.lg },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  logTitle: { fontSize: 14, fontWeight: '600' }
})
