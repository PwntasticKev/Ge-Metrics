import * as Notifications from 'expo-notifications'
import { geTax, type WikiAverage, type WikiPrice } from '@ge/engine'
import { fetchAverages, fetchLatest } from '../api/wiki'
import { reloadSlots, updateSlots } from '../state/slots'
import { adviceFromPrices } from './slots/advice'
import { slotNotices, type SlotNotice } from './slots/notify'
// Importing reminders also installs the foreground notification handler.
import './reminders'

// One GE slot check: price every open offer, and post a local notification
// for each slot whose advice just turned into an action (raise, lower,
// relist, cancel), with a per-slot cooldown. Runs alongside the alert check:
// on each price refresh in the app and in the background task.

export interface SlotPrices {
  latest?: Record<string, WikiPrice>
  h1?: Record<string, WikiAverage>
  h24?: Record<string, WikiAverage>
}

const SLOTS_LINK = '/tools/slots'
/** More than this many in one check become one summary. */
const MAX_NOTIFICATIONS = 3

async function post (notices: readonly SlotNotice[]): Promise<void> {
  if (!notices.length) return
  const permission = await Notifications.getPermissionsAsync()
  if (!permission.granted) return
  const shown = notices.length > MAX_NOTIFICATIONS ? notices.slice(0, MAX_NOTIFICATIONS - 1) : notices
  const posts = shown.map(n => ({ title: n.title, body: n.body, data: { url: `${SLOTS_LINK}?slot=${encodeURIComponent(n.slotId)}` } }))
  const rest = notices.length - shown.length
  if (rest > 0) posts.push({ title: `${rest} more GE slots need action`, body: 'Open My GE slots to see them.', data: { url: SLOTS_LINK } })
  await Promise.all(posts.map(content => Notifications.scheduleNotificationAsync({ content, trigger: null })))
}

async function orFetch<T> (given: T | undefined, load: () => Promise<T>, what: string): Promise<T | undefined> {
  if (given) return given
  try {
    return await load()
  } catch (error) {
    console.warn(`[slots] could not load ${what}`, error)
    return undefined
  }
}

/** Resolves to the number of notifications posted. */
export async function runSlotCheck (given: SlotPrices = {}): Promise<number> {
  const saved = await reloadSlots()
  if (!saved.notify || !saved.slots.length) return 0
  const latest = await orFetch(given.latest, fetchLatest, 'latest prices')
  if (!latest) return 0
  const [h1, h24] = await Promise.all([
    orFetch(given.h1, () => fetchAverages('1h'), '1h averages'),
    orFetch(given.h24, () => fetchAverages('24h'), '24h averages')
  ])
  const prices = { live: (id: number) => latest[String(id)] ?? null, h1, h24 }
  const { result } = await updateSlots(state => {
    const now = Date.now()
    const checked = slotNotices(state.slots, slot => adviceFromPrices(slot, prices, now, geTax), now)
    return { state: { ...state, slots: checked.slots }, result: checked.notices }
  })
  const notices = result ?? []
  try {
    await post(notices)
  } catch (error) {
    console.warn('[slots] could not post notifications', error)
  }
  return notices.length
}

/** Whether the background task is needed for slots. */
export async function slotsWantBackground (): Promise<boolean> {
  const saved = await reloadSlots()
  return saved.notify && saved.slots.length > 0
}
