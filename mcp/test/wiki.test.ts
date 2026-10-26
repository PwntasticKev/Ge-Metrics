import { describe, expect, it, vi } from 'vitest'
import { TtlCache } from '../src/cache.js'
import { UpstreamError, getJson } from '../src/wiki/http.js'
import { parseAverages, parseLatest, parseMapping, parseTimeseries } from '../src/wiki/parse.js'
import { createPriceSource } from '../src/wiki/prices.js'

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('wiki parsing', () => {
  it('keeps valid mapping rows and drops malformed ones', () => {
    const rows = parseMapping([
      { id: 4151, name: 'Abyssal whip', limit: 70, highalch: 72000, members: true },
      { id: 'x', name: 'Bad' },
      { id: 2 },
      null
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 4151, limit: 70, lowalch: null, members: true })
  })

  it('rejects responses with the wrong shape', () => {
    expect(() => parseMapping({})).toThrow(UpstreamError)
    expect(() => parseLatest([])).toThrow(UpstreamError)
  })

  it('parses id maps with nullable prices', () => {
    const latest = parseLatest({ data: { 4151: { high: 10, highTime: 1, low: null, lowTime: null } } })
    expect(latest.get(4151)).toEqual({ high: 10, highTime: 1, low: null, lowTime: null })
    const averages = parseAverages({ data: { 2: { avgHighPrice: 200, highPriceVolume: 5 } } }, '/1h')
    expect(averages.get(2)).toEqual({ avgHighPrice: 200, highPriceVolume: 5, avgLowPrice: null, lowPriceVolume: 0 })
  })

  it('sorts timeseries points by time', () => {
    const points = parseTimeseries({ data: [{ timestamp: 20, avgHighPrice: 2 }, { timestamp: 10, avgHighPrice: 1 }, { nope: 1 }] })
    expect(points.map(p => p.timestamp)).toEqual([10, 20])
  })
})

describe('getJson', () => {
  it('sends a descriptive User-Agent', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => ok({ a: 1 }))
    await getJson('https://prices.runescape.wiki/api/v1/osrs/latest', fetchImpl)
    const init = fetchImpl.mock.calls[0]?.[1] ?? {}
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/GE-Metrics/)
  })

  it('turns HTTP and network failures into UpstreamError', async () => {
    await expect(getJson('https://x.example/a', async () => new Response('', { status: 503 }))).rejects.toThrow('x.example returned HTTP 503')
    await expect(getJson('https://x.example/a', async () => { throw new TypeError('fetch failed') })).rejects.toThrow('Could not reach x.example')
  })
})

describe('createPriceSource', () => {
  it('caches responses and builds an engine market', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/mapping')) return ok([{ id: 1, name: 'Thing', limit: 10 }])
      if (url.endsWith('/latest')) return ok({ data: { 1: { high: 200, low: 100, highTime: 1, lowTime: 1 } } })
      if (url.endsWith('/volumes')) return ok({ data: { 1: 600 } })
      return new Response('', { status: 404 })
    })
    const prices = createPriceSource({ fetchImpl, cache: new TtlCache() })
    const market = await prices.market()
    await prices.mapping()
    expect(market.get(1)).toMatchObject({ high: 200, low: 100, limit: 10, dailyVolume: 600 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})
