// Pump and dump detector: a sharp price move on thin volume is more likely
// a few traders pushing the price than real news, and tends to snap back.
//
// Two levels:
// - assessThinSpike: cheap, from the bulk /1h, /24h and /5m averages. Flags
//   rows, the item sheet, and keeps flagged items out of Buy now.
// - hourlyCheck: from an item's 7-day hourly series. Measures the last hour's
//   move in standard deviations of that item's usual hourly moves.
// "Trades" below are the wiki volumes: items traded, not offers. Pure; no imports.

export interface SideAverages {
  avgHighPrice: number | null
  avgLowPrice: number | null
  highPriceVolume: number
  lowPriceVolume: number
}

export interface SpikeInput {
  h1?: SideAverages
  h24?: SideAverages
  m5?: SideAverages
}

export type SpikeKind = 'pump' | 'dump'

export interface SpikeFlag {
  kind: SpikeKind
  /** hour: last hour vs the day. print: last 5 minutes vs the last hour. */
  trigger: 'hour' | 'print'
  change: number
  /** Trades in the window against a typical window of the same length. */
  volumeRatio: number
}

/** Last hour at least this far from the day's average... */
export const HOUR_MOVE = 0.08
/** ...on less than this share of a typical hour's trades. */
export const THIN_VOLUME = 0.6
/** A 5-minute average at least this far from the last hour's. */
export const PRINT_MOVE = 0.12
/** A "print" is a handful of trades at most. */
export const PRINT_MAX_TRADES = 3
/** Lone prints only mean something on items that usually trade ~10 times an hour. */
export const PRINT_MIN_DAY_TRADES = 240
/** A print is judged against an hour with at least this many trades on its side. */
export const PRINT_MIN_HOUR_TRADES = 3
/** Items trading less than this a day (about two an hour) are too noisy to judge. */
export const MIN_DAY_TRADES = 48
/** Cheap items swing by whole percents on one coin; not worth flagging. */
export const MIN_PRICE = 1_000
/** hourlyCheck: moves of at least this many standard deviations. */
export const Z_THRESHOLD = 3
const MIN_RETURNS = 24
const WEEK_HOURS = 168
const MIN_SIGMA = 1e-4

const trades = (a: SideAverages) => a.highPriceVolume + a.lowPriceVolume

/**
 * The smaller of the high and low moves when both moved the same way, else 0.
 * A real pump lifts what buyers pay and what sellers get; one odd trade on a
 * single side is a print, not an hour-long move.
 */
export function bothSidesChange (from: SideAverages, to: SideAverages): number {
  if (!from.avgHighPrice || !from.avgLowPrice || !to.avgHighPrice || !to.avgLowPrice) return 0
  const high = to.avgHighPrice / from.avgHighPrice - 1
  const low = to.avgLowPrice / from.avgLowPrice - 1
  if (Math.sign(high) !== Math.sign(low)) return 0
  return Math.abs(high) < Math.abs(low) ? high : low
}

/** Change of each side the 5-minute window traded, against the same side of the hour. */
function printChange (h1: SideAverages, m5: SideAverages): number | null {
  const changes: number[] = []
  if (m5.highPriceVolume && h1.highPriceVolume >= PRINT_MIN_HOUR_TRADES && m5.avgHighPrice && h1.avgHighPrice) changes.push(m5.avgHighPrice / h1.avgHighPrice - 1)
  if (m5.lowPriceVolume && h1.lowPriceVolume >= PRINT_MIN_HOUR_TRADES && m5.avgLowPrice && h1.avgLowPrice) changes.push(m5.avgLowPrice / h1.avgLowPrice - 1)
  if (!changes.length) return null
  return changes.reduce((best, c) => (Math.abs(c) > Math.abs(best) ? c : best))
}

function refPrice (a: SideAverages): number {
  return Math.max(a.avgHighPrice ?? 0, a.avgLowPrice ?? 0)
}

function flag (change: number, trigger: SpikeFlag['trigger'], volumeRatio: number): SpikeFlag {
  return { kind: change > 0 ? 'pump' : 'dump', trigger, change, volumeRatio }
}

export function assessThinSpike ({ h1, h24, m5 }: SpikeInput): SpikeFlag | null {
  if (!h1 || !h24) return null
  const dayTrades = trades(h24)
  if (dayTrades < MIN_DAY_TRADES || refPrice(h24) < MIN_PRICE) return null
  const typicalHour = dayTrades / 24

  const hourChange = bothSidesChange(h24, h1)
  const hourRatio = trades(h1) / typicalHour
  if (Math.abs(hourChange) >= HOUR_MOVE && hourRatio < THIN_VOLUME) {
    return flag(hourChange, 'hour', hourRatio)
  }

  if (m5 && dayTrades >= PRINT_MIN_DAY_TRADES && trades(m5) > 0 && trades(m5) <= PRINT_MAX_TRADES) {
    const change = printChange(h1, m5)
    // Far from the day as well, so a choppy hour doesn't count.
    const fromDay = printChange(h24, m5)
    const typicalFive = typicalHour / 12
    if (change !== null && fromDay !== null && Math.abs(change) >= PRINT_MOVE && Math.abs(fromDay) >= PRINT_MOVE && Math.sign(change) === Math.sign(fromDay)) {
      return flag(change, 'print', trades(m5) / Math.max(typicalFive, MIN_SIGMA))
    }
  }
  return null
}

/** Every flagged item, by id. */
export function screenThinSpikes (ids: Iterable<number>, inputFor: (id: number) => SpikeInput): Map<number, SpikeFlag> {
  const flags = new Map<number, SpikeFlag>()
  for (const id of ids) {
    const f = assessThinSpike(inputFor(id))
    if (f) flags.set(id, f)
  }
  return flags
}

export interface HourlyCheck {
  /** Last hour's move in standard deviations of the week's hourly moves. */
  z: number
  change: number
  sigma: number
  /** Last hour's trades against the week's median hour; null without history. */
  volumeRatio: number | null
  confirmed: boolean
}

function mid (p: SideAverages): number | null {
  return p.avgHighPrice && p.avgLowPrice ? (p.avgHighPrice + p.avgLowPrice) / 2 : null
}

function median (values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

/** Log returns between consecutive hours that both traded on each side. */
function hourlyReturns (points: readonly SideAverages[]): { returns: number[]; lastIndex: number } {
  const returns: number[] = []
  let prev: number | null = null
  let lastIndex = -1
  points.forEach((p, i) => {
    const m = mid(p)
    if (m === null) return
    if (prev !== null) returns.push(Math.log(m / prev))
    prev = m
    lastIndex = i
  })
  return { returns, lastIndex }
}

/** The latest hour of a 1h series against the 7 days before it; null without enough history. */
export function hourlyCheck (series: readonly SideAverages[], k = Z_THRESHOLD): HourlyCheck | null {
  const points = series.slice(-(WEEK_HOURS + 1))
  const { returns, lastIndex } = hourlyReturns(points)
  if (returns.length < MIN_RETURNS + 1) return null
  const last = returns[returns.length - 1]
  const history = returns.slice(0, -1)
  const mean = history.reduce((s, r) => s + r, 0) / history.length
  const sigma = Math.max(MIN_SIGMA, Math.sqrt(history.reduce((s, r) => s + (r - mean) ** 2, 0) / history.length))
  const z = (last - mean) / sigma
  const before = points.slice(0, lastIndex).map(trades)
  const typical = before.length ? median(before) : 0
  const volumeRatio = typical > 0 ? trades(points[lastIndex]) / typical : null
  return {
    z,
    change: Math.exp(last) - 1,
    sigma,
    volumeRatio,
    confirmed: Math.abs(z) >= k && (volumeRatio === null || volumeRatio < 1)
  }
}

/** "Price +14% in the last hour on 20% of usual volume". */
export function spikeText (f: SpikeFlag): string {
  const pct = `${f.change >= 0 ? '+' : ''}${(f.change * 100).toFixed(1)}%`
  const window = f.trigger === 'hour' ? 'in the last hour' : 'in the last 5 minutes'
  return `Price ${pct} ${window} on ${Math.round(f.volumeRatio * 100)}% of usual volume`
}
