import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'

// Hourly highs for row sparklines, shared across tables and page changes so
// paging back and forth (or the 60s price refresh) doesn't refetch history.
export const SPARKLINE_POINTS = 20
const TTL_MS = 10 * 60 * 1000

let cache = new Map() // itemId -> { promise, expiresAt }

function extractSeries (response) {
  const body = response?.data
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body?.timeseries)) return body.timeseries
  return []
}

export function toSparklineValues (series, points = SPARKLINE_POINTS) {
  return series
    .filter(p => p && typeof p.timestamp === 'number' && Number.isFinite(p.avgHighPrice ?? p.avgLowPrice))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-points)
    .map(p => p.avgHighPrice ?? p.avgLowPrice)
}

export function loadSparkline (itemId, { now = Date.now, fetchHistory = getItemHistoryById } = {}) {
  const entry = cache.get(itemId)
  if (entry && entry.expiresAt > now()) return entry.promise

  const promise = fetchHistory('1h', itemId).then(response => {
    if (!response?.success) throw new Error(`No history for item ${itemId}`)
    return toSparklineValues(extractSeries(response))
  })
  cache = new Map(cache).set(itemId, { promise, expiresAt: now() + TTL_MS })
  // Don't keep failures around: let the next view retry.
  promise.catch(() => {
    if (cache.get(itemId)?.promise !== promise) return
    const next = new Map(cache)
    next.delete(itemId)
    cache = next
  })
  return promise
}

export function clearSparklineCache () {
  cache = new Map()
}
