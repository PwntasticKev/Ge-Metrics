// Loads the static game-updates dataset (public/data/game-updates.json,
// built by scripts/generate-game-updates.js). Fetched once per page load and
// shared by every chart; a failed load is retried on the next call.

import { filterUpdatesByDateRange, parseGameUpdatesPayload, toChartEvents } from '../../domain/gameUpdates/index.js'

export const GAME_UPDATES_PATH = 'data/game-updates.json'

const baseUrl = () => import.meta.env.BASE_URL || '/'

let cached = null

export function loadGameUpdates ({ fetchImpl = globalThis.fetch, url = `${baseUrl()}${GAME_UPDATES_PATH}` } = {}) {
  if (!cached) {
    cached = fetchImpl(url)
      .then(response => {
        if (!response.ok) throw new Error(`${url} returned ${response.status}`)
        return response.json()
      })
      .then(parseGameUpdatesPayload)
      .catch(error => {
        cached = null
        console.error('[gameUpdatesStore] Could not load game updates', error)
        throw error
      })
  }
  return cached
}

// Same { blogs, updates } shape the gameEvents.getByDateRange endpoint returned.
export async function getGameEventsByDateRange (startDate, endDate, options) {
  const updates = await loadGameUpdates(options)
  return toChartEvents(filterUpdatesByDateRange(updates, startDate, endDate))
}

export function resetGameUpdatesCache () {
  cached = null
}
