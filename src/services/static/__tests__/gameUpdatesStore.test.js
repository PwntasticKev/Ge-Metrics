import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadGameUpdates, getGameEventsByDateRange, resetGameUpdatesCache } from '../gameUpdatesStore.js'

const payload = {
  generatedAt: '2026-10-26T00:00:00Z',
  updates: [
    { date: '2024-03-10', title: 'Blog', category: 'devblog', items: [4151] },
    { date: '2024-03-05', title: 'Update', category: 'game', items: [] }
  ]
}

const okFetch = () => vi.fn(async () => ({ ok: true, json: async () => payload }))

describe('gameUpdatesStore', () => {
  beforeEach(() => resetGameUpdatesCache())

  it('fetches the dataset once and caches it', async () => {
    const fetchImpl = okFetch()
    const first = await loadGameUpdates({ fetchImpl, url: '/data/game-updates.json' })
    const second = await loadGameUpdates({ fetchImpl })
    expect(first).toHaveLength(2)
    expect(second).toBe(first)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith('/data/game-updates.json')
  })

  it('retries after a failed load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = vi.fn(async () => ({ ok: false, status: 404 }))
    await expect(loadGameUpdates({ fetchImpl: failing, url: '/x.json' })).rejects.toThrow(/404/)
    const fetchImpl = okFetch()
    await expect(loadGameUpdates({ fetchImpl })).resolves.toHaveLength(2)
  })

  it('rejects malformed payloads', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ nope: true }) }))
    await expect(loadGameUpdates({ fetchImpl })).rejects.toThrow(/updates/)
  })

  it('returns { blogs, updates } for a date range', async () => {
    const events = await getGameEventsByDateRange(new Date('2024-03-01'), new Date('2024-03-31'), { fetchImpl: okFetch() })
    expect(events.blogs.map(b => b.title)).toEqual(['Blog'])
    expect(events.updates.map(u => u.title)).toEqual(['Update'])
  })
})
