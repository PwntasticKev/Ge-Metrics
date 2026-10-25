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
    buy,
    sell,
    tax: sum(parts.map(({ item, qty }) => geTax(item.high, item.id) * qty)),
    buyLimitCap: buyLimitOf(set),
    conversionCost
  }
}

function finish (plan, { recipe, set, liquidityCap, ageSec, staleAfterSec }) {
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

export function computeSetFlip (recipe, market, { staleAfterSec = DEFAULT_STALE_AFTER_SEC } = {}) {
  const set = market.get(recipe.setId)
  const parts = recipe.parts.map(p => ({ item: market.get(p.id), qty: p.qty }))
  if (!set || parts.some(p => !p.item)) return null

  const priced = item => item.high && item.low
  if (!priced(set) || !parts.every(p => priced(p.item))) return null

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
    ageSec: oldestAgeSec(market.nowSec, everything.flatMap(({ item }) => [item.highTime, item.lowTime]))
  }

  const options = [combine(set, parts, recipe.conversionCost)]
  if (recipe.reversible) options.push(split(set, parts, recipe.conversionCost))

  return options
    .map(plan => finish(plan, context))
    .sort((a, b) => b.profit - a.profit)[0]
}

export function rankSetFlips (recipes, market, { minProfit = 1, sortBy = 'potential', includeSuspicious = false, ...options } = {}) {
  return recipes
    .map(recipe => computeSetFlip(recipe, market, options))
    .filter(flip => flip && flip.profit >= minProfit && flip.maxSets !== 0 && (includeSuspicious || !flip.suspicious))
    .sort(byMetric(sortBy))
}
