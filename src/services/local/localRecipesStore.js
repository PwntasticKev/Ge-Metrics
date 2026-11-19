// Device-local replacement for the server's `recipes.*` procedures (user
// recipes). Mirrors the server's validation and limits so the existing
// Recipes page and modals work unchanged without an account.

const STORAGE_KEY = 'geMetrics.recipes.v1'
export const MAX_RECIPES = 300
export const MAX_INGREDIENTS = 50
const MAX_NAME_LENGTH = 255

const isPositiveInt = n => Number.isInteger(n) && n > 0
const isPositive = n => Number.isFinite(n) && n > 0

function isValidStoredRecipe (r) {
  return r !== null && typeof r === 'object' &&
    typeof r.id === 'string' &&
    isPositiveInt(r.outputItemId) &&
    Array.isArray(r.ingredients)
}

function validateName (name, label) {
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new Error(`Invalid recipe: ${label} must be 1-${MAX_NAME_LENGTH} characters.`)
  }
  return name
}

function validateIngredients (ingredients, outputItemId) {
  if (!Array.isArray(ingredients) || ingredients.length < 1 || ingredients.length > MAX_INGREDIENTS) {
    throw new Error(`Invalid recipe: needs 1-${MAX_INGREDIENTS} ingredients.`)
  }
  const clean = ingredients.map((ing, index) => {
    const itemId = Number(ing?.itemId)
    const quantity = ing?.quantity === undefined ? 1 : Number(ing.quantity)
    if (!isPositiveInt(itemId)) throw new Error('Invalid recipe: every ingredient needs an item.')
    if (!isPositive(quantity)) throw new Error('Invalid recipe: ingredient quantities must be positive.')
    return Object.freeze({ itemId, itemName: validateName(ing.itemName, 'ingredient name'), quantity, sortOrder: ing.sortOrder ?? index })
  })
  if (clean.some(ing => ing.itemId === outputItemId)) {
    throw new Error('Invalid recipe: An ingredient cannot be the same as the output item.')
  }
  return clean
}

function validateCost (cost) {
  const value = cost === undefined ? 0 : Number(cost)
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid recipe: conversion cost must be 0 or more.')
  return value
}

const defaultId = () => (globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function createLocalRecipesStore ({ storage = globalThis.localStorage, now = () => new Date(), newId = defaultId } = {}) {
  const read = () => {
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter(isValidStoredRecipe) : []
    } catch (error) {
      console.error('[localRecipesStore] Corrupt recipes data, resetting', error)
      return []
    }
  }

  const write = recipes => {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(recipes))
    } catch (error) {
      throw new Error('Could not save recipes: browser storage is full or blocked.')
    }
    return recipes
  }

  // Newest first, like the server.
  const getUserRecipes = async ({ limit = 50, offset = 0 } = {}) =>
    [...read()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(offset, offset + limit)

  const getUserRecipeCount = async () => read().length

  const createRecipe = async input => {
    const outputItemId = Number(input?.outputItemId)
    if (!isPositiveInt(outputItemId)) throw new Error('Invalid recipe: choose an output item.')
    const all = read()
    if (all.length >= MAX_RECIPES) {
      throw new Error(`You have reached the maximum limit of ${MAX_RECIPES} recipes. Please delete some recipes before creating new ones.`)
    }
    const timestamp = now().toISOString()
    const recipe = Object.freeze({
      id: newId(),
      outputItemId,
      outputItemName: validateName(input.outputItemName, 'output item name'),
      conversionCost: validateCost(input.conversionCost),
      ingredients: validateIngredients(input.ingredients, outputItemId),
      createdAt: timestamp,
      updatedAt: timestamp
    })
    const isDuplicate = all.some(r => r.outputItemId === outputItemId)
    write([...all, recipe])
    return {
      recipe,
      isGlobalDuplicate: isDuplicate,
      message: isDuplicate
        ? 'Recipe created. You already have a recipe for this output item.'
        : 'Recipe saved in this browser.'
    }
  }

  const updateRecipe = async input => {
    const all = read()
    const existing = all.find(r => r.id === input?.id)
    if (!existing) throw new Error('Recipe not found or you do not have permission to edit it.')
    const updated = Object.freeze({
      ...existing,
      conversionCost: input.conversionCost === undefined ? existing.conversionCost : validateCost(input.conversionCost),
      ingredients: input.ingredients === undefined ? existing.ingredients : validateIngredients(input.ingredients, existing.outputItemId),
      updatedAt: now().toISOString()
    })
    write(all.map(r => (r.id === existing.id ? updated : r)))
    return updated
  }

  const deleteRecipe = async input => {
    const all = read()
    if (!all.some(r => r.id === input?.id)) throw new Error('Recipe not found or you do not have permission to delete it.')
    write(all.filter(r => r.id !== input.id))
    return { success: true }
  }

  return { getUserRecipes, getUserRecipeCount, createRecipe, updateRecipe, deleteRecipe }
}

export const localRecipesStore = createLocalRecipesStore()
