/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assessThinSpike, bothSidesChange, hourlyCheck, screenThinSpikes, spikeText, type SideAverages } from '../thinSpikes.ts'

const avg = (high: number | null, low: number | null, highVol: number, lowVol: number): SideAverages =>
  ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })

// 480 trades a day = 20 an hour.
const day = avg(1100, 1000, 240, 240)

describe('bothSidesChange', () => {
  it('takes the smaller move when both sides moved the same way', () => {
    assert.ok(Math.abs(bothSidesChange(day, avg(1210, 1150, 1, 1)) - 0.1) < 1e-9)
    assert.ok(Math.abs(bothSidesChange(day, avg(990, 850, 1, 1)) + 0.1) < 1e-9)
  })
  it('ignores one-sided or opposite moves', () => {
    assert.equal(bothSidesChange(day, avg(3000, null, 1, 0)), 0)
    assert.equal(bothSidesChange(day, avg(1300, 900, 1, 1)), 0)
  })
})

describe('assessThinSpike', () => {
  it('flags a big hour move on thin volume', () => {
    const f = assessThinSpike({ h24: day, h1: avg(1250, 1150, 3, 2) })
    assert.equal(f?.kind, 'pump')
    assert.equal(f?.trigger, 'hour')
    assert.equal(f?.volumeRatio, 0.25)
  })
  it('ignores the same move on normal volume', () => {
    assert.equal(assessThinSpike({ h24: day, h1: avg(1250, 1150, 15, 15) }), null)
  })
  it('flags a dump', () => {
    assert.equal(assessThinSpike({ h24: day, h1: avg(950, 850, 2, 2) })?.kind, 'dump')
  })
  it('leaves a single odd trade on one side to the print rule', () => {
    assert.equal(assessThinSpike({ h24: day, h1: avg(3000, 1000, 1, 1) }), null)
  })
  it('flags a lone 5-minute print far from the hour', () => {
    const f = assessThinSpike({ h24: day, h1: avg(1100, 1000, 20, 20), m5: avg(1400, null, 1, 0) })
    assert.equal(f?.trigger, 'print')
    assert.equal(f?.kind, 'pump')
  })
  it('skips items that barely trade or are cheap', () => {
    assert.equal(assessThinSpike({ h24: avg(1100, 1000, 3, 3), h1: avg(2000, 1900, 0, 1) }), null)
    assert.equal(assessThinSpike({ h24: avg(20, 18, 900, 900), h1: avg(30, 28, 1, 1) }), null)
    assert.equal(assessThinSpike({ h1: avg(2000, 1900, 0, 1) }), null)
  })
  it('screens many items', () => {
    const inputs: Record<number, { h1: SideAverages; h24: SideAverages }> = {
      1: { h24: day, h1: avg(1250, 1150, 3, 2) },
      2: { h24: day, h1: day }
    }
    assert.deepEqual([...screenThinSpikes([1, 2, 3], id => inputs[id] ?? {}).keys()], [1])
    assert.equal(spikeText({ kind: 'pump', trigger: 'hour', change: 0.136, volumeRatio: 0.25 }), 'Price +13.6% in the last hour on 25% of usual volume')
  })
})

describe('hourlyCheck', () => {
  // A week of small, alternating moves, then one jump.
  const week = Array.from({ length: 168 }, (_, i) => avg(1000 + (i % 2) * 10, 990 + (i % 2) * 10, 10, 10))
  it('confirms a jump many sigmas out on thin volume', () => {
    const check = hourlyCheck([...week, avg(1200, 1190, 2, 2)])
    assert.ok(check)
    assert.ok(check.z > 10)
    assert.equal(check.volumeRatio, 0.2)
    assert.equal(check.confirmed, true)
    assert.ok(Math.abs(check.change - 0.19) < 0.01)
  })
  it('does not confirm the same jump on heavy volume', () => {
    assert.equal(hourlyCheck([...week, avg(1200, 1190, 30, 30)])?.confirmed, false)
  })
  it('does not confirm an ordinary hour', () => {
    assert.equal(hourlyCheck([...week, avg(1000, 990, 2, 2)])?.confirmed, false)
  })
  it('needs enough history', () => {
    assert.equal(hourlyCheck(week.slice(0, 10)), null)
  })
})
