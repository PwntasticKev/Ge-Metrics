import { useEffect, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { EMPTY_SLOTS, parseSlots, type SlotsState } from '../lib/slots/slots'
import { loadJson, saveJson } from './storage'

// GE slots live outside React (like alerts) so the background check and the
// screens share one copy. Every change re-reads storage first, in a queue,
// so a background check and a tap can't overwrite each other.
const KEY = 'gem.slots.v1'

let current: SlotsState = EMPTY_SLOTS
let loaded = false
let queue: Promise<unknown> = Promise.resolve()
const listeners = new Set<() => void>()

const isAnything = (v: unknown): v is unknown => v !== undefined

function publish (next: SlotsState): void {
  current = next
  loaded = true
  listeners.forEach(l => l())
}

async function read (): Promise<SlotsState> {
  return parseSlots(await loadJson<unknown>(KEY, null, isAnything))
}

function enqueue<T> (job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.catch(() => undefined)
  return run
}

export function reloadSlots (): Promise<SlotsState> {
  return enqueue(async () => {
    const state = await read()
    publish(state)
    return state
  })
}

/**
 * Applies `change` to the latest saved state and saves it. `change` may
 * return extra data for the caller (e.g. how much a fill moved).
 */
export function updateSlots<R = undefined> (change: (state: SlotsState) => { state: SlotsState; result?: R }): Promise<{ state: SlotsState; result: R | undefined }> {
  return enqueue(async () => {
    const { state, result } = change(await read())
    await saveJson(KEY, state)
    publish(state)
    return { state, result }
  })
}

let appStateSub: { remove: () => void } | null = null

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  appStateSub ??= AppState.addEventListener('change', state => { if (state === 'active') reloadSlots() })
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      appStateSub?.remove()
      appStateSub = null
    }
  }
}
const snapshot = () => current

export function useSlots (): { slots: SlotsState; ready: boolean } {
  const slots = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => {
    if (!loaded) reloadSlots()
  }, [])
  return { slots, ready: loaded }
}
