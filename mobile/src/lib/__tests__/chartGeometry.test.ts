/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildChart, midOf, nearestIndex, nearestWithin, type SeriesPoint } from '../chartGeometry.ts'

const size = { width: 300, priceHeight: 120, volumeHeight: 30, pad: 10 }
const point = (time: number, high: number | null, low: number | null, highVolume = 0, lowVolume = 0): SeriesPoint => ({ time, high, low, highVolume, lowVolume })

describe('buildChart', () => {
  const points = [point(0, 110, 100, 5, 5), point(1000, null, 90, 0, 10), point(2000, 130, 120, 20, 0)]
  const chart = buildChart(points, size)

  it('spans the width by time and the plot height by price', () => {
    assert.ok(chart)
    assert.deepEqual(chart.xs, [0, 150, 300])
    assert.equal(chart.yOf(130), 10)
    assert.equal(chart.yOf(90), 110)
  })
  it('finds min and max across both lines', () => {
    assert.equal(chart?.min.value, 90)
    assert.equal(chart?.min.index, 1)
    assert.equal(chart?.max.value, 130)
    assert.equal(chart?.max.x, 300)
  })
  it('skips missing prices in the lines', () => {
    assert.equal(chart?.highPath.split(/[ML]/).filter(Boolean).length, 2)
    assert.equal(chart?.lowPath.split(/[ML]/).filter(Boolean).length, 3)
  })
  it('draws volume bars under the prices, tallest bar full height', () => {
    assert.match(chart?.highVolumePath ?? '', /M[\d.]+,120\.0h/)
    assert.equal(chart?.lowVolumePath.split('M').filter(Boolean).length, 2)
  })
  it('reports the mid price change over the range', () => {
    assert.equal(chart?.change, (125 - 105) / 105)
  })
  it('needs at least two points with a price', () => {
    assert.equal(buildChart([point(0, 1, 1)], size), null)
    assert.equal(buildChart([point(0, null, null), point(1, null, null)], size), null)
  })
})

describe('helpers', () => {
  it('midOf falls back to the side that traded', () => {
    assert.equal(midOf({ high: 10, low: null }), 10)
    assert.equal(midOf({ high: null, low: null }), null)
  })
  it('nearestIndex picks the closest x', () => {
    assert.equal(nearestIndex([0, 10, 20, 30], 14), 1)
    assert.equal(nearestIndex([0, 10, 20, 30], 16), 2)
    assert.equal(nearestIndex([0, 10, 20, 30], -5), 0)
    assert.equal(nearestIndex([0, 10, 20, 30], 99), 3)
    assert.equal(nearestIndex([], 5), -1)
  })
  it('nearestWithin ignores far items', () => {
    assert.equal(nearestWithin([0, 50, 100], 60, 20), 1)
    assert.equal(nearestWithin([0, 50, 100], 75, 20), -1)
  })
})
