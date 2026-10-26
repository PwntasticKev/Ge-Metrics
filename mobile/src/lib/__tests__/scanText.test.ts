/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { marketBreadth } from '../breadth.ts'
import { breadthShares, multipleText, signedPct } from '../scanText.ts'

describe('scanText', () => {
  it('signs percentages and never shows -0.0%', () => {
    assert.equal(signedPct(0.1234), '+12.3%')
    assert.equal(signedPct(-0.05), '-5.0%')
    assert.equal(signedPct(-0.0001), '0.0%')
    assert.equal(signedPct(null), '–')
  })
  it('keeps multiples short', () => {
    assert.equal(multipleText(3.456), '3.5×')
    assert.equal(multipleText(12.6), '13×')
    assert.equal(multipleText(400), '99×+')
  })
  it('turns breadth counts into whole percents', () => {
    const move = (c: number) => ({ id: 1, now: 1, change24h: c, change7d: null, dayTrades: 1, valueTraded: 1 })
    assert.deepEqual(breadthShares(marketBreadth([move(0.1), move(0.1), move(-0.1)])), { up: 67, down: 33, flat: 0 })
    assert.deepEqual(breadthShares(marketBreadth([])), { up: 0, down: 0, flat: 0 })
  })
})
