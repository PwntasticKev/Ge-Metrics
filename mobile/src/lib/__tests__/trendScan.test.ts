/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Move } from '../marketMoves.ts'
import { dipCandidates, reversionCheck, trendCandidates, trendFit, type SeriesPoint } from '../trendScan.ts'

const STEP = 6 * 3600
const point = (i: number, mid: number, vol = 25): SeriesPoint => ({ timestamp: 1_800_000_000 + i * STEP, avgHighPrice: mid + 1, avgLowPrice: mid - 1, highPriceVolume: vol, lowPriceVolume: vol })
const series = (n: number, midAt: (i: number) => number) => Array.from({ length: n }, (_, i) => point(i, midAt(i)))
const move = (id: number, change24h: number | null, change7d: number | null, valueTraded = 50e6): Move => ({ id, now: 100, change24h, change7d, dayTrades: 500, valueTraded })

describe('candidates', () => {
  const moves = [move(1, 0, 0.06), move(2, 0, -0.2), move(3, 0, 0.02), move(4, 0, 0.5, 1e6), move(5, -0.07, 0.01), move(6, 0, null)]
  it('picks the biggest 7-day moves either way, liquid only', () => {
    assert.deepEqual(trendCandidates(moves, 5).map(m => m.id), [2, 1])
    assert.deepEqual(trendCandidates(moves, 1).map(m => m.id), [2])
  })
  it('picks the deepest drops over 24h or 7d', () => {
    assert.deepEqual(dipCandidates(moves, 5).map(m => m.id), [2, 5])
  })
})

describe('trendFit', () => {
  it('measures a steady climb', () => {
    const t = trendFit(series(120, i => 1000 * Math.pow(1.01, i / 4)))
    assert.ok(t)
    assert.equal(t.daily.toFixed(4), '0.0100')
    assert.equal(t.week.toFixed(3), (1.01 ** 7 - 1).toFixed(3))
    assert.equal(t.points, 28)
    assert.ok(t.r2 > 0.99 && t.steady)
  })
  it('does not call a choppy series steady', () => {
    const t = trendFit(series(28, i => 1000 + (i % 2 ? 60 : -60) + i))
    assert.ok(t && !t.steady && t.r2 < 0.7)
  })
  it('needs five days of points', () => {
    assert.equal(trendFit(series(19, () => 1000)), null)
  })
})

describe('reversionCheck', () => {
  const flatish = series(120, i => 1000 + (i % 2 ? 20 : -20))
  it('flags a deep drop on normal volume', () => {
    const r = reversionCheck(flatish, 880, 200) // series trades 200 a day
    assert.ok(r)
    assert.equal(r.mean, 1000)
    assert.equal(r.gap.toFixed(2), '-0.12')
    assert.equal(r.z, -6)
    assert.equal(r.volumeRatio, 1)
    assert.ok(r.candidate)
  })
  it('ignores drops on dried-up volume or small gaps', () => {
    assert.equal(reversionCheck(flatish, 880, 50)?.candidate, false)
    assert.equal(reversionCheck(flatish, 960, 200)?.candidate, false)
  })
  it('skips slow slides: the month before the drop must be range-bound', () => {
    const sliding = series(120, i => 2000 * Math.pow(0.99, i / 4))
    const r = reversionCheck(sliding, 600, 200)
    assert.ok(r)
    assert.ok(r.drift < -0.15)
    assert.equal(r.candidate, false)
  })
  it('measures against the days before the drop', () => {
    const dropped = series(120, i => (i >= 112 ? 700 : 1000 + (i % 2 ? 20 : -20)))
    const r = reversionCheck(dropped, 700, 200)
    assert.ok(r)
    assert.equal(r.mean, 1000)
    assert.ok(r.candidate)
  })
  it('needs twenty days of points', () => {
    assert.equal(reversionCheck(series(60, () => 1000), 900, 200), null)
  })
})
