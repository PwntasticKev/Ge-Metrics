import { describe, it, expect } from 'vitest'
import { createMarket, rankQuickFlips, rankOvernightFlips } from '../index.js'

const NOW = 1_800_000_000
const fresh = { highTime: NOW - 60, lowTime: NOW - 120 }
const item = (id, extra) => ({ id, name: `Item ${id}`, limit: 10_000, members: true, ...fresh, ...extra })
const avg = (avgLowPrice, avgHighPrice, lowPriceVolume, highPriceVolume) => ({ avgLowPrice, avgHighPrice, lowPriceVolume, highPriceVolume })

describe('rankQuickFlips', () => {
  it('ranks by the margin that also held over the last hour', () => {
    const market = createMarket([
      // Live margin 100 each, but last hour only 40: counts 40.
      item(1, { low: 1000, high: 1120, dailyVolume: 600_000 }),
      // Live margin 60, last hour 70: counts 60.
      item(2, { low: 2000, high: 2101, dailyVolume: 600_000 })
    ], { nowSec: NOW })
    const h1 = { 1: avg(1000, 1061, 5000, 5000), 2: avg(2000, 2112, 5000, 5000) }
    const h24 = { 1: avg(1000, 1100, 300_000, 300_000), 2: avg(2000, 2100, 300_000, 300_000) }
    const picks = rankQuickFlips(market, { h1, h24 })
    expect(picks.map(p => [p.id, p.profit])).toEqual([[2, 59], [1, 40]])
    expect(picks[0]).toMatchObject({ buyAt: 2000, sellAt: 2101, maxQty: 10_000, potential: 590_000, cost: 20_000_000, liveProfit: 59 })
  })

  it('drops items with no margin over the hour or old prices', () => {
    const market = createMarket([
      item(2, { low: 1000, high: 1200, dailyVolume: 600_000 }),
      item(3, { low: 1000, high: 1200, dailyVolume: 600_000, highTime: NOW - 7200, lowTime: NOW - 7200 })
    ], { nowSec: NOW })
    const h1 = { 2: avg(1100, 1050, 5000, 5000), 3: avg(1000, 1150, 5000, 5000) }
    const h24 = { 2: avg(1000, 1150, 300_000, 300_000), 3: avg(1000, 1150, 300_000, 300_000) }
    expect(rankQuickFlips(market, { h1, h24 })).toEqual([])
  })

  it('shrinks the amount to what the thinner side of the market fills', () => {
    const market = createMarket([item(1, { low: 1000, high: 1200, dailyVolume: 60_000 })], { nowSec: NOW })
    const h1 = { 1: avg(1000, 1150, 5000, 5000) }
    // 30,000 a day on each side fills 5,000 in our window; the buy limit is 10,000.
    const h24 = { 1: avg(1000, 1150, 30_000, 30_000) }
    expect(rankQuickFlips(market, { h1, h24 })[0]).toMatchObject({ maxQty: 5000 })
  })

  it('quotes the last-hour sell price when the live one is a spike', () => {
    const market = createMarket([item(1, { low: 1000, high: 1240, dailyVolume: 600_000 })], { nowSec: NOW })
    const h = { 1: avg(1000, 1030, 300_000, 300_000) }
    // Sell at 1030, not 1240: 1030 - 20 tax - 1000 = 10 each.
    expect(rankQuickFlips(market, { h1: h, h24: h })[0]).toMatchObject({ buyAt: 1000, sellAt: 1030, tax: 20, profit: 10, liveProfit: 216 })
  })

  it('caps quantity to a cash stack', () => {
    const market = createMarket([item(1, { low: 1000, high: 1100, dailyVolume: 600_000 })], { nowSec: NOW })
    const h = { 1: avg(1000, 1100, 300_000, 300_000) }
    expect(rankQuickFlips(market, { h1: h, h24: h, budget: 1_000_000 })[0]).toMatchObject({ maxQty: 1000, cost: 1_000_000 })
  })
})

describe('rankOvernightFlips', () => {
  const market = createMarket([
    item(1, { low: 1000, high: 1100 }),
    item(2, { low: 1000, high: 1100 }),
    item(3, { low: 1000, high: 1100, limit: 100 })
  ], { nowSec: NOW })

  it('prices offers at the 24h averages and fills two buy-limit windows', () => {
    const h24 = { 3: avg(1000, 1100, 90_000, 90_000) }
    const h1 = { 3: avg(1010, 1090, 3000, 3000) }
    expect(rankOvernightFlips(market, { h1, h24 })[0]).toMatchObject({ id: 3, buyAt: 1000, sellAt: 1100, tax: 22, profit: 78, maxQty: 200, potential: 15_600, cost: 200_000 })
  })

  it('skips falling prices and thin markets', () => {
    const h24 = { 1: avg(1000, 1100, 90_000, 90_000), 2: avg(1000, 1100, 3, 3) }
    const h1 = { 1: avg(950, 1000, 3000, 3000), 2: avg(1000, 1100, 1, 1) }
    expect(rankOvernightFlips(market, { h1, h24 })).toEqual([])
  })

  it('skips bids the market has already run away from', () => {
    const h24 = { 1: avg(1000, 1200, 90_000, 90_000) }
    // Nobody sold under 1,150 in the last hour, so a 1,000 bid won't fill.
    const h1 = { 1: avg(1150, 1250, 3000, 3000) }
    expect(rankOvernightFlips(market, { h1, h24 })).toEqual([])
  })

  it('counts whole buy-limit windows', () => {
    const h24 = { 3: avg(1000, 1100, 90_000, 90_000) }
    const h1 = { 3: avg(1000, 1100, 3000, 3000) }
    // 6 hours spans two 4h windows: 2 x 100.
    expect(rankOvernightFlips(market, { h1, h24, hours: 6 })[0].maxQty).toBe(200)
  })
})
