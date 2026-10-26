import { describe, expect, it } from 'vitest'
import { pickTimestep, updateImpact } from '../src/analysis/impact.js'
import { hourly } from './fixtures/market.js'

const DAY = 86_400

describe('pickTimestep', () => {
  const now = 1_800_000_000
  it('picks the finest timestep that still covers the before window', () => {
    expect(pickTimestep(now - 3600, now, 0.25)).toBe('5m')
    expect(pickTimestep(now - 5 * DAY, now, 7)).toBe('1h')
    expect(pickTimestep(now - 40 * DAY, now, 7)).toBe('6h')
    expect(pickTimestep(now - 200 * DAY, now, 7)).toBe('24h')
  })

  it('rejects updates older than the available history', () => {
    expect(() => pickTimestep(now - 400 * DAY, now, 7)).toThrow(/older than the price history/)
  })
})

describe('updateImpact', () => {
  it('compares price and volume before vs after the update', () => {
    const event = 1_000_000 * 3600
    const before = hourly(event - 24 * 3600, Array(24).fill(100), 10)
    const after = hourly(event, Array(24).fill(120), 30)
    const impact = updateImpact({ points: [...before, ...after], timestep: '1h', eventSec: event, windowDays: 1, nowSec: event + 2 * DAY })
    expect(impact.before).toMatchObject({ points: 24, avgPrice: 100, avgVolumePerDay: 480 })
    expect(impact.after).toMatchObject({ points: 24, avgPrice: 120, avgVolumePerDay: 1440 })
    expect(impact).toMatchObject({ priceChangePct: 20, volumeChangePct: 200, latestPrice: 120, sinceUpdatePct: 20, afterWindowComplete: true })
  })

  it('marks an after window that has not finished yet', () => {
    const event = 1_000_000 * 3600
    const impact = updateImpact({ points: hourly(event - 3600, [100, 110]), timestep: '1h', eventSec: event, windowDays: 1, nowSec: event + 3600 })
    expect(impact.afterWindowComplete).toBe(false)
    expect(impact.after.points).toBe(1)
  })
})
