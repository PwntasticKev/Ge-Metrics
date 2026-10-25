import { describe, it, expect, vi } from 'vitest'
import { createWikiItemsService, buildVolumeMap, WikiApiError } from '../wikiItemsService.js'

const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body
})

const FIXTURES = {
  '/latest': { data: { 4151: { high: 1877000, highTime: 1, low: 1802000, lowTime: 2 } } },
  '/mapping': [{ id: 4151, name: 'Abyssal whip', limit: 70, icon: 'Abyssal whip.png' }],
  '/24h': { timestamp: 1700000000, data: { 4151: { highPriceVolume: 9000, lowPriceVolume: 5000 } } },
  '/1h': { timestamp: 1700082000, data: { 4151: { highPriceVolume: 400, lowPriceVolume: 200 }, 995: { highPriceVolume: 1 } } }
}

function fakeFetch (overrides = {}) {
  return vi.fn(async (url) => {
    const endpoint = url.replace('https://prices.runescape.wiki/api/v1/osrs', '')
    if (endpoint in overrides) return overrides[endpoint]()
    return jsonResponse(FIXTURES[endpoint])
  })
}

describe('buildVolumeMap', () => {
  it('merges daily and hourly volumes into the server shape', () => {
    const map = buildVolumeMap(FIXTURES['/24h'], FIXTURES['/1h'], '2026-10-25T00:00:00.000Z')
    expect(map[4151]).toEqual({
      itemId: 4151,
      highPriceVolume: 9000,
      lowPriceVolume: 5000,
      hourlyHighPriceVolume: 400,
      hourlyLowPriceVolume: 200,
      lastUpdatedAt: '2026-10-25T00:00:00.000Z'
    })
  })

  it('fills missing windows with zero', () => {
    const map = buildVolumeMap(FIXTURES['/24h'], FIXTURES['/1h'], 'x')
    expect(map[995]).toMatchObject({ highPriceVolume: 0, lowPriceVolume: 0, hourlyHighPriceVolume: 1, hourlyLowPriceVolume: 0 })
  })
})

describe('createWikiItemsService', () => {
  it('returns the latest price map', async () => {
    const service = createWikiItemsService({ fetchImpl: fakeFetch() })
    expect(await service.getLatest()).toEqual(FIXTURES['/latest'].data)
  })

  it('returns the mapping array', async () => {
    const service = createWikiItemsService({ fetchImpl: fakeFetch() })
    expect(await service.getMapping()).toEqual(FIXTURES['/mapping'])
  })

  it('reports fetch time as volumes lastUpdatedAt', async () => {
    const now = () => Date.parse('2026-10-25T12:00:00.000Z')
    const service = createWikiItemsService({ fetchImpl: fakeFetch(), now })
    expect(await service.getVolumesLastUpdated()).toEqual({ lastUpdatedAt: '2026-10-25T12:00:00.000Z' })
  })

  it('caches within the TTL and dedupes concurrent calls', async () => {
    const fetchImpl = fakeFetch()
    const service = createWikiItemsService({ fetchImpl })
    await Promise.all([service.getLatest(), service.getLatest()])
    await service.getLatest()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('refetches after the TTL expires', async () => {
    let t = 0
    const fetchImpl = fakeFetch()
    const service = createWikiItemsService({ fetchImpl, now: () => t })
    await service.getLatest()
    t = 61_000
    await service.getLatest()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws WikiApiError on HTTP errors with no cached data', async () => {
    const fetchImpl = fakeFetch({ '/latest': () => jsonResponse({}, { ok: false, status: 503 }) })
    const service = createWikiItemsService({ fetchImpl })
    await expect(service.getLatest()).rejects.toBeInstanceOf(WikiApiError)
  })

  it('rejects unexpected response shapes', async () => {
    const fetchImpl = fakeFetch({ '/mapping': () => jsonResponse({ not: 'an array' }) })
    const service = createWikiItemsService({ fetchImpl })
    await expect(service.getMapping()).rejects.toThrow(/Unexpected response shape/)
  })

  it('serves stale data when a refresh fails', async () => {
    let t = 0
    let fail = false
    const fetchImpl = fakeFetch({
      '/latest': () => fail ? Promise.reject(new Error('offline')) : jsonResponse(FIXTURES['/latest'])
    })
    const service = createWikiItemsService({ fetchImpl, now: () => t })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await service.getLatest()
    t = 61_000
    fail = true
    expect(await service.getLatest()).toEqual(FIXTURES['/latest'].data)
    warn.mockRestore()
  })

  it('backs off after a failure with nothing cached', async () => {
    let t = 0
    let calls = 0
    const fetchImpl = vi.fn(async () => { calls++; return jsonResponse({}, { ok: false, status: 503 }) })
    const service = createWikiItemsService({ fetchImpl, now: () => t })
    await expect(service.getLatest()).rejects.toThrow(/503/)
    t = 5_000
    await expect(service.getLatest()).rejects.toThrow(/503/)
    expect(calls).toBe(1)
    t = 16_000
    await expect(service.getLatest()).rejects.toThrow(/503/)
    expect(calls).toBe(2)
  })

  it('aborts requests that hang', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }))
    const service = createWikiItemsService({ fetchImpl })
    const result = service.getLatest()
    const assertion = expect(result).rejects.toThrow(/Timed out/)
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
    vi.useRealTimers()
  })
})
