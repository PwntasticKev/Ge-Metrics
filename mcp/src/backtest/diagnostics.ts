// Where do losses come from? Pools the trades of the fill-aware strategies and
// buckets them by what was knowable at decision time (closed windows only):
// liquidity, where the ask sat vs the last hour, and the predicted sell time.

import { HOUR_SEC, type History } from './history.js'
import type { Trade } from './position.js'
import type { SimResult } from './simulate.js'

const DAY_HOURS = 24

export interface Bucket {
  readonly label: string
  readonly picks: number
  readonly dumpedPct: number
  readonly expected: number
  readonly realized: number
}

export interface Feature {
  readonly title: string
  readonly bucketOf: (t: Trade, h: History) => string
}

function dayTrades (t: Trade, h: History): number {
  let total = 0
  for (let i = 1; i <= DAY_HOURS; i++) {
    const a = h.hour(t.placedAt - i * HOUR_SEC).get(t.id)
    if (a) total += a.highPriceVolume + a.lowPriceVolume
  }
  return total
}

function askVsLastHigh (t: Trade, h: History): number | null {
  const high = h.hour(t.placedAt - HOUR_SEC).get(t.id)?.avgHighPrice
  return high ? t.sellAt / high - 1 : null
}

export const FEATURES: readonly Feature[] = [
  {
    title: 'Daily trades at decision time',
    bucketOf: (t, h) => {
      const v = dayTrades(t, h)
      return v < 500 ? 'a. under 500' : v < 2_000 ? 'b. 500-2k' : v < 10_000 ? 'c. 2k-10k' : 'd. 10k+'
    }
  },
  {
    title: 'Ask vs the last closed hour\'s average high',
    bucketOf: (t, h) => {
      const r = askVsLastHigh(t, h)
      return r === null ? 'd. no trades last hour' : r > 0.01 ? 'c. over by 1%+' : r > 0 ? 'b. over by 0-1%' : 'a. at or under'
    }
  },
  {
    title: 'Predicted sell hours',
    bucketOf: t => {
      const s = t.predicted.sellHours
      return s === null ? 'e. not predicted' : s < 0.5 ? 'a. under 0.5h' : s < 2 ? 'b. 0.5-2h' : s < 4 ? 'c. 2-4h' : 'd. 4h+'
    }
  }
]

export function bucketize (trades: readonly Trade[], h: History, f: Feature): Bucket[] {
  const groups = new Map<string, Trade[]>()
  for (const t of trades.filter(x => x.bought > 0)) {
    const k = f.bucketOf(t, h)
    groups.set(k, [...(groups.get(k) ?? []), t])
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, ts]) => ({
    label: label.slice(3),
    picks: ts.length,
    dumpedPct: ts.filter(t => t.outcome === 'dumped').length / ts.length,
    expected: ts.reduce((s, t) => s + (t.ordered > 0 ? (t.predicted.profit * t.bought) / t.ordered : 0), 0),
    realized: ts.reduce((s, t) => s + t.profit, 0)
  }))
}

const m = (n: number) => `${(n / 1e6).toFixed(1)}M`

export function diagnosticsSection (results: readonly SimResult[], h: History, include: (key: string) => boolean, title: string): string {
  const trades = results.filter(r => include(r.key)).flatMap(r => r.trades)
  const tables = FEATURES.map(f => [
    `**${f.title}**`,
    '',
    '| Bucket | Filled picks | Dumped | Expected | Realized |',
    '|---|---:|---:|---:|---:|',
    ...bucketize(trades, h, f).map(b => `| ${b.label} | ${b.picks} | ${Math.round(b.dumpedPct * 100)}% | ${m(b.expected)} | ${m(b.realized)} |`)
  ].join('\n'))
  return [`## Where the losses come from: ${title}`, '', ...tables.flatMap(t => [t, ''])].join('\n').trimEnd()
}
