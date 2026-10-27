import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRelatedPrices } from '../../lib/relatedPrices.ts'
import { indexedPath, reconcileSelection } from './geometry.ts'

test('path breaks at invalid observations and absent hourly timestamps', () => {
  const rows = [0, 3600, 7200, 10800, 18000].map(timestamp => ({ timestamp, avgHighPrice: timestamp === 7200 ? null : 100, avgLowPrice: 100, highPriceVolume: 1, lowPriceVolume: 1 }))
  const prices = buildRelatedPrices('ranarr', 'high', [{ id: 207, points: rows }, { id: 257, points: rows }])
  assert.equal(indexedPath(prices, 0, t => t, v => v), 'M0,100 L3600,100  M10800,100 M18000,100')
})

test('expired selections reset to window edges and retained exact buckets stay selected', () => {
  assert.deepEqual(reconcileSelection([20, 30, 40], { from: 10, to: 30 }), { from: 20, to: 30, reset: true })
  assert.deepEqual(reconcileSelection([20, 30, 40], { from: 30, to: 50 }), { from: 30, to: 40, reset: true })
  assert.deepEqual(reconcileSelection([20, 30, 40], { from: 20, to: 40 }), { from: 20, to: 40, reset: false })
  assert.equal(reconcileSelection([], null), null)
})
