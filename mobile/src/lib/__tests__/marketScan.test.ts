/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { marketBreadth, moodOf, weightedChange } from '../breadth.ts'
import { hourStartAgo, liquidMoves, moveFor, type Move } from '../marketMoves.ts'

const avg = (mid: number, vol = 200) => ({ avgHighPrice: mid + 1, avgLowPrice: mid - 1, highPriceVolume: vol, lowPriceVolume: vol })
const move = (id: number, change24h: number | null, valueTraded: number, change7d: number | null = null): Move => ({ id, now: 100, change24h, change7d, dayTrades: 500, valueTraded })

describe('moveFor', () => {
  const s = { hour: { 1: avg(110), 2: avg(50) }, hourDayAgo: { 1: avg(100) }, hourWeekAgo: { 1: avg(88) }, day: { 1: avg(105), 2: avg(50, 50) } }
  it('compares the last hour with the same hour 1 and 7 days ago', () => {
    const m = moveFor(1, s)
    assert.ok(m)
    assert.equal(m.now, 110)
    assert.equal(m.change24h?.toFixed(3), '0.100')
    assert.equal(m.change7d?.toFixed(3), '0.250')
    assert.equal(m.valueTraded, 400 * 105)
  })
  it('ignores an hour that traded almost all on one side', () => {
    const lopsided = { avgHighPrice: 1600, avgLowPrice: 686, highPriceVolume: 2071, lowPriceVolume: 9 }
    assert.equal(moveFor(1, { ...s, hour: { 1: lopsided } }), null)
    assert.equal(moveFor(1, { ...s, hourDayAgo: { 1: lopsided } })?.change24h, null)
  })
  it('skips thin items and missing history', () => {
    assert.equal(moveFor(2, s), null)
    assert.equal(moveFor(3, s), null)
    assert.equal(moveFor(1, { ...s, hourDayAgo: undefined })?.change24h, null)
    assert.deepEqual(liquidMoves([1, 2, 3], s).map(m => m.id), [1])
  })
  it('points at whole hours behind the last full hour', () => {
    const now = Date.UTC(2026, 9, 26, 12, 30) // /1h currently reports 11:00
    assert.equal(hourStartAgo(now, 0), Date.UTC(2026, 9, 26, 11) / 1000)
    assert.equal(hourStartAgo(now, 24), Date.UTC(2026, 9, 25, 11) / 1000)
  })
})

describe('marketBreadth', () => {
  it('weights index moves by value traded', () => {
    assert.equal(weightedChange([move(1, 0.1, 3), move(2, -0.1, 1), move(3, null, 99)], m => m.change24h)?.toFixed(6), '0.050000')
    assert.equal(weightedChange([move(1, null, 3)], m => m.change24h), null)
  })
  it('counts up, down and flat, and picks the index movers', () => {
    const moves = [move(1, 0.05, 50, 0.1), move(2, -0.03, 40, -0.1), move(3, 0.005, 30), move(4, 0.02, 20), move(5, -0.2, 10), move(6, null, 5)]
    const b = marketBreadth(moves)
    assert.deepEqual([b.counted, b.up, b.down, b.flat], [5, 2, 2, 1])
    assert.deepEqual(b.gainers.map(m => m.id), [1, 4, 3])
    assert.deepEqual(b.losers.map(m => m.id), [5, 2])
    assert.equal(b.indexSize, 6)
    assert.equal(b.index7d?.toFixed(4), ((50 * 0.1 - 40 * 0.1) / 90).toFixed(4))
  })
  it('reads the mood from the index and breadth together', () => {
    assert.equal(moodOf(0.01, 10, 5), 'risk-on')
    assert.equal(moodOf(0.01, 5, 10), 'mixed')
    assert.equal(moodOf(-0.02, 3, 9), 'risk-off')
    assert.equal(moodOf(null, 9, 3), 'mixed')
  })
})
