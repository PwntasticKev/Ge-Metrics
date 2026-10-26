import * as Notifications from 'expo-notifications'
import { geTax, type WikiAverage, type WikiPrice } from '@ge/engine'
import { fetchAverages, fetchLatest } from '../api/wiki'
import { updateAlerts, reloadAlerts } from '../state/alerts'
import { evaluateAlerts, needsHourAverages, type AlertTrigger } from './alerts'
import { withTriggers, type CheckSource } from './alertState'
// Importing reminders also installs the foreground notification handler.
import './reminders'

// One alert check: fetch prices if not given, evaluate every enabled rule,
// save cooldowns and the log, then post local notifications. Used by the
// app on each price refresh, the "Check now" button and the background task.

/** More than this many triggers in one check become a single summary. */
const MAX_NOTIFICATIONS = 4

export interface CheckPrices {
  latest?: Record<string, WikiPrice>
  hour?: Record<string, WikiAverage>
}

export interface CheckResult {
  fired: number
  error: string | null
}

const itemLink = (itemId: number) => `/?item=${itemId}`

async function notify (triggers: readonly AlertTrigger[]): Promise<void> {
  if (!triggers.length) return
  const permission = await Notifications.getPermissionsAsync()
  if (!permission.granted) return
  const shown = triggers.length > MAX_NOTIFICATIONS ? triggers.slice(0, MAX_NOTIFICATIONS - 1) : triggers
  const rest = triggers.length - shown.length
  const posts = shown.map(t => ({ title: t.title, body: t.body, data: { url: itemLink(t.itemId) } }))
  if (rest > 0) posts.push({ title: `${rest} more alerts`, body: 'Open Tools, Alerts to see them all.', data: { url: '/tools/alerts' } })
  await Promise.all(posts.map(content => Notifications.scheduleNotificationAsync({ content, trigger: null })))
}

async function pricesFor (prices: CheckPrices, wantHour: boolean): Promise<Required<Pick<CheckPrices, 'latest'>> & CheckPrices> {
  const latest = prices.latest ?? await fetchLatest()
  if (!wantHour || prices.hour) return { latest, hour: prices.hour }
  try {
    return { latest, hour: await fetchAverages('1h') }
  } catch (error) {
    // Price rules still work; only 1h move rules wait for the next check.
    console.warn('[alerts] could not load 1h averages', error)
    return { latest }
  }
}

export async function runAlertCheck (source: CheckSource, given: CheckPrices = {}): Promise<CheckResult> {
  const saved = await reloadAlerts()
  if (!saved.rules.some(r => r.enabled)) return { fired: 0, error: null }
  let prices: Awaited<ReturnType<typeof pricesFor>>
  try {
    prices = await pricesFor(given, needsHourAverages(saved.rules))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load prices'
    console.warn('[alerts] check failed', error)
    await updateAlerts(state => ({ ...state, lastCheck: { at: Date.now(), source, error: message, fired: 0 } }))
    return { fired: 0, error: message }
  }

  let triggers: AlertTrigger[] = []
  await updateAlerts(state => {
    const now = Date.now()
    const result = evaluateAlerts({ rules: state.rules, latest: prices.latest, hour: prices.hour, now, tax: geTax })
    triggers = result.triggers
    const next = withTriggers({ ...state, rules: result.rules }, result.triggers, source)
    return { ...next, lastCheck: { at: now, source, error: null, fired: result.triggers.length } }
  })
  try {
    await notify(triggers)
  } catch (error) {
    console.warn('[alerts] could not post notifications', error)
  }
  return { fired: triggers.length, error: null }
}
