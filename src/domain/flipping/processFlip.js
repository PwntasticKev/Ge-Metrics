// Processing flips: buy inputs on the GE, transform them (decant, clean,
// cast a spell, pay a sawmill...), sell the outputs on the GE.
//
// A recipe is one action:
//   { id, method, name, inputs: [{ id, qty }], outputs: [{ id, qty }], coinCost, coinRevenue }
// coinCost is coins paid per action (e.g. a sawmill fee); coinRevenue is coins
// received per action without selling anything (e.g. alching), so it isn't taxed.
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

// A leg whose own high/low gap (either way round) is this wide is probably a
// one-off trade: an inverted quote (instant-buy far below instant-sell) too.
const legSpread = item => {
  if (!(item.high > 0) || !(item.low > 0)) return 0
  return Math.abs(item.high - item.low) / Math.min(item.high, item.low)
}

// buyQuote: 'low' = patient buy offers (default), 'high' = buy instantly.
export function computeProcessFlip (recipe, market, { staleAfterSec = DEFAULT_STALE_AFTER_SEC, actionsPerHour = recipe.actionsPerHour ?? null, buyQuote = 'low' } = {}) {
  const inputs = resolve(recipe.inputs, market)
  const outputs = resolve(recipe.outputs, market)
  if (!inputs || !outputs) return null
  if (!inputs.length || (!outputs.length && !recipe.coinRevenue)) return null
  const instant = buyQuote === 'high'
  const buyPrice = item => (instant ? item.high : item.low)
  if (!inputs.every(r => buyPrice(r.item)) || !outputs.every(r => r.item.high)) return null

  const buy = inputs.map(({ item, qty }) => line(item, qty, buyPrice(item)))
  const sell = outputs.map(({ item, qty }) => line(item, qty, item.high))
  const coinCost = recipe.coinCost ?? 0
  const cost = sum(buy.map(l => l.total)) + coinCost
  const coinRevenue = recipe.coinRevenue ?? 0
  const revenue = sum(sell.map(l => l.total)) + coinRevenue
  const tax = sum(outputs.map(({ item, qty }) => geTax(item.high, item.id) * qty))
  const profit = revenue - cost - tax
  const roi = cost > 0 ? profit / cost : 0

  // You can only buy so many inputs per 4h, and only fill so much volume.
  const limitCap = minKnown(inputs.map(({ item, qty }) => Math.floor(buyLimitOf(item) / qty)))
  const liquidityCap = minKnown([...inputs, ...outputs].map(({ item, qty }) => {
    const fillable = fillablePer4h(item.dailyVolume)
    return fillable === null ? null : Math.floor(fillable / qty)
  }))
  // When the action rate is known, 4h of work is a hard cap too.
  const timeCap = actionsPerHour ? Math.floor(actionsPerHour * 4) : null
  const maxActions = minKnown([limitCap, liquidityCap, timeCap])
  // Freshness of the quotes actually used: the chosen buy side of each input
  // and the high (sell) side of each output.
  const ageSec = oldestAgeSec(market.nowSec, [
    ...inputs.map(({ item }) => (instant ? item.highTime : item.lowTime)),
    ...outputs.map(({ item }) => item.highTime)
  ])
  const main = (outputs[0] ?? inputs[0]).item

  return Object.freeze({
    id: recipe.id,
    method: recipe.method,
    name: recipe.name ?? main.name,
    icon: main.icon,
    buy: Object.freeze(buy),
    sell: Object.freeze(sell),
    coinCost,
    coinRevenue,
    cost,
    revenue,
    tax,
    profit,
    roi,
    maxActions,
    potential: maxActions === null ? null : profit * maxActions,
    // Sustained over the 4h window: no faster than you can act, buy or fill.
    perHour: actionsPerHour ? profit * (maxActions === null ? actionsPerHour : maxActions / 4) : null,
    buyQuote,
    ageSec,
    stale: ageSec !== null && ageSec > staleAfterSec,
    // Labour can earn a high return legitimately; only distrust it when one
    // of the quotes it rests on is itself an implausible spread.
    suspicious: roi > MAX_PLAUSIBLE_ROI && [...inputs, ...outputs].some(({ item }) => legSpread(item) > MAX_PLAUSIBLE_ROI)
  })
}

export function rankProcessFlips (recipes, market, { minProfit = 1, sortBy = 'potential', includeSuspicious = false, ...options } = {}) {
  return recipes
    .map(recipe => computeProcessFlip(recipe, market, options))
    .filter(flip => flip && flip.profit >= minProfit && flip.maxActions !== 0 && (includeSuspicious || !flip.suspicious))
    .sort(byMetric(sortBy))
}
