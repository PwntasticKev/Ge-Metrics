import { describe, expect, it } from 'vitest'
import { seriesStats, priceHistory } from '../src/analysis/history.js'
import { itemDetail } from '../src/analysis/item.js'
import { ToolInputError, matchItems, resolveItem } from '../src/analysis/resolve.js'
import { searchItems } from '../src/analysis/search.js'
import { LATEST, MAPPING, NOW, VOLUMES, avg, hourly } from './fixtures/market.js'

describe('resolveItem / matchItems', () => {
  it('resolves ids, numeric strings and names', () => {
    expect(resolveItem(MAPPING, 4151).name).toBe('Abyssal whip')
    expect(resolveItem(MAPPING, ' 4151 ').name).toBe('Abyssal whip')
    expect(resolveItem(MAPPING, 'ABYSSAL whip').id).toBe(4151)
  })

  it('ranks exact > prefix > word prefix > substring', () => {
    expect(matchItems(MAPPING, 'godsword').map(m => m.name)).toEqual(['Godsword blade', 'Armadyl godsword'])
    expect(matchItems(MAPPING, 'adamant').length).toBe(5)
  })

  it('throws a readable error for unknown items', () => {
    expect(() => resolveItem(MAPPING, 99_999)).toThrow(ToolInputError)
    expect(() => resolveItem(MAPPING, 'twisted bow')).toThrow(/No tradeable item matches/)
  })
})

describe('searchItems', () => {
  it('returns quotes with margin after tax', () => {
    const [whip] = searchItems({ mapping: MAPPING, latest: LATEST, volumes: VOLUMES, query: 'whip', limit: 5 })
    // 1,000,000 - 900,000 - 20,000 tax
    expect(whip).toMatchObject({ id: 4151, buyAt: 900_000, sellAt: 1_000_000, marginAfterTax: 80_000, roiPct: 8.89, limit: 70, dailyVolume: 3000 })
  })

  it('honours the limit', () => {
    expect(searchItems({ mapping: MAPPING, latest: LATEST, volumes: VOLUMES, query: 'a', limit: 2 })).toHaveLength(2)
  })
})

describe('itemDetail', () => {
  const whip = MAPPING.find(m => m.id === 4151)!

  it('combines latest, averages, tax, margin and alching', () => {
    const detail = itemDetail({
      entry: whip,
      latest: LATEST.get(4151),
      averages: { '1h': avg(1_010_000.4, 899_999.6, 40, 50) },
      dailyVolume: 3000,
      natureRunePrice: 150,
      nowSec: NOW
    })
    expect(detail.flip).toMatchObject({ tax: 20_000, marginAfterTax: 80_000, profitPerLimit: 5_600_000, taxExempt: false })
    expect(detail.averages['1h']).toEqual({ avgHigh: 1_010_000, avgLow: 900_000, highVolume: 40, lowVolume: 50 })
    expect(detail.averages['5m']).toBeNull()
    expect(detail.alch.highAlchProfit).toBe(72_000 - 1_000_000 - 150)
    expect(detail.latest.instaBuyAgeMin).toBe(1)
  })

  it('flags tax-exempt items', () => {
    const tablet = MAPPING.find(m => m.id === 8011)!
    const detail = itemDetail({ entry: tablet, latest: LATEST.get(8011), averages: {}, dailyVolume: null, natureRunePrice: null, nowSec: NOW })
    expect(detail.flip).toMatchObject({ tax: 0, taxExempt: true, marginAfterTax: 100 })
    expect(detail.alch.highAlchProfit).toBeNull()
  })
})

describe('price history', () => {
  it('computes summary stats over the mid price', () => {
    const stats = seriesStats(hourly(0, [100, 110, 99, 121]))
    expect(stats).toMatchObject({ points: 4, min: 99, max: 121, mean: 108, first: 100, last: 121, changePct: 21, avgSpreadPct: 2.02, totalVolume: 80 })
    // returns: +10%, -10%, +22.22% -> sample std-dev ~16.27%
    expect(stats.volatilityPct).toBeCloseTo(16.27, 2)
  })

  it('handles empty and gappy series', () => {
    expect(seriesStats([])).toMatchObject({ points: 0, min: null, changePct: null, volatilityPct: null })
    const gap = { timestamp: 1, avgHighPrice: null, avgLowPrice: null, highPriceVolume: 0, lowPriceVolume: 0 }
    expect(seriesStats([gap, ...hourly(3600, [50])])).toMatchObject({ points: 2, first: 50, last: 50 })
  })

  it('returns the most recent points as compact rows', () => {
    const history = priceHistory(hourly(0, [100, 200, 300]), '1h', 2)
    expect(history.series).toEqual([[3600, 202, 198, 20], [7200, 303, 297, 20]])
    expect(history.stats.points).toBe(2)
  })
})
