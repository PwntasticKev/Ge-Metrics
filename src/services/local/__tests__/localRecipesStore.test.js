import { describe, it, expect } from 'vitest'
import { createLocalRecipesStore, MAX_RECIPES } from '../localRecipesStore.js'

function memoryStorage (initial = {}) {
  let data = { ...initial }
  return {
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data = { ...data, [key]: String(value) } }
  }
}

let seq = 0
const newStore = (storage = memoryStorage()) => {
  let t = Date.parse('2026-11-19T00:00:00.000Z')
  return createLocalRecipesStore({ storage, now: () => new Date(t += 1000), newId: () => `id-${++seq}` })
}

const GODSWORD = {
  outputItemId: 11802,
  outputItemName: 'Armadyl godsword',
  conversionCost: 0,
  ingredients: [
    { itemId: 11810, itemName: 'Armadyl hilt', quantity: 1 },
    { itemId: 11798, itemName: 'Godsword blade', quantity: 1 }
  ]
}

describe('createLocalRecipesStore', () => {
  it('creates, lists (newest first), counts and deletes recipes', async () => {
    const store = newStore()
    const first = await store.createRecipe(GODSWORD)
    await store.createRecipe({ ...GODSWORD, outputItemId: 11804, outputItemName: 'Bandos godsword' })
    const list = await store.getUserRecipes({ limit: 30, offset: 0 })
    expect(list.map(r => r.outputItemName)).toEqual(['Bandos godsword', 'Armadyl godsword'])
    expect(await store.getUserRecipeCount()).toBe(2)
    expect(list[1].ingredients).toEqual([
      { itemId: 11810, itemName: 'Armadyl hilt', quantity: 1, sortOrder: 0 },
      { itemId: 11798, itemName: 'Godsword blade', quantity: 1, sortOrder: 1 }
    ])
    await store.deleteRecipe({ id: first.recipe.id })
    expect(await store.getUserRecipeCount()).toBe(1)
  })

  it('keeps recipes across store instances sharing storage', async () => {
    const storage = memoryStorage()
    await newStore(storage).createRecipe(GODSWORD)
    expect(await newStore(storage).getUserRecipeCount()).toBe(1)
  })

  it('flags a second recipe for the same output', async () => {
    const store = newStore()
    expect((await store.createRecipe(GODSWORD)).isGlobalDuplicate).toBe(false)
    expect((await store.createRecipe(GODSWORD)).isGlobalDuplicate).toBe(true)
  })

  it('rejects circular, empty and invalid recipes like the server', async () => {
    const store = newStore()
    await expect(store.createRecipe({ ...GODSWORD, ingredients: [{ itemId: 11802, itemName: 'Armadyl godsword', quantity: 1 }] }))
      .rejects.toThrow(/cannot be the same as the output/)
    await expect(store.createRecipe({ ...GODSWORD, ingredients: [] })).rejects.toThrow(/1-50 ingredients/)
    await expect(store.createRecipe({ ...GODSWORD, outputItemId: 0 })).rejects.toThrow(/output item/)
    await expect(store.createRecipe({ ...GODSWORD, conversionCost: -5 })).rejects.toThrow(/conversion cost/)
    await expect(store.createRecipe({ ...GODSWORD, ingredients: [{ itemId: 1, itemName: 'x', quantity: 0 }] })).rejects.toThrow(/positive/)
    expect(await store.getUserRecipeCount()).toBe(0)
  })

  it('updates cost and ingredients, returning a new object', async () => {
    const store = newStore()
    const { recipe } = await store.createRecipe(GODSWORD)
    const updated = await store.updateRecipe({ id: recipe.id, conversionCost: 250, ingredients: [{ itemId: 11810, itemName: 'Armadyl hilt', quantity: 2 }] })
    expect(updated.conversionCost).toBe(250)
    expect(updated.ingredients).toHaveLength(1)
    expect(recipe.conversionCost).toBe(0)
    expect((await store.getUserRecipes())[0].conversionCost).toBe(250)
  })

  it('errors on unknown ids', async () => {
    const store = newStore()
    await expect(store.updateRecipe({ id: 'nope', conversionCost: 1 })).rejects.toThrow(/not found/)
    await expect(store.deleteRecipe({ id: 'nope' })).rejects.toThrow(/not found/)
  })

  it('enforces the recipe limit', async () => {
    const existing = Array.from({ length: MAX_RECIPES }, (_, i) => ({
      id: `r${i}`, outputItemId: i + 1, outputItemName: 'x', conversionCost: 0, ingredients: [], createdAt: '2026-01-01T00:00:00.000Z'
    }))
    const store = newStore(memoryStorage({ 'geMetrics.recipes.v1': JSON.stringify(existing) }))
    await expect(store.createRecipe(GODSWORD)).rejects.toThrow(/maximum limit/)
  })

  it('recovers from corrupt storage', async () => {
    const store = newStore(memoryStorage({ 'geMetrics.recipes.v1': '{not json' }))
    expect(await store.getUserRecipes()).toEqual([])
  })

  it('reports full or blocked storage instead of losing the recipe silently', async () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    await expect(newStore(storage).createRecipe(GODSWORD)).rejects.toThrow(/storage is full or blocked/)
  })
})
