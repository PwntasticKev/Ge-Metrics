// Processing flips: buy inputs on the GE, transform them (decant, clean,
// cast a spell, pay a sawmill...), sell the outputs on the GE.
//
// A recipe is one action:
//   { id, method, name, inputs: [{ id, qty }], outputs: [{ id, qty }], coinCost }
// Inputs are bought at their low price, outputs sold at their high price, and
// GE tax is paid on every output unit sold.

import { geTax } from './geTax.js'
import { DEFAULT_STALE_AFTER_SEC, MAX_PLAUSIBLE_ROI, buyLimitOf, fillablePer4h, oldestAgeSec } from './market.js'
import { byMetric } from './itemFlip.js'

const sum = values => values.reduce((total, v) => total + v, 0)
const minKnown = values => {
  const known = values.filter(v => Number.isFinite(v))
  return known.length ? Math.min(...known) : null
}

const line = (item, qty, price) => Object.freeze({ id: item.id, name: item.name, icon: item.icon, qty, price, total: price * qty })

function resolve (entries, market) {
  const resolved = entries.map(e => ({ item: market.get(e.id), qty: e.qty }))
  return resolved.every(r => r.item) ? resolved : null
}

export function computeProcessFlip (recipe, market, { staleAfterSec = DEFAULT_STALE_AFTER_SEC, actionsPerHour = recipe.actionsPerHour ?? null } = {}) {
  const inputs = resolve(recipe.inputs, market)
  const outputs = resolve(recipe.outputs, market)
  if (!inputs || !outputs) return null
  if (!inputs.every(r => r.item.low) || !outputs.every(r => r.item.high)) return null

  const buy = inputs.map(({ item, qty }) => line(item, qty, item.low))
  const sell = outputs.map(({ item, qty }) => line(item, qty, item.high))
  const coinCost = recipe.coinCost ?? 0
  const cost = sum(buy.map(l => l.total)) + coinCost
  const revenue = sum(sell.map(l => l.total))
  const tax = sum(outputs.map(({ item, qty }) => geTax(item.high, item.id) * qty))
  const profit = revenue - cost - tax
  const roi = profit / cost

  // You can only buy so many inputs per 4h, and only fill so much volume.
  const limitCap = minKnown(inputs.map(({ item, qty }) => Math.floor(buyLimitOf(item) / qty)))
  const liquidityCap = minKnown([...inputs, ...outputs].map(({ item, qty }) => {
    const fillable = fillablePer4h(item.dailyVolume)
    return fillable === null ? null : Math.floor(fillable / qty)
  }))
  const maxActions = minKnown([limitCap, liquidityCap])
  const ageSec = oldestAgeSec(market.nowSec, [...inputs, ...outputs].flatMap(({ item }) => [item.highTime, item.lowTime]))
  const main = outputs[0].item

  return Object.freeze({
    id: recipe.id,
    method: recipe.method,
    name: recipe.name ?? main.name,
    icon: main.icon,
    buy: Object.freeze(buy),
    sell: Object.freeze(sell),
    coinCost,
    cost,
    revenue,
    tax,
    profit,
    roi,
    maxActions,
    potential: maxActions === null ? null : profit * maxActions,
    // You can't do more actions per hour than the buy limit lets you buy.
    perHour: actionsPerHour ? profit * Math.min(actionsPerHour, maxActions === null ? actionsPerHour : maxActions / 4) : null,
    ageSec,
    stale: ageSec !== null && ageSec > staleAfterSec,
    suspicious: roi > MAX_PLAUSIBLE_ROI
  })
}

export function rankProcessFlips (recipes, market, { minProfit = 1, sortBy = 'potential', includeSuspicious = false, ...options } = {}) {
  return recipes
    .map(recipe => computeProcessFlip(recipe, market, options))
    .filter(flip => flip && flip.profit >= minProfit && flip.maxActions !== 0 && (includeSuspicious || !flip.suspicious))
    .sort(byMetric(sortBy))
}
