// "What should I buy right now?" Two ranked lists built on top of item flips,
// using the wiki's 1h and 24h averages so a single lucky trade can't make an
// item look good.
//
// Quick flips: buy and sell at live prices within one 4h buy-limit window.
// Overnight flips: offers at the day's typical low and high, left to fill
// while you're away.

import { applyBudget } from './budget.js'
import { computeItemFlip } from './itemFlip.js'
import { geTax } from './geTax.js'
import { MAX_PLAUSIBLE_ROI, buyLimitOf } from './market.js'

// Each side must trade at least this many times your 4h quantity per day.
export const QUICK_VOLUME_MULTIPLE = 6
// Live prices older than this are too old to act on right now.
export const QUICK_MAX_AGE_SEC = 30 * 60
export const OVERNIGHT_HOURS = 8
// How far the last hour may sit from our overnight bid or ask.
export const OVERNIGHT_PRICE_SLACK = 0.02
// Fewer trades than this per day on either side and an overnight offer
// probably won't fill.
export const OVERNIGHT_MIN_DAILY_TRADES = 24

const sideVolume = a => Math.min(a?.lowPriceVolume ?? 0, a?.highPriceVolume ?? 0)
const hasPrices = a => Number.isFinite(a?.avgLowPrice) && a.avgLowPrice > 0 && Number.isFinite(a?.avgHighPrice) && a.avgHighPrice > 0
const marginOf = (low, high, id) => high - geTax(high, id) - low

function finalize (pick, budget) {
  const capped = applyBudget(pick, budget)
  return Object.freeze({ ...capped, cost: capped.buyAt * capped.maxQty })
}

const byPotential = (a, b) => b.potential - a.potential

export function rankQuickFlips (market, { h1 = {}, h24 = {}, budget = null } = {}) {
  const picks = []
  for (const item of market.all()) {
    const flip = computeItemFlip(item, { nowSec: market.nowSec })
    if (!flip || flip.profit <= 0 || flip.suspicious || !flip.maxQty) continue
    if (flip.ageSec === null || flip.ageSec > QUICK_MAX_AGE_SEC) continue
    const hour = h1[item.id]
    if (!hasPrices(hour)) continue
    // Quote the more cautious of live and last-hour prices on each side, so a
    // one-off spike can't set the sell price.
    const buyAt = Math.max(flip.buyAt, Math.round(hour.avgLowPrice))
    const sellAt = Math.min(flip.sellAt, Math.round(hour.avgHighPrice))
    const tax = geTax(sellAt, item.id)
    const profit = sellAt - tax - buyAt
    if (profit <= 0) continue
    // Shrink to what fills: each side must trade 6x our amount per day.
    const dayVolume = sideVolume(h24[item.id])
    const maxQty = Math.min(flip.maxQty, Math.floor(dayVolume / QUICK_VOLUME_MULTIPLE))
    if (maxQty < 1) continue
    picks.push(finalize({
      id: item.id,
      name: item.name,
      icon: item.icon,
      members: item.members,
      buyAt,
      sellAt,
      tax,
      profit,
      roi: profit / buyAt,
      maxQty,
      potential: profit * maxQty,
      dayVolume,
      liveProfit: flip.profit
    }, budget))
  }
  return picks.filter(p => p.maxQty > 0).sort(byPotential)
}

export function rankOvernightFlips (market, { h1 = {}, h24 = {}, budget = null, hours = OVERNIGHT_HOURS } = {}) {
  const picks = []
  for (const item of market.all()) {
    const day = h24[item.id]
    const hour = h1[item.id]
    if (!hasPrices(day) || !hasPrices(hour)) continue
    const buyAt = Math.round(day.avgLowPrice)
    const sellAt = Math.round(day.avgHighPrice)
    const tax = geTax(sellAt, item.id)
    const profit = sellAt - tax - buyAt
    if (profit <= 0 || profit / buyAt > MAX_PLAUSIBLE_ROI) continue
    // Both offers must still be reachable: the last hour traded down near our
    // bid and up near our ask. Otherwise the market has moved away from us.
    if (hour.avgLowPrice > buyAt * (1 + OVERNIGHT_PRICE_SLACK)) continue
    if (hour.avgHighPrice < sellAt * (1 - OVERNIGHT_PRICE_SLACK)) continue
    const trend = (hour.avgLowPrice + hour.avgHighPrice) / (buyAt + sellAt) - 1
    const dayVolume = sideVolume(day)
    if (dayVolume < OVERNIGHT_MIN_DAILY_TRADES) continue
    const maxQty = Math.floor(Math.min(buyLimitOf(item) * Math.ceil(hours / 4), dayVolume * hours / 24))
    if (maxQty < 1) continue
    picks.push(finalize({
      id: item.id,
      name: item.name,
      icon: item.icon,
      members: item.members,
      buyAt,
      sellAt,
      tax,
      profit,
      roi: profit / buyAt,
      maxQty,
      potential: profit * maxQty,
      dayVolume,
      trend
    }, budget))
  }
  return picks.filter(p => p.maxQty > 0).sort(byPotential)
}
