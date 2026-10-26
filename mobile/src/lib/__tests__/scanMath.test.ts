/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { balancedMid, changeRatio, fitLine, median, midOf, robustSigma, stdDev } from '../scanMath.ts'

describe('scanMath', () => {
  it('takes medians of odd and even lists without sorting the input', () => {
    const values = [5, 1, 3]
    assert.equal(median(values), 3)
    assert.deepEqual(values, [5, 1, 3])
    assert.equal(median([4, 1, 3, 2]), 2.5)
    assert.ok(Number.isNaN(median([])))
  })
  it('scales the median absolute deviation like a standard deviation', () => {
    assert.equal(robustSigma([1, 2, 3, 4, 100]), 1.4826)
    assert.equal(stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2)
  })
  it('needs both sides for a mid price', () => {
    assert.equal(midOf({ avgHighPrice: 110, avgLowPrice: 90, highPriceVolume: 1, lowPriceVolume: 1 }), 100)
    assert.equal(midOf({ avgHighPrice: 110, avgLowPrice: null, highPriceVolume: 1, lowPriceVolume: 0 }), null)
    assert.equal(midOf(undefined), null)
    assert.equal(balancedMid({ avgHighPrice: 110, avgLowPrice: 90, highPriceVolume: 95, lowPriceVolume: 5 }), 100)
    assert.equal(balancedMid({ avgHighPrice: 110, avgLowPrice: 90, highPriceVolume: 96, lowPriceVolume: 4 }), null)
    assert.equal(changeRatio(100, 110)?.toFixed(2), '0.10')
    assert.equal(changeRatio(null, 110), null)
  })
  it('fits a line and reports how well it fits', () => {
    const exact = fitLine([0, 1, 2, 3], [1, 3, 5, 7])
    assert.deepEqual(exact, { slope: 2, intercept: 1, r2: 1 })
    const noisy = fitLine([0, 1, 2, 3], [1, 4, 4, 7])
    assert.ok(noisy && noisy.r2 > 0.8 && noisy.r2 < 1)
    assert.equal(fitLine([1, 1, 1], [1, 2, 3]), null)
    assert.equal(fitLine([1, 2], [1, 2]), null)
  })
})
