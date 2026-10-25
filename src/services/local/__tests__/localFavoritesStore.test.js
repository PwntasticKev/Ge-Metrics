import { describe, it, expect, vi } from 'vitest'
import { createLocalFavoritesStore } from '../localFavoritesStore.js'

function memoryStorage (initial = {}) {
  let data = { ...initial }
  return {
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data = { ...data, [key]: String(value) } }
  }
}

const fixedNow = () => new Date('2026-10-25T00:00:00.000Z')

describe('createLocalFavoritesStore', () => {
  it('adds, lists and removes favorites', async () => {
    const store = createLocalFavoritesStore({ storage: memoryStorage(), now: fixedNow })
    await store.add({ itemId: 4151, itemType: 'item' })
    await store.add({ itemId: 12, itemType: 'combination' })
    expect(await store.getAll()).toHaveLength(2)
    expect(await store.getAll({ itemType: 'item' })).toEqual([
      { itemId: 4151, itemType: 'item', createdAt: '2026-10-25T00:00:00.000Z' }
    ])
    await store.remove({ itemId: 4151, itemType: 'item' })
    expect(await store.getAll({ itemType: 'item' })).toEqual([])
  })

  it('does not duplicate an existing favorite', async () => {
    const store = createLocalFavoritesStore({ storage: memoryStorage(), now: fixedNow })
    await store.add({ itemId: 4151, itemType: 'item' })
    await store.add({ itemId: '4151', itemType: 'item' })
    expect(await store.getAll()).toHaveLength(1)
  })

  it('rejects invalid input', async () => {
    const store = createLocalFavoritesStore({ storage: memoryStorage() })
    await expect(store.add({ itemId: 'abc', itemType: 'item' })).rejects.toThrow(/Invalid favorite/)
    await expect(store.add({ itemId: 1 })).rejects.toThrow(/Invalid favorite/)
  })

  it('recovers from corrupt or malformed storage', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const corrupt = createLocalFavoritesStore({ storage: memoryStorage({ 'geMetrics.favorites.v1': '{nope' }) })
    expect(await corrupt.getAll()).toEqual([])
    const malformed = createLocalFavoritesStore({
      storage: memoryStorage({ 'geMetrics.favorites.v1': JSON.stringify([{ itemId: 1, itemType: 'item' }, { bad: true }]) })
    })
    expect(await malformed.getAll()).toEqual([{ itemId: 1, itemType: 'item' }])
    error.mockRestore()
  })
})
