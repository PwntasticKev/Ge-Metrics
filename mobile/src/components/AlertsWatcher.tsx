import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { router, type Href } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import type { WikiAverage, WikiPrice } from '@ge/engine'
import { fetchAverages } from '../api/wiki'
import { runAlertCheck } from '../lib/alertCheck'
import { needsHourAverages } from '../lib/alerts'
import { enabledCount } from '../lib/alertState'
import { syncAlertTask } from '../lib/alertTask'
import { useAlerts } from '../state/alerts'

// While the app is open, alerts are checked on every /latest refresh (about
// once a minute). Also keeps the background task registered only while an
// alert is on, and opens the item when a notification is tapped.
const MIN_GAP_MS = 45_000
/** Ignore cache restores of old prices; only fresh fetches count. */
const FRESH_MS = 2 * 60_000
const HOUR_STALE_MS = 5 * 60_000

async function hourAverages (client: QueryClient): Promise<Record<string, WikiAverage> | undefined> {
  try {
    return await client.fetchQuery({ queryKey: ['averages', '1h'], queryFn: () => fetchAverages('1h'), staleTime: HOUR_STALE_MS })
  } catch (error) {
    console.warn('[alerts] could not load 1h averages', error)
    return undefined
  }
}

function useForegroundChecks (active: boolean, wantHour: boolean) {
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
      ;(async () => {
        const hour = wantHour ? await hourAverages(client) : undefined
        await runAlertCheck('app', { latest, hour })
      })().catch(error => console.warn('[alerts] foreground check failed', error))
    })
  }, [client, active, wantHour])
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
  const count = enabledCount(alerts)
  useForegroundChecks(count > 0, needsHourAverages(alerts.rules))
  useNotificationLinks()
  useEffect(() => {
    if (ready) syncAlertTask(count > 0)
  }, [ready, count])
  return null
}
