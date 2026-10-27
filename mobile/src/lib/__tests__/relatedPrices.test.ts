/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildRelatedPrices, compareRelatedTimestamps, type RelatedGroupId } from '../relatedPrices.ts'
import type { TimeseriesPoint } from '../analytics/types.ts'

const row = (timestamp: number, high: number | null, volume = 10, low: number | null = 999): TimeseriesPoint => ({ timestamp, avgHighPrice: high, highPriceVolume: volume, avgLowPrice: low, lowPriceVolume: 20 })
const ranarr = () => buildRelatedPrices('ranarr', 'high', [
  { id: 257, points: [row(30, 60), row(20, 30)] },
  { id: 207, points: [row(30, 20), row(10, 5), row(20, 10)] }
])

describe('related price transforms', () => {
  it('sorts deterministically and indexes every leg at the first common valid baseline', () => {
    const result = ranarr()
    assert.deepEqual(result.legs.map(p => p.id), [207, 257])
    assert.deepEqual(result.buckets.map(p => p.timestamp), [10, 20, 30])
    assert.equal(result.baselineTimestamp, 20)
    assert.deepEqual(result.buckets.map(p => p.legs.map(l => l.indexed)), [[50, null], [100, 100], [200, 200]])
    assert.deepEqual(result.coverage, { total: 3, matched: 2, fraction: 2 / 3, perLeg: [{ id: 207, valid: 3 }, { id: 257, valid: 2 }] })
    assert.equal(result.buckets[0].legs[0].volume, 10)
  })

  it('never substitutes an opposite side or fills zero-volume and invalid-price gaps', () => {
    const result = buildRelatedPrices('hide', 'high', [
      { id: 1753, points: [row(1, null), row(2, 10, 0), row(3, 0), row(4, Infinity), row(5, 10, NaN)] },
      { id: 1745, points: [row(1, 20), row(2, 20), row(3, 20), row(4, 20), row(5, 20)] }
    ])
    assert.equal(result.baselineTimestamp, null)
    assert.equal(result.coverage.matched, 0)
    assert.ok(result.buckets.every(p => p.legs[0].rawGP === null && p.legs[0].volume === null && p.ratio === null))
    assert.ok(result.buckets.every(p => p.legs[1].indexed === null))
    const low = buildRelatedPrices('hide', 'low', [{ id: 1753, points: [row(1, null)] }, { id: 1745, points: [row(1, null)] }])
    assert.equal(low.coverage.matched, 1)
    assert.equal(low.buckets[0].legs[0].rawGP, 999)
    assert.equal(low.buckets[0].legs[0].volume, 20)
  })

  it('indexes the quantity-weighted input basket rather than averaging leg indices', () => {
    const result = buildRelatedPrices('crystalkey', 'high', [
      { id: 987, points: [row(1, 10), row(2, 20)] },
      { id: 985, points: [row(1, 30), row(2, 30)] },
      { id: 989, points: [row(1, 80), row(2, 90)] }
    ])
    assert.deepEqual(result.buckets.map(p => p.inputBasketGP), [40, 50])
    assert.deepEqual(result.buckets.map(p => p.inputBasketIndexed), [100, 125])
    assert.deepEqual(result.buckets.map(p => p.ratio), [2, 1.8])
    assert.equal(result.ratioUnits, 'crystal key / (loop half + tooth half)')
    assert.deepEqual(result.legs.map(p => p.quantity), [1, 1, 1])
  })

  it('keeps nonaligned timestamps separate and missing series explicit', () => {
    const result = buildRelatedPrices('ranarr', 'high', [{ id: 207, points: [row(300, 10)] }, { id: 257, points: [row(301, 20)] }])
    assert.equal(result.coverage.matched, 0)
    assert.deepEqual(result.buckets.map(p => p.legs.map(l => l.rawGP)), [[10, null], [null, 20]])
    assert.equal(buildRelatedPrices('ranarr', 'high', []).coverage.fraction, null)
    assert.equal(buildRelatedPrices('ranarr', 'high', [{ id: 207, points: [row(1, 10)] }]).baselineTimestamp, null)
  })

  it('compares exact endpoints with no invented performance across missing data', () => {
    const prices = ranarr()
    const comparison = compareRelatedTimestamps(prices, 10, 30)
    assert.deepEqual(comparison.legs.map(p => p.changePercent), [300, null])
    assert.equal(comparison.inputBasketChangePercent, 300)
    const missing = compareRelatedTimestamps(prices, 11, 30)
    assert.deepEqual(missing.missingEndpoints, ['from'])
    assert.equal(missing.from, null)
    assert.ok(missing.legs.every(p => p.changePercent === null))
    assert.equal(missing.inputBasketChangePercent, null)
    assert.equal(compareRelatedTimestamps(prices, 30, 20).legs[0].changePercent, -50)
    assert.throws(() => compareRelatedTimestamps(prices, NaN, 20))
  })

  it('rejects duplicate ids/timestamps, unexpected ids, invalid selection and times', () => {
    assert.throws(() => buildRelatedPrices('unknown' as RelatedGroupId, 'high', []))
    assert.throws(() => buildRelatedPrices('ranarr', 'high', [{ id: 989, points: [] }]))
    assert.throws(() => buildRelatedPrices('ranarr', 'high', [{ id: 207, points: [] }, { id: 207, points: [] }]))
    for (const points of [[row(1, 2), row(1, 3)], [row(NaN, 2)], [row(-1, 2)], [row(1.5, 2)]]) {
      assert.throws(() => buildRelatedPrices('ranarr', 'high', [{ id: 207, points }]))
    }
  })

  it('never returns nonfinite derived numbers when basket or index arithmetic overflows', () => {
    const result = buildRelatedPrices('crystalkey', 'high', [
      { id: 987, points: [row(1, Number.MIN_VALUE), row(2, Number.MAX_VALUE)] },
      { id: 985, points: [row(1, Number.MIN_VALUE), row(2, Number.MAX_VALUE)] },
      { id: 989, points: [row(1, 1), row(2, Number.MAX_VALUE)] }
    ])
    assert.equal(result.buckets[1].inputBasketGP, null)
    assert.equal(result.buckets[1].inputBasketIndexed, null)
    assert.equal(result.buckets[1].legs[0].indexed, null)
    assert.equal(result.buckets[1].matched, false)
    assert.equal(result.buckets[0].ratio, null)
    assert.equal(compareRelatedTimestamps(result, 1, 2).legs[0].changePercent, null)
  })
})
