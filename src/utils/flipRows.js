// Table rows for the All Items and Combination Sets pages, computed by the
// shared flipping engine (src/domain/flipping) so the website and the mobile
// app agree on tax (2%, floored, 5M cap, wiki exemptions), margins, buy-limit
// and volume caps.

import { applyBudget, buildRecipes, computeItemFlip, computeSetFlip, craftedRecipes, createMarket, geTax, normalizeLegacyRecipe } from '../domain/flipping/index.js'

const WIKI_IMAGE_BASE = 'https://oldschool.runescape.wiki/images/'
const wikiImage = icon => `${WIKI_IMAGE_BASE}${icon}`.replace(/ /g, '_')
const formatGp = new Intl.NumberFormat()
const nowInSec = () => Math.floor(Date.now() / 1000)

// How rows can be ranked. potential = GP from one 4h buy-limit window, capped
// by the buy limit and by roughly 1/6 of a day's traded volume.
export const ROW_SORTS = Object.freeze({
  potential: { value: 'potential', label: '4h profit' },
  profit: { value: 'profit', label: 'Profit each' },
  roi: { value: 'roi', label: 'ROI' }
})
export const DEFAULT_ROW_SORT = 'potential'

// Single-item flip: buy at low, sell at high. Items missing either price show
// 0 profit and no 4h estimate. ItemData calls the daily volume `volume`.
// budget (gp, optional) caps the 4h quantity to what you can afford.
export function toAllItemsRow (item, { nowSec = nowInSec(), budget = null } = {}) {
  const flip = applyBudget(computeItemFlip({ ...item, dailyVolume: item.dailyVolume ?? item.volume }, { nowSec }), budget)
  return {
    ...item,
    profit: flip ? flip.profit : 0,
    tax: geTax(Number(item.high) || 0, item.id),
    img: wikiImage(item.icon),
    roi: flip ? flip.roi : 0,
    maxQty: flip ? flip.maxQty : null,
    potential: flip ? flip.potential : null,
    stale: flip ? flip.stale : false,
    suspicious: flip ? flip.suspicious : false
  }
}

// A row worth recommending: makes money, can be filled, prices are fresh and
// the margin isn't a one-off fluke. Flagged rows stay listed (and searchable),
// just below every recommendable one.
export const isRecommendable = row =>
  row.profit > 0 && row.maxQty !== 0 && !row.stale && !row.suspicious

export function sortRows (rows, sortBy = DEFAULT_ROW_SORT) {
  const metric = row => (Number.isFinite(row[sortBy]) ? row[sortBy] : -Infinity)
  return [...rows].sort((a, b) =>
    (isRecommendable(b) - isRecommendable(a)) || (metric(b) - metric(a)) || (b.profit - a.profit))
}

// GE item sets (both directions) + crafted combinations, like the app.
export const COMBINATION_RECIPES = buildRecipes(craftedRecipes)

const toRecipe = recipe => (recipe.parts ? recipe : normalizeLegacyRecipe(recipe))

function toCombinationRow (recipe, market, itemsById, sortBy, budget) {
  const normalized = toRecipe(recipe)
  if (!normalized) return null
  // Direction (combine or split) is chosen after buy-limit and volume caps.
  const flip = computeSetFlip(normalized, market, { pickBy: sortBy, budget })
  if (!flip) return null

  const set = itemsById.get(flip.setId)
  const revenue = flip.sell.reduce((total, l) => total + l.total, 0)
  const split = flip.direction === 'split'
  return {
    id: set.id,
    background: true,
    name: split ? `${set.name} → parts` : (normalized.parts.length > 1 ? `${set.name} (set)` : set.name),
    direction: flip.direction,
    // What you buy, with the engine's quantities and the price it was priced at.
    items: flip.buy.map(l => ({ ...itemsById.get(l.id), img: wikiImage(l.icon), qty: l.qty > 1 ? l.qty : undefined, low: l.price })),
    img: wikiImage(set.icon),
    high: formatGp.format(revenue),
    sellPrice: revenue,
    // The set's own price, for its chart (a split sells parts, not the set).
    chartPrice: Number(set.high) || revenue,
    profit: flip.profit,
    tax: flip.tax,
    roi: flip.roi,
    maxQty: flip.maxSets,
    potential: flip.potential,
    stale: flip.stale,
    suspicious: flip.suspicious
  }
}

// Rows with an unpriced set or part are left out rather than priced at 0 gp.
// Accepts engine recipes ({ parts }) or legacy ones ({ itemsToCreateSet }).
export function buildCombinationRows (recipes, items, { nowSec, sortBy = DEFAULT_ROW_SORT, budget = null } = {}) {
  const market = createMarket(
    items.map(item => ({ ...item, dailyVolume: item.dailyVolume ?? item.volume })),
    nowSec === undefined ? undefined : { nowSec }
  )
  const itemsById = new Map(items.map(item => [item.id, item]))
  return sortRows(
    recipes.map(recipe => toCombinationRow(recipe, market, itemsById, sortBy, budget)).filter(Boolean),
    sortBy
  )
}
