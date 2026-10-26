/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { dayOfWeekProfile, hourOfDayProfile, utcHourOf, utcWeekdayOf } from '../analytics/timeProfile.ts'
import { median, signTestP } from '../analytics/stats.ts'
import type { TimeseriesPoint } from '../analytics/types.ts'

const HOUR = 3600
const START = Date.UTC(2026, 9, 1) / 1000 // a Thursday, 00:00 UTC

// Deterministic noise so the tests never flake.
function rng (seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function series (count: number, stepSec: number, price: (ts: number, i: number) => { low: number; high: number }, volume = 100): TimeseriesPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const ts = START + i * stepSec
    const { low, high } = price(ts, i)
    return { timestamp: ts, avgLowPrice: Math.round(low), avgHighPrice: Math.round(high), lowPriceVolume: volume, highPriceVolume: volume }
  })
}

describe('stats', () => {
  it('takes medians of odd and even lists', () => {
    assert.equal(median([3, 1, 2]), 2)
    assert.equal(median([4, 1, 3, 2]), 2.5)
    assert.equal(median([]), null)
  })
  it('gives sign-test tails', () => {
    assert.equal(signTestP(0, 10), 1)
    assert.equal(signTestP(10, 10), 1 / 1024)
    assert.ok(Math.abs(signTestP(8, 10) - 56 / 1024) < 1e-12)
    assert.equal(signTestP(0, 0), 1)
  })
  it('reads UTC hours and weekdays', () => {
    assert.equal(utcHourOf(START + 5 * HOUR + 59), 5)
    assert.equal(utcWeekdayOf(START), 4) // Thursday
  })
})

describe('hourOfDayProfile', () => {
  it('finds a daily dip and peak that repeat every day', () => {
    const noise = rng(1)
    const points = series(365, HOUR, ts => {
      const hour = utcHourOf(ts)
      const bump = hour === 3 ? -0.03 : hour === 18 ? 0.03 : 0
      const wobble = (noise() - 0.5) * 0.004
      return { low: 10_000 * (1 + bump + wobble), high: 10_300 * (1 + bump + wobble) }
    })
    const profile = hourOfDayProfile(points)
    assert.equal(profile.buy?.slot, 3)
    assert.equal(profile.sell?.slot, 18)
    assert.equal(profile.buy?.confidence, 'high')
    assert.equal(profile.sell?.confidence, 'high')
    assert.ok(Math.abs((profile.buy?.edge ?? 0) - 0.03) < 0.005)
    assert.ok(Math.abs((profile.buy?.edgeGp ?? 0) - 300) < 50)
    assert.ok((profile.buy?.beatRate ?? 0) > 0.9)
    assert.equal(profile.slots.length, 24)
  })

  it('does not call a pattern from pure noise', () => {
    const noise = rng(7)
    const points = series(365, HOUR, () => {
      const wobble = (noise() - 0.5) * 0.02
      return { low: 50_000 * (1 + wobble), high: 51_000 * (1 + wobble) }
    })
    const profile = hourOfDayProfile(points)
    assert.notEqual(profile.buy?.confidence, 'high')
    assert.notEqual(profile.sell?.confidence, 'high')
    assert.notEqual(profile.buy?.confidence, 'medium')
    assert.notEqual(profile.sell?.confidence, 'medium')
  })

  it('does not read a steady trend as a time-of-day pattern', () => {
    const points = series(365, HOUR, (_ts, i) => ({ low: 100_000 * (1 + i * 0.001), high: 102_000 * (1 + i * 0.001) }))
    const profile = hourOfDayProfile(points)
    for (const call of [profile.buy, profile.sell]) assert.ok(!call || call.confidence === 'low')
  })

  it('ignores edges smaller than 1 GP', () => {
    // A 1 GP item can't be bought 0.4 GP cheaper.
    const points = series(365, HOUR, ts => ({ low: utcHourOf(ts) === 3 ? 99.6 : 100, high: 101 }))
    const profile = hourOfDayProfile(points)
    assert.ok(!profile.buy || profile.buy.confidence === 'low')
  })

  it('skips thin hours even when they look cheap', () => {
    const points = series(365, HOUR, ts => {
      const hour = utcHourOf(ts)
      return { low: hour === 4 ? 9_000 : hour === 10 ? 9_800 : 10_000, high: 10_500 }
    }).map(p => (utcHourOf(p.timestamp) === 4 ? { ...p, lowPriceVolume: 1, highPriceVolume: 1 } : p))
    assert.equal(hourOfDayProfile(points).buy?.slot, 10)
  })

  it('copes with gaps and empty input', () => {
    assert.equal(hourOfDayProfile([]).buy, null)
    const gappy = series(365, HOUR, () => ({ low: 100, high: 110 })).map((p, i) => (i % 3 ? p : { ...p, avgLowPrice: null }))
    const profile = hourOfDayProfile(gappy)
    assert.equal(profile.slots.length, 24)
    assert.ok(profile.periods >= 10)
  })
})

describe('dayOfWeekProfile', () => {
  it('finds a cheap weekday across weeks of 6h data', () => {
    const noise = rng(3)
    const points = series(365, 6 * HOUR, ts => {
      const bump = utcWeekdayOf(ts) === 2 ? -0.04 : utcWeekdayOf(ts) === 6 ? 0.03 : 0
      const wobble = (noise() - 0.5) * 0.006
      return { low: 1_000_000 * (1 + bump + wobble), high: 1_020_000 * (1 + bump + wobble) }
    })
    const profile = dayOfWeekProfile(points)
    assert.equal(profile.buy?.slot, 2)
    assert.equal(profile.sell?.slot, 6)
    assert.equal(profile.buy?.confidence, 'high')
    assert.equal(profile.slots.length, 7)
  })
})
