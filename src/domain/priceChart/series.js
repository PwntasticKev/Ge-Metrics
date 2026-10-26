// Pure transforms over wiki /timeseries rows:
// { timestamp (s), avgHighPrice, avgLowPrice, highPriceVolume, lowPriceVolume }.
// "sell" = avgHighPrice / highPriceVolume (insta-buys), "buy" = the low side,
// matching the labels used across the site.

import { geTax } from '../flipping/geTax.js'

const isPrice = value => Number.isFinite(value) && value > 0
const volume = value => (Number.isFinite(value) && value > 0 ? value : 0)

// Sorted, de-duplicated points; rows without any price are dropped.
export function normalizeTimeseries (rows) {
  if (!Array.isArray(rows)) return []
  const byTime = new Map()
  for (const row of rows) {
    if (!row || !Number.isFinite(row.timestamp)) continue
    const sell = isPrice(row.avgHighPrice) ? row.avgHighPrice : null
    const buy = isPrice(row.avgLowPrice) ? row.avgLowPrice : null
    if (sell == null && buy == null) continue
    byTime.set(row.timestamp, {
      timestamp: row.timestamp,
      sell,
      buy,
      sellVolume: volume(row.highPriceVolume),
      buyVolume: volume(row.lowPriceVolume)
    })
  }
  return [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp)
}

// Mid price of a point; falls back to whichever side traded.
export function midPrice (point) {
  if (!point) return null
  const { sell, buy } = point
  if (sell != null && buy != null) return (sell + buy) / 2
  return sell ?? buy ?? null
}

// Inclusive window; null/undefined bounds are open.
export function sliceWindow (points, from, to) {
  const lo = from ?? -Infinity
  const hi = to ?? Infinity
  return (points ?? []).filter(p => p.timestamp >= lo && p.timestamp <= hi)
}

export function marginAfterTax (buy, sell, itemId) {
  if (!isPrice(buy) || !isPrice(sell)) return null
  return sell - buy - geTax(sell, Number(itemId))
}

// Hover readout for one point.
export function readout (point, itemId) {
  if (!point) return null
  return {
    timestamp: point.timestamp,
    buy: point.buy,
    sell: point.sell,
    margin: marginAfterTax(point.buy, point.sell, itemId),
    tax: isPrice(point.sell) ? geTax(point.sell, Number(itemId)) : null,
    buyVolume: point.buyVolume ?? 0,
    sellVolume: point.sellVolume ?? 0
  }
}

// Point closest to ts (points sorted). Binary search.
export function nearestPoint (points, ts) {
  if (!points?.length || !Number.isFinite(ts)) return null
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].timestamp < ts) lo = mid + 1
    else hi = mid
  }
  const after = points[lo]
  const before = points[lo - 1]
  if (!before) return after
  return Math.abs(before.timestamp - ts) <= Math.abs(after.timestamp - ts) ? before : after
}

// Last point at or before ts, or null.
export function pointAtOrBefore (points, ts) {
  let found = null
  for (const p of points ?? []) {
    if (p.timestamp > ts) break
    found = p
  }
  return found
}

const pct = (from, to) => (from > 0 ? ((to - from) / from) * 100 : null)

// Summary of a (visible) window: first->last change on the mid price,
// highest sell and lowest buy with their timestamps.
export function rangeStats (points) {
  const priced = (points ?? []).filter(p => midPrice(p) != null)
  if (priced.length === 0) return null
  const first = priced[0]
  const last = priced[priced.length - 1]
  const firstMid = midPrice(first)
  const lastMid = midPrice(last)
  const highOf = p => p.sell ?? p.buy
  const lowOf = p => p.buy ?? p.sell
  const max = priced.reduce((best, p) => (highOf(p) > highOf(best) ? p : best))
  const min = priced.reduce((best, p) => (lowOf(p) < lowOf(best) ? p : best))
  return {
    from: first.timestamp,
    to: last.timestamp,
    first: firstMid,
    last: lastMid,
    change: lastMid - firstMid,
    changePct: pct(firstMid, lastMid),
    max: { timestamp: max.timestamp, price: highOf(max) },
    min: { timestamp: min.timestamp, price: lowOf(min) },
    buyVolume: priced.reduce((sum, p) => sum + (p.buyVolume ?? 0), 0),
    sellVolume: priced.reduce((sum, p) => sum + (p.sellVolume ?? 0), 0)
  }
}

// Price move in the `horizon` seconds after `start` (e.g. a news post).
// Base = the last bucket that closed before the post (wiki timestamps mark a
// bucket's start, so the bucket stamped exactly at `start` already includes
// post trades), or the first point after it if the series starts later
// (within one horizon). Target = last
// price at/before start + horizon. Null when the series doesn't cover it yet.
export function priceChangeAfter (points, start, horizon) {
  if (!points?.length || !Number.isFinite(start) || !(horizon > 0)) return null
  const end = start + horizon
  if (points[points.length - 1].timestamp < end) return null
  const base = pointAtOrBefore(points, start - 1) ??
    points.find(p => p.timestamp >= start && p.timestamp - start <= horizon)
  const target = pointAtOrBefore(points, end)
  if (!base || !target || target.timestamp <= base.timestamp) return null
  const from = midPrice(base)
  const to = midPrice(target)
  if (from == null || to == null) return null
  return { from, to, change: to - from, changePct: pct(from, to) }
}

// Per-side volume histograms that read as a stack in Lightweight Charts
// (which can't stack): the sell bar spans buy + sell and the buy bar is
// drawn in front of it.
export function stackedVolumeBars (points, { showBuy = true, showSell = true } = {}) {
  const buyBars = showBuy
    ? (points ?? []).map(p => ({ time: p.timestamp, value: p.buyVolume ?? 0 }))
    : []
  const sellBars = showSell
    ? (points ?? []).map(p => ({
        time: p.timestamp,
        value: (p.sellVolume ?? 0) + (showBuy ? (p.buyVolume ?? 0) : 0)
      }))
    : []
  return { buyBars, sellBars }
}
