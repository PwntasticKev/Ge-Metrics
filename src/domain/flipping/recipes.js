// Set recipes the set-flip calculator runs over.
//
// - GE item sets (generated from the wiki): exchanged both ways for free at a
//   Grand Exchange clerk, so they can be flipped as "combine" or "split".
// - Crafted combinations (hand-maintained in item-set-filters.jsx): godswords,
//   spirit shields, etc. Treated as one-way (combine) with an optional cost.
// - Wiki combinations (generated): every other OSRS Wiki recipe making one GE
//   item from GE items, including NPC conversions that charge a coin fee.

import geItemSets from './data/geItemSets.js'
import wikiCombinations from './data/wikiCombinations.js'

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

// How the item is made, for display: who/where, fee, skill levels.
export function wikiCombinationRecipe (combination, index = 0) {
  return freezeRecipe({
    id: `wiki:${combination.setId}:${index}`,
    kind: 'combine',
    setId: combination.setId,
    parts: combination.parts,
    conversionCost: combination.conversionCost ?? 0,
    reversible: false,
    via: combination.via ?? null,
    skills: combination.skills ?? null,
    source: combination.source ?? null
  })
}

const partsKey = recipe => `${recipe.setId}:${[...recipe.parts].sort((a, b) => a.id - b.id).map(p => `${p.id}x${p.qty}`).join(',')}:${recipe.conversionCost ?? 0}`

// GE sets win when a crafted recipe duplicates one (they can also be split);
// crafted recipes win over a wiki recipe with the same parts.
export function buildRecipes (legacyRecipes = [], sets = geItemSets, wiki = wikiCombinations) {
  const ge = geSetRecipes(sets)
  const geSetIds = new Set(ge.map(r => r.setId))
  const wikiRecipes = wiki.map((combination, index) => wikiCombinationRecipe(combination, index))
  const wikiByKey = new Map(wikiRecipes.map(recipe => [partsKey(recipe), recipe]))
  const handMade = legacyRecipes
    .map(recipe => ({ recipe, normalized: normalizeLegacyRecipe(recipe) }))
    .filter(({ normalized }) => normalized && !geSetIds.has(normalized.setId))
    // Borrow where/what-skill from the matching wiki recipe, if any.
    .map(({ recipe, normalized }) => {
      const match = wikiByKey.get(partsKey(normalized))
      return { recipe, normalized: match ? Object.freeze({ ...normalized, via: match.via, skills: match.skills, source: match.source }) : normalized }
    })
  const handMadeKeys = new Set(handMade.map(({ normalized }) => partsKey(normalized)))
  const fromWiki = wikiRecipes
    .filter(recipe => !geSetIds.has(recipe.setId) && !handMadeKeys.has(partsKey(recipe)))
    .map(normalized => ({ recipe: { name: normalized.via ?? normalized.skills ?? 'Recipe' }, normalized }))
  const crafted = [...handMade, ...fromWiki]

  // Several recipes can make the same item (e.g. two pirate hat combos);
  // keep their names so the rows can be told apart.
  const perSet = crafted.reduce((acc, { normalized }) => ({ ...acc, [normalized.setId]: (acc[normalized.setId] ?? 0) + 1 }), {})
  const labelled = crafted.map(({ recipe, normalized }) =>
    perSet[normalized.setId] > 1 ? Object.freeze({ ...normalized, variant: recipe.name }) : normalized
  )
  return [...ge, ...labelled]
}
