import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { router, type Href } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import type { WikiAverage, WikiPrice } from '@ge/engine'
import { fetchAverages } from '../api/wiki'
import { runAlertCheck } from '../lib/alertCheck'
import { needsHourAverages } from '../lib/alerts'
import { enabledCount } from '../lib/alertState'
import { syncAlertTask } from '../lib/alertTask'
import { runSlotCheck } from '../lib/slotCheck'
import { useAlerts } from '../state/alerts'
import { useSlots } from '../state/slots'

// While the app is open, alerts are checked on every /latest refresh (about
// once a minute). Also keeps the background task registered only while an
// alert is on, and opens the item when a notification is tapped.
const MIN_GAP_MS = 45_000
/** Ignore cache restores of old prices; only fresh fetches count. */
const FRESH_MS = 2 * 60_000
const HOUR_STALE_MS = 5 * 60_000
const DAY_STALE_MS = 15 * 60_000

async function averages (client: QueryClient, window: '1h' | '24h'): Promise<Record<string, WikiAverage> | undefined> {
  try {
    const staleTime = window === '1h' ? HOUR_STALE_MS : DAY_STALE_MS
    return await client.fetchQuery({ queryKey: ['averages', window], queryFn: () => fetchAverages(window), staleTime })
  } catch (error) {
    console.warn(`[alerts] could not load ${window} averages`, error)
    return undefined
  }
}

/** Calls `run` with each fresh /latest fetch, at most every MIN_GAP_MS. */
function useFreshLatest (active: boolean, run: (client: QueryClient, latest: Record<string, WikiPrice>) => Promise<unknown>) {
  const client = useQueryClient()
  const lastRun = useRef(0)
  useEffect(() => {
    if (!active) return
    return client.getQueryCache().subscribe(event => {
      if (event.type !== 'updated' || event.action.type !== 'success' || event.query.queryKey[0] !== 'latest') return
      const now = Date.now()
      if (now - event.query.state.dataUpdatedAt > FRESH_MS || now - lastRun.current < MIN_GAP_MS) return
      lastRun.current = now
      const latest = event.query.state.data as Record<string, WikiPrice> | undefined
      if (!latest) return
      run(client, latest).catch(error => console.warn('[alerts] foreground check failed', error))
    })
  }, [client, active, run])
}

const checkSlots = async (client: QueryClient, latest: Record<string, WikiPrice>) => {
  const [h1, h24] = await Promise.all([averages(client, '1h'), averages(client, '24h')])
  return runSlotCheck({ latest, h1, h24 })
}

function useForegroundChecks (active: boolean, wantHour: boolean) {
  const run = useCallback(async (client: QueryClient, latest: Record<string, WikiPrice>) => {
    const hour = wantHour ? await averages(client, '1h') : undefined
    await runAlertCheck('app', { latest, hour })
  }, [wantHour])
  useFreshLatest(active, run)
}

function useNotificationLinks () {
  useEffect(() => {
    if (Platform.OS === 'web') return
    const open = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url
      if (typeof url !== 'string' || !url.startsWith('/')) return
      Notifications.clearLastNotificationResponse()
      try {
        router.push(url as Href)
      } catch (error) {
        console.warn('[alerts] could not open the notification link', error)
      }
    }
    const sub = Notifications.addNotificationResponseReceivedListener(response => open(response.notification))
    // A tap that launched the app; the tabs are mounted by the time this runs.
    const last = Notifications.getLastNotificationResponse()
    if (last?.notification) open(last.notification)
    return () => sub.remove()
  }, [])
}

export function AlertsWatcher () {
  const { alerts, ready } = useAlerts()
  const { slots, ready: slotsReady } = useSlots()
  const count = enabledCount(alerts)
  // GE slot advice notifications ride on the same refresh and background task.
  const watchSlots = slots.notify && slots.slots.length > 0
  useForegroundChecks(count > 0, needsHourAverages(alerts.rules))
  useFreshLatest(watchSlots, checkSlots)
  useNotificationLinks()
  useEffect(() => {
    if (ready && slotsReady) syncAlertTask(count > 0 || watchSlots)
  }, [ready, slotsReady, count, watchSlots])
  return null
}
