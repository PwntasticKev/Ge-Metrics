import { describe, expect, test, vi } from 'vitest'
import { PRICE_CACHE_KEY_PREFIX, PRICE_CACHE_POLICY, createPricesCache } from '../pricesCache.js'

const HOUR = 60 * 60 * 1000
const MAPPING = [{ id: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png', limit: 70 }]
const LATEST = { 4151: { high: 1_500_000, highTime: 1, low: 1_450_000, lowTime: 1 } }
const VOLUMES = { 4151: 12345 }

function memoryStorage ({ quotaChars = Infinity } = {}) {
  let store = new Map()
  const used = () => [...store.entries()].reduce((n, [k, v]) => n + k.length + v.length, 0)
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      const next = new Map(store).set(key, String(value))
      store = next
      if (used() > quotaChars) {
        store.delete(key)
        const error = new Error('quota')
        error.name = 'QuotaExceededError'
        throw error
      }
    },
    removeItem: key => { store = new Map(store); store.delete(key) },
    keys: () => [...store.keys()]
  }
}

function setup (options) {
  let nowMs = 1_000_000_000_000
  const storage = memoryStorage(options)
  const cache = createPricesCache({ storage, now: () => nowMs })
  return { cache, storage, advance: ms => { nowMs += ms }, now: () => nowMs }
}

describe('pricesCache', () => {
  test('round-trips each response with the time it was saved', () => {
    const { cache, now } = setup()
    expect(cache.write('mapping', MAPPING)).toBe(true)
    expect(cache.read('mapping')).toEqual({ data: MAPPING, savedAt: now() })
  })

  test('mapping is long-lived, latest prices are short-lived', () => {
    expect(PRICE_CACHE_POLICY.mapping.maxAgeMs).toBeGreaterThanOrEqual(24 * HOUR)
    expect(PRICE_CACHE_POLICY.latest.maxAgeMs).toBeLessThanOrEqual(HOUR)
    expect(PRICE_CACHE_POLICY.latest.freshMs).toBe(0)
  })

  test('entries older than their max age are not served', () => {
    const { cache, advance } = setup()
    cache.write('latest', LATEST)
    advance(PRICE_CACHE_POLICY.latest.maxAgeMs + 1)
    expect(cache.read('latest')).toBeNull()
  })

  test('readFresh only returns mapping inside its fresh window', () => {
    const { cache, advance } = setup()
    cache.write('mapping', MAPPING)
    expect(cache.readFresh('mapping')).toEqual(MAPPING)
    advance(PRICE_CACHE_POLICY.mapping.freshMs + 1)
    expect(cache.readFresh('mapping')).toBeNull()
    // Still usable to paint while the refresh is in flight.
    expect(cache.read('mapping')?.data).toEqual(MAPPING)
  })

  test('latest is never fresh, so it is always refetched', () => {
    const { cache } = setup()
    cache.write('latest', LATEST)
    expect(cache.readFresh('latest')).toBeNull()
  })

  test('readSnapshot needs mapping, latest and volumes, and reports when prices were saved', () => {
    const { cache, advance, now } = setup()
    cache.write('mapping', MAPPING)
    advance(5000)
    cache.write('latest', LATEST)
    expect(cache.readSnapshot()).toBeNull()
    cache.write('volumes', VOLUMES)
    expect(cache.readSnapshot()).toEqual({ mapping: MAPPING, latest: LATEST, volumes: VOLUMES, savedAt: now() })
  })

  test('corrupted JSON is removed and ignored', () => {
    const { cache, storage } = setup()
    storage.setItem(`${PRICE_CACHE_KEY_PREFIX}latest`, '{not json')
    expect(cache.read('latest')).toBeNull()
    expect(storage.getItem(`${PRICE_CACHE_KEY_PREFIX}latest`)).toBeNull()
  })

  test.each([
    ['wrong envelope', JSON.stringify({ data: LATEST })],
    ['mapping not an array', JSON.stringify({ savedAt: 1, data: { 1: {} } })],
    ['saved in the future', JSON.stringify({ savedAt: 9e15, data: LATEST })]
  ])('invalid entry (%s) is removed and ignored', (_, raw) => {
    const { cache, storage } = setup()
    const name = raw.includes('"1":{}') ? 'mapping' : 'latest'
    storage.setItem(`${PRICE_CACHE_KEY_PREFIX}${name}`, raw)
    expect(cache.read(name)).toBeNull()
    expect(storage.getItem(`${PRICE_CACHE_KEY_PREFIX}${name}`)).toBeNull()
  })

  test('mapping rows without numeric ids are rejected', () => {
    const { cache } = setup()
    expect(cache.write('mapping', [{ name: 'no id' }])).toBe(false)
    expect(cache.read('mapping')).toBeNull()
  })

  test('quota errors are caught, warned about, and leave no stale entry behind', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { cache, storage } = setup({ quotaChars: 400 })
    expect(cache.write('latest', LATEST)).toBe(true)
    const big = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` }))
    expect(cache.write('mapping', big)).toBe(false)
    expect(storage.getItem(`${PRICE_CACHE_KEY_PREFIX}mapping`)).toBeNull()
    expect(cache.read('latest')?.data).toEqual(LATEST)
    expect(warn).toHaveBeenCalled()
  })

  test('works without storage (private mode, disabled cookies)', () => {
    const blocked = {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('SecurityError') },
      removeItem: () => { throw new Error('SecurityError') }
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cache = createPricesCache({ storage: blocked })
    expect(cache.write('latest', LATEST)).toBe(false)
    expect(cache.read('latest')).toBeNull()
    expect(cache.readSnapshot()).toBeNull()
    expect(createPricesCache({ storage: null }).readSnapshot()).toBeNull()
    warn.mockRestore()
  })
})
