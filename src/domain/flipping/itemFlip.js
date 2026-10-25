// Single-item flip: buy at the insta-sell price (low), sell at the
// insta-buy price (high), pay GE tax on the sale.

import { geTax } from './geTax.js'
import { DEFAULT_STALE_AFTER_SEC, MAX_PLAUSIBLE_ROI, buyLimitOf, fillablePer4h, oldestAgeSec } from './market.js'

const minKnown = values => {
  const known = values.filter(v => Number.isFinite(v))
  return known.length ? Math.min(...known) : null
}

export function computeItemFlip (item, { nowSec, staleAfterSec = DEFAULT_STALE_AFTER_SEC } = {}) {
  if (!item?.high || !item?.low) return null

  const buyAt = item.low
  const sellAt = item.high
  const tax = geTax(sellAt, item.id)
  const profit = sellAt - buyAt - tax
  const maxQty = minKnown([buyLimitOf(item), fillablePer4h(item.dailyVolume)])
  const ageSec = oldestAgeSec(nowSec, [item.highTime, item.lowTime])
  const roi = profit / buyAt

  return Object.freeze({
    id: item.id,
    name: item.name,
    icon: item.icon,
    members: item.members,
    buyAt,
    sellAt,
    tax,
    profit,
    roi,
    limit: buyLimitOf(item),
    limitAssumed: item.limit === null,
    dailyVolume: item.dailyVolume,
    maxQty,
    potential: maxQty === null ? null : profit * maxQty,
    ageSec,
    stale: ageSec !== null && ageSec > staleAfterSec,
    suspicious: roi > MAX_PLAUSIBLE_ROI
  })
}

export function rankItemFlips (market, { minProfit = 1, sortBy = 'potential', includeSuspicious = false, ...options } = {}) {
  return market.all()
    .map(item => computeItemFlip(item, { nowSec: market.nowSec, ...options }))
    .filter(flip => flip && flip.profit >= minProfit && flip.maxQty !== 0 && (includeSuspicious || !flip.suspicious))
    .sort(byMetric(sortBy))
}

export function byMetric (metric) {
  return (a, b) => (b[metric] ?? -Infinity) - (a[metric] ?? -Infinity)
}
