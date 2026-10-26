// Table rows for the All Items and Combination Sets pages, computed by the
// shared flipping engine (src/domain/flipping) so the website and the mobile
// app agree on tax (2%, floored, 5M cap, wiki exemptions) and margins.
// The row shapes match what the tables already render.

import { computeItemFlip, computeSetFlip, createMarket, geTax, normalizeLegacyRecipe } from '../domain/flipping/index.js'

const WIKI_IMAGE_BASE = 'https://oldschool.runescape.wiki/images/'
const wikiImage = icon => `${WIKI_IMAGE_BASE}${icon}`.replace(/ /g, '_')
const formatGp = new Intl.NumberFormat()

// Single-item flip: buy at low, sell at high. Items missing either price show 0.
export function toAllItemsRow (item) {
  const flip = computeItemFlip(item)
  return {
    ...item,
    profit: flip ? flip.profit : 0,
    tax: geTax(Number(item.high) || 0, item.id),
    img: wikiImage(item.icon)
  }
}

function partsForDisplay (recipe, itemsById) {
  return recipe.itemsToCreateSet
    .map(id => itemsById.get(id))
    .filter(Boolean)
    .map(part => ({
      ...part,
      img: wikiImage(part.icon),
      qty: recipe.itemQuantities?.[part.id] || undefined
    }))
}

function toCombinationRow (recipe, market, itemsById) {
  const normalized = normalizeLegacyRecipe(recipe)
  if (!normalized) return null
  // Combine only: the table shows each part's buy price and the set's sell price.
  const flip = computeSetFlip(normalized, market)
  if (!flip) return null

  const set = itemsById.get(recipe.itemSet)
  const sellPrice = flip.sell[0].price
  return {
    id: set.id,
    background: true,
    name: recipe.itemsToCreateSet.length > 1 ? `${set.name} (set)` : set.name,
    items: partsForDisplay(recipe, itemsById),
    img: wikiImage(set.icon),
    high: formatGp.format(sellPrice),
    sellPrice,
    profit: flip.profit,
    tax: flip.tax
  }
}

// Rows with an unpriced set or part are left out rather than priced at 0 gp.
export function buildCombinationRows (recipes, items, { nowSec } = {}) {
  const market = createMarket(items, nowSec === undefined ? undefined : { nowSec })
  const itemsById = new Map(items.map(item => [item.id, item]))
  return recipes
    .map(recipe => toCombinationRow(recipe, market, itemsById))
    .filter(Boolean)
    .sort((a, b) => b.profit - a.profit)
}
