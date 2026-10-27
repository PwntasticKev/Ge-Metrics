// Game updates (category game) as a release schedule for the update gate.
// OSRS updates go live on the post's date around 11:00-11:30 UTC; the gate
// treats them as live from 12:00 UTC so a decision never reads a post before
// it was published (for the "after" side of the window).

import type { GameUpdate } from '../../updates/parse.js'
import { MAJOR_UPDATE_TITLE, type ScheduledUpdate } from './gates.js'

export const UPDATE_LIVE_HOUR_UTC = 12

export function scheduleFrom (updates: readonly GameUpdate[]): ScheduledUpdate[] {
  return updates
    .filter(u => u.category === 'game')
    .flatMap(u => {
      const at = Date.parse(`${u.date}T${String(UPDATE_LIVE_HOUR_UTC).padStart(2, '0')}:00:00Z`) / 1000
      if (!Number.isFinite(at)) return []
      return [Object.freeze({ at, date: u.date, title: u.title, items: u.items.length, keyword: MAJOR_UPDATE_TITLE.test(u.title) })]
    })
    .sort((a, b) => a.at - b.at)
}
