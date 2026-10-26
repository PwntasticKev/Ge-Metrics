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

// Dips: the live buy price has fallen well under the day's typical low on a
// liquid item. Buy now, sell back at the day's middle once it recovers.
export const DIP_MIN_DROP = 0.05
export const DIP_MIN_DAILY_TRADES = 100
export const DIP_MIN_HOUR_TRADES = 5
export const DIP_MIN_HOUR_SHARE = 0.5

export function rankDips (market, { h1 = {}, h24 = {}, budget = null } = {}) {
  const picks = []
  for (const item of market.all()) {
    const day = h24[item.id]
    const hour = h1[item.id]
    if (!hasPrices(day) || !hasPrices(hour) || !item.low || !item.lowTime) continue
    if (market.nowSec - item.lowTime > QUICK_MAX_AGE_SEC) continue
    // The whole last hour must be down, not one panic sale: quote the more
    // cautious of the live and last-hour low, and require several trades.
    // Volumes count items, not trades, so one dumped stack could pass a fixed
    // floor. Require at least half the day's normal hourly flow instead.
    if (hour.lowPriceVolume < Math.max(DIP_MIN_HOUR_TRADES, (day.lowPriceVolume / 24) * DIP_MIN_HOUR_SHARE)) continue
    const buyAt = Math.max(item.low, Math.round(hour.avgLowPrice))
    const drop = 1 - buyAt / day.avgLowPrice
    if (drop < DIP_MIN_DROP) continue
    const dayVolume = sideVolume(day)
    if (dayVolume < DIP_MIN_DAILY_TRADES) continue
    const sellAt = Math.round((day.avgLowPrice + day.avgHighPrice) / 2)
    // Buyers must still be paying the target this hour. If the highs fell too,
    // it's a crash, not a dip.
    if (hour.avgHighPrice < sellAt) continue
    const tax = geTax(sellAt, item.id)
    const profit = sellAt - tax - buyAt
    if (profit <= 0 || profit / buyAt > MAX_PLAUSIBLE_ROI) continue
    const maxQty = Math.min(buyLimitOf(item), Math.floor(dayVolume / QUICK_VOLUME_MULTIPLE))
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
      drop: Math.round(drop * 1000) / 1000
    }, budget))
  }
  return picks.filter(p => p.maxQty > 0).sort(byPotential)
}

// GE offer slots: members get 8, free-to-play 3.
export const MEMBERS_SLOTS = 8
export const F2P_SLOTS = 3

const affordableQty = (pick, cash) => Math.min(pick.maxQty, Math.floor(cash / pick.buyAt))
// Only the strongest picks are worth considering for a slot; this keeps the
// search fast and stops 1 gp margins from taking up slots.
export const PLAN_POOL_SIZE = 80
// Leftover-cash picks earning under this share of the plan aren't worth a slot.
export const PLAN_MIN_SHARE = 0.01

// Fills slots one at a time with whatever earns the most from the cash left.
function greedyTotal (picks, cash, slots) {
  let left = cash
  let total = 0
  let pool = picks
  for (let slot = 0; slot < slots && pool.length; slot++) {
    let best = null
    let bestQty = 0
    for (const pick of pool) {
      const qty = affordableQty(pick, left)
      if (qty > 0 && (!best || pick.profit * qty > best.profit * bestQty)) {
        best = pick
        bestQty = qty
      }
    }
    if (!best) break
    total += best.profit * bestQty
    left -= best.buyAt * bestQty
    pool = pool.filter(p => p !== best)
  }
  return total
}

// Splits a cash stack across picks for the most total profit, one pick per GE
// slot. Each step tries every candidate, plays out the remaining slots
// greedily, and keeps the candidate with the best finished plan. That stops
// one big item from swallowing cash two smaller ones would use better.
export function planCashStack (picks, { cash, slots = MEMBERS_SLOTS }) {
  if (!Number.isFinite(cash) || cash <= 0) return []
  const plan = []
  let left = cash
  let remaining = picks
    .filter(p => p.buyAt > 0 && p.profit > 0 && p.maxQty > 0)
    .map(p => ({ pick: p, value: p.profit * affordableQty(p, cash) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, PLAN_POOL_SIZE)
    .map(c => c.pick)
  while (plan.length < slots && remaining.length) {
    let best = null
    for (const pick of remaining) {
      const qty = affordableQty(pick, left)
      if (qty <= 0) continue
      const others = remaining.filter(p => p !== pick)
      const total = pick.profit * qty + greedyTotal(others, left - pick.buyAt * qty, slots - plan.length - 1)
      if (!best || total > best.total) best = { pick, qty, total }
    }
    if (!best) break
    const { pick, qty } = best
    plan.push(withQty(pick, qty))
    left -= pick.buyAt * qty
    remaining = remaining.filter(p => p !== pick)
  }
  const improved = shaveForBetterPicks(plan, remaining, left, slots)
  const total = improved.reduce((sum, p) => sum + p.potential, 0)
  return improved.filter(p => p.potential >= total * PLAN_MIN_SHARE).sort((a, b) => b.potential - a.potential)
}

const withQty = (pick, qty) => Object.freeze({ ...pick, maxQty: qty, potential: pick.profit * qty, cost: pick.buyAt * qty })

// Buying the full amount of every pick can strand cash: 3 of a 3M item leaves
// 1M that buys nothing, while 2 of it plus one 4M item earns more. While a
// slot is free, try giving up a few units of a planned pick to afford an
// unplanned one, and keep the best swap that adds profit.
function shaveForBetterPicks (plan, candidates, cash, slots) {
  let current = plan
  let left = cash
  let pool = candidates
  while (current.length < slots && pool.length) {
    let best = null
    for (const [index, planned] of current.entries()) {
      for (const extra of pool) {
        const shave = Math.max(0, Math.ceil((extra.buyAt - left) / planned.buyAt))
        if (shave >= planned.maxQty && shave > 0) continue
        const freed = left + shave * planned.buyAt
        const qty = affordableQty(extra, freed)
        if (qty <= 0) continue
        const gain = extra.profit * qty - planned.profit * shave
        if (gain > 0 && (!best || gain > best.gain)) best = { index, extra, shave, qty, gain, spent: extra.buyAt * qty - shave * planned.buyAt }
      }
    }
    if (!best) break
    const { index, extra, shave, qty, spent } = best
    current = [
      ...current.slice(0, index),
      withQty(current[index], current[index].maxQty - shave),
      ...current.slice(index + 1),
      withQty(extra, qty)
    ]
    left -= spent
    pool = pool.filter(p => p !== extra)
  }
  return current
}
