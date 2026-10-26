import { useEffect, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { EMPTY_ALERTS, parseAlerts, type AlertsState } from '../lib/alertState'
import { loadJson, saveJson } from './storage'

// Alerts live outside React so the background task (no UI) and the screens
// share one copy. Every change re-reads storage first, in a queue, so a
// background check and a tap in the app can't overwrite each other.
const KEY = 'gem.alerts.v1'

let current: AlertsState = EMPTY_ALERTS
let loaded = false
let queue: Promise<unknown> = Promise.resolve()
const listeners = new Set<() => void>()

const isAnything = (v: unknown): v is unknown => v !== undefined

function publish (next: AlertsState): void {
  current = next
  loaded = true
  listeners.forEach(l => l())
}

async function read (): Promise<AlertsState> {
  return parseAlerts(await loadJson<unknown>(KEY, null, isAnything))
}

function enqueue<T> (job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.catch(() => undefined)
  return run
}

/** Reloads from storage, e.g. after a background check while the app slept. */
export function reloadAlerts (): Promise<AlertsState> {
  return enqueue(async () => {
    const state = await read()
    publish(state)
    return state
  })
}

/** Applies `change` to the latest saved state and saves the result. */
export function updateAlerts (change: (state: AlertsState) => AlertsState): Promise<AlertsState> {
  return enqueue(async () => {
    const next = change(await read())
    await saveJson(KEY, next)
    publish(next)
    return next
  })
}

// One app-wide foreground listener, however many screens show alerts.
let appStateSub: { remove: () => void } | null = null

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  appStateSub ??= AppState.addEventListener('change', state => { if (state === 'active') reloadAlerts() })
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      appStateSub?.remove()
      appStateSub = null
    }
  }
}
const snapshot = () => current

/** Live alerts state for screens; reloads when the app comes back to the foreground. */
export function useAlerts (): { alerts: AlertsState; ready: boolean } {
  const alerts = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => {
    if (!loaded) reloadAlerts()
  }, [])
  return { alerts, ready: loaded }
}
