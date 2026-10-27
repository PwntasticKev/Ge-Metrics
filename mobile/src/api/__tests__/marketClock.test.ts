import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMarketFromWiki } from '../../../../src/domain/flipping/market.js'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { createMarketClock, withMarketTime } from '../marketClock.ts'

function fixture () {
  let now = 1_000_000_000
  let active = true
  let tick: (() => void) | undefined
  let lifecycle: (() => void) | undefined
  let starts = 0
  let stops = 0
  const clock = createMarketClock({
    now: () => now,
    isActive: () => active,
    start: callback => { starts++; tick = callback; return () => { stops++; tick = undefined } },
    listen: callback => { lifecycle = callback; return () => { lifecycle = undefined } }
  })
  return { clock, advance: (ms: number) => { now += ms }, tick: () => tick?.(), focus: () => lifecycle?.(), setActive: (value: boolean) => { active = value; lifecycle?.() }, counts: () => ({ starts, stops }), listening: () => Boolean(lifecycle) }
}
const recipe = { id: 'test', method: 'test', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }] }
const cached = (nowSec: number) => createMarketFromWiki({ mapping: [{ id: 1, name: 'Input' }, { id: 2, name: 'Output' }], latest: { 1: { low: 100, high: 100, lowTime: nowSec - 10, highTime: nowSec - 10 }, 2: { low: 110, high: 110, lowTime: nowSec - 10, highTime: nowSec - 10 } } })

test('restored payload and failed refresh keep prices but lose stale-filter eligibility with wall time', () => {
  const f = fixture()
  const updatedAt = f.clock.getSnapshot() * 1000
  const base = cached(updatedAt / 1000)
  let market = withMarketTime(base, f.clock.getSnapshot())
  const rows = () => [computeProcessFlip(recipe, market)!].filter(row => !row.stale)
  assert.equal(rows()[0].ageSec, 10)
  const unsubscribe = f.clock.subscribe(() => { market = withMarketTime(base, f.clock.getSnapshot()) })
  const previous = market
  // No payload/cache timestamp update: network refresh fails while the app stays active.
  f.advance(7 * 60 * 60 * 1000)
  f.tick()
  assert.notEqual(market, previous)
  assert.equal(computeProcessFlip(recipe, market)!.ageSec, 25210)
  assert.equal(rows().length, 0)
  assert.equal(market.get(1)?.low, 100)
  assert.equal(market.get, base.get)
  assert.equal(market.all, base.all)
  assert.equal(previous.nowSec, updatedAt / 1000)
  // Remount from the same old cache, without waiting for a successful fetch.
  unsubscribe()
  assert.equal(computeProcessFlip(recipe, withMarketTime(base, f.clock.getSnapshot()))!.stale, true)
  assert.equal(updatedAt, 1_000_000_000)
})

test('resume/focus resync immediately; shared subscriptions clean up timers and listeners', () => {
  const f = fixture()
  let notifications = 0
  const a = f.clock.subscribe(() => notifications++)
  const b = f.clock.subscribe(() => notifications++)
  assert.deepEqual(f.counts(), { starts: 1, stops: 0 })
  f.setActive(false)
  f.advance(7 * 60 * 60 * 1000)
  assert.deepEqual(f.counts(), { starts: 1, stops: 1 })
  f.setActive(true)
  assert.equal(f.clock.getSnapshot(), 1_025_200)
  assert.equal(notifications, 2)
  f.advance(5000)
  f.focus()
  assert.equal(f.clock.getSnapshot(), 1_025_205)
  a()
  assert.equal(f.listening(), true)
  b()
  assert.equal(f.listening(), false)
  assert.deepEqual(f.counts(), { starts: 2, stops: 2 })
})

test('existing six-hour boundary is preserved and a cached future clock cannot replace wall time', () => {
  const f = fixture()
  const base = cached(f.clock.getSnapshot())
  const unsubscribe = f.clock.subscribe(() => {})
  f.advance((6 * 60 * 60 - 10) * 1000)
  f.tick()
  const atBoundary = withMarketTime(base, f.clock.getSnapshot())
  assert.equal(computeProcessFlip(recipe, atBoundary)!.ageSec, 21600)
  assert.equal(computeProcessFlip(recipe, atBoundary)!.stale, false)
  f.advance(1000)
  f.tick()
  const after = withMarketTime(base, f.clock.getSnapshot())
  assert.equal(computeProcessFlip(recipe, after)!.stale, true)
  // Simulate rehydration carrying a future calculation time. Only observations
  // survive the wrapper; neither that time nor query dataUpdatedAt sets nowSec.
  const futureBase = withMarketTime(base, f.clock.getSnapshot() + 1_000_000)
  const restored = withMarketTime(futureBase, f.clock.getSnapshot())
  assert.equal(restored.nowSec, 1_021_591)
  assert.equal(computeProcessFlip(recipe, restored)!.ageSec, 21601)
  assert.equal(restored.get(1), base.get(1))
  assert.deepEqual(restored.all(), base.all())
  unsubscribe()
})
