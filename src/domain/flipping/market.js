// A read-only price lookup the flip calculators run against.
// Built from the enriched item list the web app already loads (mapping +
// latest prices + daily volume), or from raw wiki responses on mobile.

// Share of a day's volume we assume can realistically fill in one 4-hour
// buy-limit window.
export const FOUR_HOUR_SHARE_OF_DAY = 1 / 6
export const DEFAULT_STALE_AFTER_SEC = 6 * 60 * 60
// Spreads above this are almost always a one-off fluke trade, not a real margin.
export const MAX_PLAUSIBLE_ROI = 0.25
// The wiki has no buy limit for some (mostly new, high-value) items. Assume the
// common high-value limit so their 4h profit isn't inflated by volume alone.
export const ASSUMED_BUY_LIMIT = 8

export const buyLimitOf = item => item.limit ?? ASSUMED_BUY_LIMIT

const positive = n => Number.isFinite(n) && n > 0 ? n : null
// null/undefined = unknown (no cap); 0 = no trades in the last day.
const volumeOf = v => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))

function toMarketItem (item) {
  return Object.freeze({
    id: item.id,
    name: item.name,
    icon: item.icon ?? null,
    members: Boolean(item.members),
    limit: positive(Number(item.limit)),
    highalch: positive(Number(item.highalch)),
    high: positive(Number(item.high)),
    low: positive(Number(item.low)),
    highTime: positive(Number(item.highTime)),
    lowTime: positive(Number(item.lowTime)),
    dailyVolume: volumeOf(item.dailyVolume ?? item.volume)
  })
}

// items: [{ id, name, icon, limit, members, high, low, highTime, lowTime, volume|dailyVolume }]
export function createMarket (items, { nowSec = Math.floor(Date.now() / 1000) } = {}) {
  const byId = new Map(items.filter(item => Number.isInteger(item?.id)).map(item => [item.id, toMarketItem(item)]))
  return Object.freeze({
    nowSec,
    get: id => byId.get(id) ?? null,
    all: () => [...byId.values()]
  })
}

// Builds a market from raw OSRS Wiki responses (/mapping, /latest, /volumes).
export function createMarketFromWiki ({ mapping, latest, volumes = {} }, options) {
  return createMarket(mapping.map(m => ({
    ...m,
    ...(latest[m.id] ?? {}),
    dailyVolume: volumes[m.id] ?? null
  })), options)
}

export function fillablePer4h (dailyVolume) {
  return Number.isFinite(dailyVolume) ? Math.floor(dailyVolume * FOUR_HOUR_SHARE_OF_DAY) : null
}

// Oldest of the given unix timestamps, as an age in seconds.
export function oldestAgeSec (nowSec, timestamps) {
  const known = timestamps.filter(t => Number.isFinite(t))
  return known.length ? nowSec - Math.min(...known) : null
}
