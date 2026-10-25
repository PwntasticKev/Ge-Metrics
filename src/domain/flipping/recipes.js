// Set recipes the set-flip calculator runs over.
//
// - GE item sets (generated from the wiki): exchanged both ways for free at a
//   Grand Exchange clerk, so they can be flipped as "combine" or "split".
// - Crafted combinations (hand-maintained in item-set-filters.jsx): godswords,
//   spirit shields, etc. Treated as one-way (combine) with an optional cost.

import geItemSets from './data/geItemSets.js'

const freezeRecipe = recipe => Object.freeze({ ...recipe, parts: Object.freeze(recipe.parts.map(Object.freeze)) })

export function geSetRecipes (sets = geItemSets) {
  return sets.map(set => freezeRecipe({
    id: `ge:${set.setId}`,
    kind: 'ge-set',
    setId: set.setId,
    parts: set.parts,
    conversionCost: 0,
    reversible: true
  }))
}

// Legacy shape: { name, itemSet, itemsToCreateSet: [ids], qty?: { id, qty }, conversionCost? }
// A repeated id means "needs more than one"; `qty` sets the total count for one part.
export function normalizeLegacyRecipe (recipe) {
  const counts = recipe.itemsToCreateSet.reduce(
    (acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }),
    {}
  )
  const withQty = recipe.qty?.id ? { ...counts, [recipe.qty.id]: recipe.qty.qty } : counts
  const parts = Object.entries(withQty).map(([id, qty]) => ({ id: Number(id), qty }))

  // A set can't be one of its own parts; such entries are data errors.
  if (parts.some(p => p.id === recipe.itemSet) || parts.length === 0) return null

  return freezeRecipe({
    id: `combo:${recipe.itemSet}:${recipe.name}`,
    kind: 'combine',
    setId: recipe.itemSet,
    parts,
    conversionCost: recipe.conversionCost ?? 0,
    reversible: false
  })
}

// GE sets win when a crafted recipe duplicates one (they can also be split).
export function buildRecipes (legacyRecipes = [], sets = geItemSets) {
  const ge = geSetRecipes(sets)
  const geSetIds = new Set(ge.map(r => r.setId))
  const crafted = legacyRecipes
    .map(recipe => ({ recipe, normalized: normalizeLegacyRecipe(recipe) }))
    .filter(({ normalized }) => normalized && !geSetIds.has(normalized.setId))

  // Several recipes can make the same item (e.g. two pirate hat combos);
  // keep their names so the rows can be told apart.
  const perSet = crafted.reduce((acc, { normalized }) => ({ ...acc, [normalized.setId]: (acc[normalized.setId] ?? 0) + 1 }), {})
  const labelled = crafted.map(({ recipe, normalized }) =>
    perSet[normalized.setId] > 1 ? Object.freeze({ ...normalized, variant: recipe.name }) : normalized
  )
  return [...ge, ...labelled]
}
