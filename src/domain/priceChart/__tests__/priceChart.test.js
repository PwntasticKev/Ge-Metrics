import { describe, it, expect } from 'vitest'
import {
  CHART_RANGES,
  rangeConfig,
  rangeCutoff,
  normalizeTimeseries,
  midPrice,
  sliceWindow,
  marginAfterTax,
  readout,
  nearestPoint,
  pointAtOrBefore,
  rangeStats,
  priceChangeAfter,
  stackedVolumeBars,
  MARKER_GROUPS,
  DEFAULT_MARKER_FILTER,
  markerGroupKey,
  toMarkers,
  filterMarkers,
  mentionsLast,
  toggleGroup,
  markerImpact,
  markersNear,
  groupMarkersByTime,
  safeUrl,
  formatPct,
  formatSignedGp,
  formatCompact,
  changeColor
} from '../index.js'

const HOUR = 3600
const DAY = 24 * HOUR
const T0 = 1_760_000_000 - (1_760_000_000 % DAY) // a UTC midnight

const row = (i, high, low, hv = 10, lv = 5, step = DAY) => ({
  timestamp: T0 + i * step,
  avgHighPrice: high,
  avgLowPrice: low,
  highPriceVolume: hv,
  lowPriceVolume: lv
})

describe('ranges', () => {
  it('maps ranges to the requested wiki timesteps', () => {
    expect(CHART_RANGES['1D'].timestep).toBe('5m')
    expect(CHART_RANGES['1W'].timestep).toBe('1h')
    expect(CHART_RANGES['1M'].timestep).toBe('6h')
    expect(CHART_RANGES['3M'].timestep).toBe('24h')
    expect(CHART_RANGES['1Y'].timestep).toBe('24h')
  })
  it('falls back to 1W and computes cutoffs', () => {
    expect(rangeConfig('nope')).toBe(CHART_RANGES['1W'])
    expect(rangeCutoff('1D', 100 * DAY)).toBe(99 * DAY)
    expect(rangeCutoff('All', 100 * DAY)).toBe(0)
  })
})

describe('normalizeTimeseries', () => {
  it('sorts, dedupes, drops priceless rows and zeroes missing volume', () => {
    const points = normalizeTimeseries([
      row(2, 120, 110),
      row(0, 100, 90),
      { timestamp: T0 + DAY, avgHighPrice: null, avgLowPrice: null },
      { timestamp: T0 + 3 * DAY, avgHighPrice: 130, avgLowPrice: null, highPriceVolume: null },
      row(2, 121, 111),
      null,
      { timestamp: 'x', avgHighPrice: 1 }
    ])
    expect(points.map(p => p.timestamp)).toEqual([T0, T0 + 2 * DAY, T0 + 3 * DAY])
    expect(points[1]).toEqual({ timestamp: T0 + 2 * DAY, sell: 121, buy: 111, sellVolume: 10, buyVolume: 5 })
    expect(points[2]).toMatchObject({ sell: 130, buy: null, sellVolume: 0 })
  })
  it('returns [] for non-arrays', () => {
    expect(normalizeTimeseries(undefined)).toEqual([])
  })
  it('does not mutate input', () => {
    const input = [row(1, 2, 1), row(0, 2, 1)]
    const copy = JSON.parse(JSON.stringify(input))
    normalizeTimeseries(input)
    expect(input).toEqual(copy)
  })
})

describe('series helpers', () => {
  const points = normalizeTimeseries([row(0, 100, 90), row(1, 200, 180), row(2, 150, null), row(3, null, 50)])

  it('midPrice falls back to one side', () => {
    expect(midPrice(points[0])).toBe(95)
    expect(midPrice(points[2])).toBe(150)
    expect(midPrice(points[3])).toBe(50)
    expect(midPrice(null)).toBeNull()
  })

  it('sliceWindow is inclusive with open bounds', () => {
    expect(sliceWindow(points, T0 + DAY, T0 + 2 * DAY)).toHaveLength(2)
    expect(sliceWindow(points, null, T0)).toHaveLength(1)
    expect(sliceWindow(points)).toHaveLength(4)
  })

  it('nearestPoint and pointAtOrBefore', () => {
    expect(nearestPoint(points, T0 + DAY + 100).timestamp).toBe(T0 + DAY)
    expect(nearestPoint(points, T0 - 99999).timestamp).toBe(T0)
    expect(nearestPoint(points, T0 + 99 * DAY).timestamp).toBe(T0 + 3 * DAY)
    expect(nearestPoint([], T0)).toBeNull()
    expect(pointAtOrBefore(points, T0 + DAY + 5).timestamp).toBe(T0 + DAY)
    expect(pointAtOrBefore(points, T0 - 1)).toBeNull()
  })
})

describe('marginAfterTax / readout', () => {
  it('subtracts 2% GE tax from the sell side', () => {
    // 1,000,000 sell -> 20,000 tax
    expect(marginAfterTax(950_000, 1_000_000, 20997)).toBe(30_000)
  })
  it('caps tax at 5M', () => {
    expect(marginAfterTax(1_400_000_000, 1_420_000_000, 20997)).toBe(15_000_000)
  })
  it('no tax under 50 gp', () => {
    expect(marginAfterTax(40, 45, 561)).toBe(5)
  })
  it('null when a side is missing', () => {
    expect(marginAfterTax(null, 100, 1)).toBeNull()
  })
  it('readout carries time, prices, margin and per-side volume', () => {
    const [p] = normalizeTimeseries([row(0, 1_000_000, 950_000, 7, 3)])
    expect(readout(p, 20997)).toEqual({
      timestamp: T0, buy: 950_000, sell: 1_000_000, margin: 30_000, tax: 20_000, buyVolume: 3, sellVolume: 7
    })
    expect(readout(null, 1)).toBeNull()
  })
})

describe('rangeStats', () => {
  it('computes % change, max sell and min buy', () => {
    const points = normalizeTimeseries([row(0, 110, 90), row(1, 300, 200), row(2, 120, 80), row(3, 220, 180)])
    const stats = rangeStats(points)
    expect(stats.first).toBe(100)
    expect(stats.last).toBe(200)
    expect(stats.changePct).toBe(100)
    expect(stats.change).toBe(100)
    expect(stats.max).toEqual({ timestamp: T0 + DAY, price: 300 })
    expect(stats.min).toEqual({ timestamp: T0 + 2 * DAY, price: 80 })
    expect(stats.sellVolume).toBe(40)
    expect(stats.buyVolume).toBe(20)
  })
  it('null for empty input', () => {
    expect(rangeStats([])).toBeNull()
  })
})

describe('priceChangeAfter', () => {
  // Hourly series over 10 days, price = 100 + hour index.
  const hourly = normalizeTimeseries(
    Array.from({ length: 240 }, (_, i) => row(i, 100 + i, 100 + i, 1, 1, HOUR))
  )

  it('uses the pre-post price as base and the price one horizon later', () => {
    const change = priceChangeAfter(hourly, T0 + DAY + 30 * 60, DAY)
    expect(change.from).toBe(124) // point at T0+24h
    expect(change.to).toBe(148) // point at T0+48h
    expect(change.change).toBe(24)
    expect(change.changePct).toBeCloseTo(19.35, 1)
  })

  it('excludes the bucket stamped exactly at the post time from the base', () => {
    const change = priceChangeAfter(hourly, T0 + DAY, DAY)
    expect(change.from).toBe(123) // bucket starting T0+23h
    expect(change.to).toBe(148)
  })

  it('null when the horizon is past the end of the series', () => {
    expect(priceChangeAfter(hourly, T0 + 5 * DAY, 7 * DAY)).toBeNull()
  })

  it('uses the first point after start when the series begins later', () => {
    const change = priceChangeAfter(hourly, T0 - HOUR, DAY)
    expect(change.from).toBe(100)
  })

  it('null when the series starts more than a horizon after the post', () => {
    expect(priceChangeAfter(hourly, T0 - 3 * DAY, DAY)).toBeNull()
  })

  it('guards bad input', () => {
    expect(priceChangeAfter([], T0, DAY)).toBeNull()
    expect(priceChangeAfter(hourly, NaN, DAY)).toBeNull()
    expect(priceChangeAfter(hourly, T0, 0)).toBeNull()
  })
})

describe('markers', () => {
  const events = {
    blogs: [{ date: '2026-10-01', title: 'Dev Blog: Sailing', category: 'devblog', url: 'https://news/1', items: [20997] }],
    updates: [
      { date: '2026-10-02', title: 'Patch notes', category: 'game', url: 'https://news/2', wikiUrl: 'https://wiki/2', items: [] },
      { date: '2026-10-02', title: 'Patch notes', category: 'game', items: [] },
      { date: '2026-10-03', title: 'Community Spotlight', category: 'community', items: [] },
      { date: '2026-10-04', title: 'Poll', category: 'yourfeedback', items: [] },
      { date: '2026-10-05', title: 'Store', category: 'website', items: [] },
      { date: '2026-10-06', title: 'Coming soon', category: 'future', items: [20997] },
      { date: 'garbage', title: 'Broken' }
    ]
  }

  it('groups wiki categories into chips', () => {
    expect(markerGroupKey('devblog')).toBe('devblog')
    expect(markerGroupKey('bts')).toBe('devblog')
    expect(markerGroupKey('events')).toBe('community')
    expect(markerGroupKey('technical')).toBe('website')
    expect(markerGroupKey('Something new')).toBe('website')
    expect(markerGroupKey(undefined, 'blog')).toBe('devblog')
    expect(markerGroupKey(undefined, 'update')).toBe('game')
  })

  it('defaults: game, devblog and future on; community and website off', () => {
    expect(DEFAULT_MARKER_FILTER).toEqual(['game', 'devblog', 'future'])
    expect(MARKER_GROUPS.map(g => g.key)).toEqual(['game', 'devblog', 'future', 'community', 'website'])
  })

  it('toMarkers normalises, dedupes, sorts and flags item mentions', () => {
    const markers = toMarkers(events, 20997)
    expect(markers.map(m => m.title)).toEqual([
      'Dev Blog: Sailing', 'Patch notes', 'Community Spotlight', 'Poll', 'Store', 'Coming soon'
    ])
    expect(markers[0]).toMatchObject({ group: 'devblog', mentionsItem: true, url: 'https://news/1', time: Date.parse('2026-10-01T00:00:00Z') / 1000 })
    expect(markers[1]).toMatchObject({ group: 'game', url: 'https://news/2', mentionsItem: false })
    expect(markers[3].group).toBe('community')
    expect(toMarkers(undefined, 1)).toEqual([])
  })

  it('filterMarkers applies chips and window', () => {
    const markers = toMarkers(events, 20997)
    const shown = filterMarkers(markers, DEFAULT_MARKER_FILTER)
    expect(shown.map(m => m.group)).toEqual(['devblog', 'game', 'future'])
    const windowed = filterMarkers(markers, DEFAULT_MARKER_FILTER, markers[1].time, markers[4].time)
    expect(windowed.map(m => m.title)).toEqual(['Patch notes'])
  })

  it('mentionsLast puts item mentions on top', () => {
    const ordered = mentionsLast(toMarkers(events, 20997))
    expect(ordered.slice(-2).every(m => m.mentionsItem)).toBe(true)
  })

  it('toggleGroup adds/removes without mutating, keeping chip order', () => {
    const start = ['game', 'future']
    expect(toggleGroup(start, 'devblog')).toEqual(['game', 'devblog', 'future'])
    expect(toggleGroup(start, 'game')).toEqual(['future'])
    expect(start).toEqual(['game', 'future'])
  })

  it('markerImpact computes 24h and 7d moves from the series', () => {
    const daily = normalizeTimeseries(Array.from({ length: 20 }, (_, i) => row(i, 110 + i * 10, 90 + i * 10)))
    const marker = { time: T0 + 2 * DAY }
    const impact = markerImpact(marker, daily)
    // Base is the bucket before the post day (i=1), not the post-day bucket
    expect(impact.day).toMatchObject({ from: 110, to: 130 })
    expect(impact.week).toMatchObject({ from: 110, to: 190 })
    expect(markerImpact({ time: T0 + 15 * DAY }, daily).week).toBeNull()
    expect(markerImpact(null, daily)).toEqual({ day: null, week: null })
  })

  it('drops non-http(s) links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('https://secure.runescape.com/m=news/x')).toBe('https://secure.runescape.com/m=news/x')
    const [marker] = toMarkers({ updates: [{ date: '2026-10-01', title: 'x', url: 'javascript:alert(1)', wikiUrl: 'https://wiki/x' }] }, 1)
    expect(marker.url).toBe('https://wiki/x')
  })

  it('markersNear', () => {
    const markers = [{ time: 100 }, { time: 200 }, { time: 1000 }]
    expect(markersNear(markers, 150, 60)).toHaveLength(2)
  })
})

describe('format', () => {
  it('formats signed values', () => {
    expect(formatPct(3.456)).toBe('+3.46%')
    expect(formatPct(-12.34)).toBe('-12.3%')
    expect(formatPct(null)).toBe('—')
    expect(formatSignedGp(1500)).toBe('+1,500')
    expect(formatSignedGp(-2)).toBe('-2')
    expect(formatCompact(1_420_000_000)).toBe('1.42B')
    expect(changeColor(1)).toBe('#10b981')
    expect(changeColor(-1)).toBe('#ef4444')
  })
})

describe('stackedVolumeBars', () => {
  const points = normalizeTimeseries([row(0, 10, 9, 7, 3)])
  it('stacks sell on top of buy', () => {
    expect(stackedVolumeBars(points)).toEqual({
      buyBars: [{ time: T0, value: 3 }],
      sellBars: [{ time: T0, value: 10 }]
    })
  })
  it('respects hidden sides', () => {
    expect(stackedVolumeBars(points, { showBuy: false })).toEqual({ buyBars: [], sellBars: [{ time: T0, value: 7 }] })
    expect(stackedVolumeBars(points, { showSell: false }).sellBars).toEqual([])
  })
})

describe('groupMarkersByTime', () => {
  const times = [0, 100, 200, 300]
  const m = (time, mentionsItem = false, title = `m${time}`) => ({ time, mentionsItem, title })

  it('snaps to the nearest bar and groups, mentions first', () => {
    const groups = groupMarkersByTime([m(10), m(90, true), m(160), m(400)], times)
    expect(groups.map(g => g.time)).toEqual([0, 100, 200])
    expect(groups[1].markers[0].mentionsItem).toBe(true)
  })

  it('caps groups but keeps item mentions', () => {
    const groups = groupMarkersByTime([m(0, true), m(100), m(200), m(300)], times, 2)
    expect(groups.map(g => g.time)).toEqual([0, 300])
  })

  it('empty without times', () => {
    expect(groupMarkersByTime([m(1)], [])).toEqual([])
  })
})
