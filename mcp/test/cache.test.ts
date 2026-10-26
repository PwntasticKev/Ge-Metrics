import { describe, expect, it, vi } from 'vitest'
import { TtlCache } from '../src/cache.js'

describe('TtlCache', () => {
  it('serves cached values until the TTL passes', async () => {
    let now = 0
    const cache = new TtlCache({ now: () => now })
    const load = vi.fn(async () => 'v')
    await cache.get('k', 1000, load)
    now = 999
    await cache.get('k', 1000, load)
    expect(load).toHaveBeenCalledTimes(1)
    now = 1000
    await cache.get('k', 1000, load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('shares one in-flight load between concurrent callers', async () => {
    const cache = new TtlCache()
    const load = vi.fn(() => new Promise(resolve => setTimeout(() => resolve(1), 5)))
    const [a, b] = await Promise.all([cache.get('k', 1000, load), cache.get('k', 1000, load)])
    expect(a).toBe(1)
    expect(b).toBe(1)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('does not cache failures', async () => {
    const cache = new TtlCache()
    await expect(cache.get('k', 1000, async () => { throw new Error('boom') })).rejects.toThrow('boom')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(await cache.get('k', 1000, async () => 'ok')).toBe('ok')
  })

  it('evicts the oldest entries beyond maxEntries', async () => {
    const cache = new TtlCache({ maxEntries: 2 })
    await cache.get('a', 1000, async () => 1)
    await cache.get('b', 1000, async () => 2)
    await cache.get('c', 1000, async () => 3)
    expect(cache.size).toBe(2)
    const reload = vi.fn(async () => 9)
    expect(await cache.get('a', 1000, reload)).toBe(9)
  })
})
