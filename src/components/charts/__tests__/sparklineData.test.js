import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSparklineCache, loadSparkline, toSparklineValues, SPARKLINE_POINTS } from '../sparklineData.js'
import { toSparkPoints } from '../MiniChart.jsx'

const series = n => Array.from({ length: n }, (_, i) => ({ timestamp: 1000 + i, avgHighPrice: 100 + i, avgLowPrice: 90 + i }))

describe('toSparklineValues', () => {
  it('keeps the latest points in time order, preferring the high price', () => {
    const values = toSparklineValues([...series(30)].reverse())
    expect(values).toHaveLength(SPARKLINE_POINTS)
    expect(values[0]).toBe(110)
    expect(values.at(-1)).toBe(129)
  })

  it('falls back to the low price and skips empty points', () => {
    expect(toSparklineValues([
      { timestamp: 1, avgHighPrice: null, avgLowPrice: 5 },
      { timestamp: 2, avgHighPrice: null, avgLowPrice: null },
      { timestamp: 3, avgHighPrice: 7 },
      null
    ])).toEqual([5, 7])
  })
})

describe('loadSparkline', () => {
  beforeEach(() => clearSparklineCache())

  it('fetches once per item and shares the result', async () => {
    const fetchHistory = vi.fn(async () => ({ success: true, data: { data: series(3) } }))
    const [a, b] = await Promise.all([loadSparkline(4151, { fetchHistory }), loadSparkline(4151, { fetchHistory })])
    expect(a).toEqual([100, 101, 102])
    expect(b).toBe(a)
    expect(fetchHistory).toHaveBeenCalledTimes(1)
    expect(fetchHistory).toHaveBeenCalledWith('1h', 4151)
  })

  it('refetches after the cache expires', async () => {
    let t = 0
    const fetchHistory = vi.fn(async () => ({ success: true, data: { data: series(2) } }))
    await loadSparkline(1, { fetchHistory, now: () => t })
    t = 11 * 60 * 1000
    await loadSparkline(1, { fetchHistory, now: () => t })
    expect(fetchHistory).toHaveBeenCalledTimes(2)
  })

  it('does not cache failures', async () => {
    const fetchHistory = vi.fn()
      .mockResolvedValueOnce({ success: false, error: 'boom' })
      .mockResolvedValueOnce({ success: true, data: { data: series(2) } })
    await expect(loadSparkline(2, { fetchHistory })).rejects.toThrow()
    expect(await loadSparkline(2, { fetchHistory })).toEqual([100, 101])
  })
})

describe('toSparkPoints', () => {
  it('scales values into the box with the highest value at the top', () => {
    const points = toSparkPoints([10, 20, 15], 100, 40)
    expect(points).toHaveLength(3)
    expect(points[0].x).toBe(2)
    expect(points[2].x).toBe(98)
    expect(points[1].y).toBe(2)
    expect(points[0].y).toBe(38)
  })

  it('draws a flat line for constant prices and nothing for a single point', () => {
    expect(new Set(toSparkPoints([5, 5, 5], 100, 40).map(p => p.y)).size).toBe(1)
    expect(toSparkPoints([5], 100, 40)).toEqual([])
  })
})
