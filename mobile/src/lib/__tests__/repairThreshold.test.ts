import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem } from '@ge/engine'
import { compareRepair } from '../repairComparison.ts'
import { repairSmithingThreshold } from '../repairThreshold.ts'

function market (buy: number | null = 754965, sell: number | null = 836275, time: number | null = 1000): Market {
  const items: MarketItem[] = [4902, 4722].map((id, i) => ({ id, name: 'legs', icon: null, members: true, limit: 15, highalch: null,
    high: i === 0 ? buy : 9999999, low: i === 1 ? sell : 1,
    highTime: time, lowTime: time, dailyVolume: null }))
  return { nowSec: 2000, get: id => items.find(item => item.id === id) ?? null, all: () => items }
}

test('research snapshot minimum is 39 with exact preceding negative margin and provenance', () => {
  const result = repairSmithingThreshold(market())
  assert.equal(result.status, 'qualifies')
  if (result.status !== 'qualifies') return
  assert.equal(result.minLevel, 39)
  assert.equal(result.marginAtLevel, 185)
  assert.equal(result.marginPrevious, -215)
  assert.deepEqual(result.quotes, compareRepair(market(), 39, 1).quotes)
  assert.equal(result.quotes.input.stale, true)
  assert.equal(result.quotes.input.mappingLimit, 15)
})

test('level 1 qualifies at zero and positive margins without a fictional previous level', () => {
  for (const [buy, margin] of [[18400, 0], [18399, 1]]) {
    const result = repairSmithingThreshold(market(buy, 100000))
    assert.equal(result.status, 'already-level-1')
    if (result.status !== 'already-level-1') continue
    assert.equal(result.minLevel, 1)
    assert.equal(result.marginAtLevel, margin)
    assert.equal(result.marginPrevious, null)
  }
})

test('negative versus exact zero boundary includes level 99', () => {
  const none = repairSmithingThreshold(market(57601, 100000))
  assert.equal(none.status, 'none-through-99')
  if (none.status === 'none-through-99') assert.equal(none.marginAt99, -1)
  const exact = repairSmithingThreshold(market(57600, 100000))
  assert.equal(exact.status, 'qualifies')
  if (exact.status === 'qualifies') {
    assert.equal(exact.minLevel, 99)
    assert.equal(exact.marginAtLevel, 0)
    assert.equal(exact.marginPrevious, -400)
  }
})

test('uses ordinary per-unit tax floor for fixed nonexempt 4722; no tax override', () => {
  const result = repairSmithingThreshold(market(57601, 100001), { staleAfterSec: 300, ...{ tax: () => 0 } })
  assert.equal(result.status, 'qualifies')
  if (result.status === 'qualifies') {
    assert.equal(result.minLevel, 99)
    assert.equal(result.marginAtLevel, 0)
    assert.equal(result.marginPrevious, -400)
  }
})

test('missing items, missing selected sides and zero quotes stay unknown', () => {
  for (const source of [market(null), market(754965, null), market(0), market(754965, 0),
    { ...market(), get: () => null }]) {
    const result = repairSmithingThreshold(source)
    assert.equal(result.status, 'unknown-quotes')
    if (result.status === 'unknown-quotes') assert.ok(result.missingSides.length > 0)
  }
})

test('unknown freshness remains unknown even for qualifying arithmetic', () => {
  const result = repairSmithingThreshold(market(18400, 100000, null))
  assert.equal(result.status, 'already-level-1')
  if (result.status === 'already-level-1') {
    assert.equal(result.quotes.input.stale, null)
    assert.equal(result.quotes.output.ageSec, null)
  }
})

test('invalid and unsafe inputs preserve source RangeError reasons instead of crashing', () => {
  for (const source of [market(-1), market(1.5), market(NaN), market(Infinity), market(Number.MAX_SAFE_INTEGER),
    market(1, -1), market(1, Number.MAX_SAFE_INTEGER + 1), { ...market(), nowSec: NaN }]) {
    let reason = ''
    assert.throws(() => compareRepair(source, 1, 1), (error: unknown) => {
      assert.ok(error instanceof RangeError)
      reason = error.message
      return true
    })
    assert.deepEqual(repairSmithingThreshold(source), { status: 'invalid', reason })
  }
  for (const staleAfterSec of [-1, NaN, Infinity]) {
    assert.deepEqual(repairSmithingThreshold(market(), { staleAfterSec }), { status: 'invalid', reason: 'Invalid quote age settings' })
  }
})

test('sub-50 sales use the shared tax exemption threshold without a fallback price', () => {
  const result = repairSmithingThreshold(market(1, 49))
  assert.equal(result.status, 'none-through-99')
  if (result.status === 'none-through-99') assert.equal(result.marginAt99, -40352)
})
