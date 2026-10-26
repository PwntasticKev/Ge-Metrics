// Queries over the game-updates dataset, plus the {blogs, updates} shape the
// charts used to get from the gameEvents tRPC endpoint.

const DAY_MS = 24 * 60 * 60 * 1000

// "2026-10-14" -> ms at 00:00 UTC, or NaN.
export function updateTime (update) {
  return typeof update?.date === 'string' ? Date.parse(`${update.date}T00:00:00Z`) : NaN
}

function toMs (value) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Date.parse(value)
  return NaN
}

// Inclusive on both ends; end covers the whole of its day. Missing bound = open.
export function filterUpdatesByDateRange (updates, start, end) {
  const from = start == null ? -Infinity : toMs(start)
  const to = end == null ? Infinity : toMs(end)
  if (Number.isNaN(from) || Number.isNaN(to)) return []
  return (updates ?? []).filter(update => {
    const time = updateTime(update)
    return time + DAY_MS > from && time <= to
  })
}

export function mentionsItem (update, itemId) {
  const id = Number(itemId)
  return Number.isInteger(id) && Array.isArray(update?.items) && update.items.includes(id)
}

export function filterUpdatesByItem (updates, itemId) {
  return (updates ?? []).filter(update => mentionsItem(update, itemId))
}

export function isBlogCategory (category) {
  return typeof category === 'string' && category.toLowerCase().includes('blog')
}

// Dev blogs -> blog markers, everything else -> update markers.
export function toChartEvents (updates) {
  const events = { blogs: [], updates: [] }
  for (const update of updates ?? []) {
    const event = {
      date: update.date,
      title: update.title,
      category: update.category,
      url: update.url ?? null,
      wikiUrl: update.wikiUrl ?? null,
      items: Array.isArray(update.items) ? update.items : []
    }
    if (isBlogCategory(update.category)) events.blogs.push(event)
    else events.updates.push(event)
  }
  return events
}

// Validates a parsed /data/game-updates.json payload; drops malformed rows.
export function parseGameUpdatesPayload (payload) {
  const rows = Array.isArray(payload?.updates) ? payload.updates : null
  if (!rows) throw new Error('game-updates.json: missing "updates" array')
  return rows.filter(row => row && typeof row.title === 'string' && !Number.isNaN(updateTime(row)))
}
