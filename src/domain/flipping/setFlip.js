// Set flip: exploit the price gap between a set and its parts.
//
// combine: buy every part at its low, exchange into the set, sell the set high.
// split:   buy the set at its low, exchange into parts, sell every part high.
//
// Buy limits cap how many you can buy per 4h; daily volume caps how many you
// can realistically fill. Tax is paid on every item sold.

import { geTax } from './geTax.js'
import { DEFAULT_STALE_AFTER_SEC, MAX_PLAUSIBLE_ROI, buyLimitOf, fillablePer4h, oldestAgeSec } from './market.js'
import { byMetric } from './itemFlip.js'
import { applyBudget } from './budget.js'

const sum = values => values.reduce((total, v) => total + v, 0)
const minKnown = values => {
  const known = values.filter(v => Number.isFinite(v))
  return known.length ? Math.min(...known) : null
}

const line = (item, qty, price) => Object.freeze({ id: item.id, name: item.name, icon: item.icon, qty, price, total: price * qty })

function combine (set, parts, conversionCost) {
  const buy = parts.map(({ item, qty }) => line(item, qty, item.low))
  const sell = [line(set, 1, set.high)]
  return {
    direction: 'combine',
    quoteTimes: [set.highTime, ...parts.map(({ item }) => item.lowTime)],
    buy,
    sell,
    tax: geTax(set.high, set.id),
    buyLimitCap: Math.min(...parts.map(({ item, qty }) => Math.floor(buyLimitOf(item) / qty))),
    conversionCost
  }
}

function split (set, parts, conversionCost) {
  const buy = [line(set, 1, set.low)]
  const sell = parts.map(({ item, qty }) => line(item, qty, item.high))
  return {
    direction: 'split',
    quoteTimes: [set.lowTime, ...parts.map(({ item }) => item.highTime)],
    buy,
    sell,
    tax: sum(parts.map(({ item, qty }) => geTax(item.high, item.id) * qty)),
    buyLimitCap: buyLimitOf(set),
    conversionCost
  }
}

function finish (plan, { recipe, set, liquidityCap, nowSec, staleAfterSec }) {
  // Freshness of the quotes this direction actually trades on.
  const ageSec = oldestAgeSec(nowSec, plan.quoteTimes)
  const cost = sum(plan.buy.map(l => l.total)) + plan.conversionCost
  const revenue = sum(plan.sell.map(l => l.total))
  const profit = revenue - cost - plan.tax
  const maxSets = minKnown([plan.buyLimitCap, liquidityCap])
  const roi = profit / cost
  return Object.freeze({
    id: recipe.id,
    kind: recipe.kind,
    setId: set.id,
    name: set.name,
    variant: recipe.variant ?? null,
    icon: set.icon,
    direction: plan.direction,
    buy: Object.freeze(plan.buy),
    sell: Object.freeze(plan.sell),
    conversionCost: plan.conversionCost,
    cost,
    revenue,
    tax: plan.tax,
    profit,
    roi,
    maxSets,
    potential: maxSets === null ? null : profit * maxSets,
    ageSec,
    stale: ageSec !== null && ageSec > staleAfterSec,
    suspicious: roi > MAX_PLAUSIBLE_ROI
  })
}

// Every legal direction for a recipe, fully computed, or null if unpriced.
export function computeSetFlipOptions (recipe, market, { staleAfterSec = DEFAULT_STALE_AFTER_SEC } = {}) {
  const set = market.get(recipe.setId)
  const parts = recipe.parts.map(p => ({ item: market.get(p.id), qty: p.qty }))
  if (!set || parts.some(p => !p.item)) return null

  // Each direction needs only its own quotes: combine buys parts low and sells
  // the set high; split buys the set low and sells parts high.
  const canCombine = Boolean(set.high) && parts.every(p => p.item.low)
  const canSplit = Boolean(recipe.reversible && set.low) && parts.every(p => p.item.high)
  if (!canCombine && !canSplit) return null

  const everything = [{ item: set, qty: 1 }, ...parts]
  const context = {
    recipe,
    set,
    staleAfterSec,
    // The thinnest market among all traded items limits how many sets fill.
    liquidityCap: minKnown(everything.map(({ item, qty }) => {
      const fillable = fillablePer4h(item.dailyVolume)
      return fillable === null ? null : Math.floor(fillable / qty)
    })),
    nowSec: market.nowSec
  }

  const plans = []
  if (canCombine) plans.push(combine(set, parts, recipe.conversionCost))
  if (canSplit) plans.push(split(set, parts, recipe.conversionCost))
  return plans.map(plan => finish(plan, context))
}

const isEligible = (flip, { minProfit = 1, includeSuspicious = false } = {}) =>
  flip.profit >= minProfit && flip.maxSets !== 0 && (includeSuspicious || !flip.suspicious)

// Picks the direction (combine or split) that is best by `pickBy` *after*
// buy-limit, liquidity and budget caps, preferring directions that pass the
// ranking filters, and fresh prices over stale ones (so a stale direction can't
// hide a fresh alternative). A big unit margin you can only do a few times
// shouldn't beat a smaller one you can do thousands of times.
export function computeSetFlip (recipe, market, { staleAfterSec = DEFAULT_STALE_AFTER_SEC, pickBy = 'potential', budget, minProfit, includeSuspicious } = {}) {
  const options = computeSetFlipOptions(recipe, market, { staleAfterSec })
  if (!options) return null
  const capped = options.map(flip => applyBudget(flip, budget))
  const eligible = capped.filter(flip => isEligible(flip, { minProfit, includeSuspicious }))
  const fresh = eligible.filter(flip => !flip.stale)
  const pool = fresh.length ? fresh : eligible.length ? eligible : capped
  return [...pool].sort((a, b) => byMetric(pickBy)(a, b) || b.profit - a.profit)[0]
}

export function rankSetFlips (recipes, market, { minProfit = 1, sortBy = 'potential', includeSuspicious = false, budget, ...options } = {}) {
  return recipes
    .map(recipe => computeSetFlip(recipe, market, { ...options, pickBy: sortBy, budget, minProfit, includeSuspicious }))
    .filter(flip => flip && isEligible(flip, { minProfit, includeSuspicious }) && flip.affordable !== false)
    .sort(byMetric(sortBy))
}
