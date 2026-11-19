import { describe, it, expect, vi } from 'vitest'
import { createTRPCClient } from '@trpc/client'
import { staticTrpcLink, BACKEND_UNAVAILABLE_MESSAGE } from '../staticTrpcLink.js'

function makeClient (overrides = {}) {
  const service = {
    getLatest: vi.fn(async () => ({ 4151: { high: 2, low: 1 } })),
    getMapping: vi.fn(async () => [{ id: 4151, name: 'Abyssal whip' }]),
    getVolumes: vi.fn(async () => ({ 4151: { highPriceVolume: 1 } })),
    getVolumesLastUpdated: vi.fn(async () => ({ lastUpdatedAt: 'now' })),
    ...overrides
  }
  const favorites = {
    getAll: vi.fn(async () => [{ itemId: 4151, itemType: 'item' }]),
    add: vi.fn(async input => input),
    remove: vi.fn(async () => ({ success: true }))
  }
  return { service, favorites, client: createTRPCClient({ links: [staticTrpcLink({ service, favorites })] }) }
}

describe('staticTrpcLink', () => {
  it('serves items.getAllItems from the wiki service', async () => {
    const { client } = makeClient()
    expect(await client.items.getAllItems.query()).toEqual({ 4151: { high: 2, low: 1 } })
  })

  it('serves mapping and volumes', async () => {
    const { client } = makeClient()
    expect(await client.items.getItemMapping.query()).toEqual([{ id: 4151, name: 'Abyssal whip' }])
    expect(await client.items.getAllVolumes.query()).toEqual({ 4151: { highPriceVolume: 1 } })
  })

  it('serves user recipes from the browser store', async () => {
    const recipes = {
      getUserRecipes: vi.fn(async () => [{ id: 'r1' }]),
      getUserRecipeCount: vi.fn(async () => 1),
      createRecipe: vi.fn(async input => ({ recipe: input })),
      updateRecipe: vi.fn(async input => input),
      deleteRecipe: vi.fn(async () => ({ success: true }))
    }
    const client = createTRPCClient({ links: [staticTrpcLink({ service: {}, favorites: {}, recipes })] })
    expect(await client.recipes.getUserRecipes.query({ limit: 30, offset: 0 })).toEqual([{ id: 'r1' }])
    expect(recipes.getUserRecipes).toHaveBeenCalledWith({ limit: 30, offset: 0 })
    expect(await client.recipes.getUserRecipeCount.query()).toBe(1)
    await client.recipes.createRecipe.mutate({ outputItemId: 1 })
    await client.recipes.updateRecipe.mutate({ id: 'r1', conversionCost: 5 })
    expect(await client.recipes.deleteRecipe.mutate({ id: 'r1' })).toEqual({ success: true })
    expect(recipes.createRecipe).toHaveBeenCalledWith({ outputItemId: 1 })
    expect(recipes.updateRecipe).toHaveBeenCalledWith({ id: 'r1', conversionCost: 5 })
  })

  it('treats volume backfill as a no-op', async () => {
    const { client } = makeClient()
    expect(await client.items.populateItemVolumes.mutate()).toEqual({ success: true })
  })

  it('fails backend-only procedures with a clear message', async () => {
    const { client } = makeClient()
    await expect(client.auth.me.query()).rejects.toThrow(BACKEND_UNAVAILABLE_MESSAGE)
  })

  it('propagates wiki service errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = makeClient({ getLatest: vi.fn(async () => { throw new Error('wiki down') }) })
    await expect(client.items.getAllItems.query()).rejects.toThrow('wiki down')
    error.mockRestore()
  })

  it('routes favorites to the local store', async () => {
    const { client, favorites } = makeClient()
    expect(await client.favorites.getAll.query({ itemType: 'item' })).toEqual([{ itemId: 4151, itemType: 'item' }])
    await client.favorites.add.mutate({ itemId: 1, itemType: 'item' })
    expect(favorites.add).toHaveBeenCalledWith({ itemId: 1, itemType: 'item' })
  })
})
