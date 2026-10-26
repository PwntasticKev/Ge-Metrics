// Price and margin alerts, evaluated on the phone against OSRS Wiki prices.
// Pure: callers pass in prices, the time and the GE tax function, and get
// back the triggers plus the rules with `lastTriggeredAt` updated.
import { gpFull } from './format.ts'

/** below/above: a price crosses a line. margin: margin after tax at least Z. move: 1h % move at least N. */
export type AlertKind = 'below' | 'above' | 'margin' | 'move'
/** buy = what you pay (wiki "low", instant sell); sell = what you get (wiki "high", instant buy). */
export type PriceSide = 'buy' | 'sell'
export type MoveDirection = 'down' | 'up' | 'either'

export interface AlertRule {
  readonly id: string
  readonly itemId: number
  readonly name: string
  readonly icon: string | null
  readonly kind: AlertKind
  /** Used by below/above. */
  readonly side: PriceSide
  /** Used by move. */
  readonly direction: MoveDirection
  /** GP for below/above/margin, percent (5 = 5%) for move. */
  readonly threshold: number
  readonly cooldownMs: number
  readonly enabled: boolean
  readonly createdAt: number
  readonly lastTriggeredAt: number | null
}

export interface LatestPrice {
  high: number | null
  highTime: number | null
  low: number | null
  lowTime: number | null
}

export interface HourAverage {
  avgHighPrice: number | null
  avgLowPrice: number | null
}

export interface AlertTrigger {
  readonly ruleId: string
  readonly itemId: number
  readonly name: string
  readonly title: string
  readonly body: string
  readonly at: number
}

export type TaxFn = (sellPrice: number, itemId: number) => number

export interface EvaluateInput {
  rules: readonly AlertRule[]
  latest: Readonly<Record<string, LatestPrice | undefined>>
  hour?: Readonly<Record<string, HourAverage | undefined>>
  /** Milliseconds. */
  now: number
  tax: TaxFn
}

export interface EvaluateResult {
  triggers: AlertTrigger[]
  rules: AlertRule[]
}

const MINUTE_MS = 60_000
export const COOLDOWNS_MS = [15 * MINUTE_MS, 60 * MINUTE_MS, 4 * 60 * MINUTE_MS, 24 * 60 * MINUTE_MS] as const
export const DEFAULT_COOLDOWN_MS = 60 * MINUTE_MS
/** Same cut-off as "Hide stale prices": older trades don't fire alerts. */
export const STALE_AFTER_MS = 6 * 60 * MINUTE_MS

const isPrice = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

function freshPrice (price: number | null, timeSec: number | null, now: number): number | null {
  if (!isPrice(price)) return null
  if (typeof timeSec === 'number' && now - timeSec * 1000 > STALE_AFTER_MS) return null
  return price
}

/**
 * Mid price now vs the last hour's average, like for like: both sides when
 * both exist in both, else the one side both have. A one-sided average next
 * to a two-sided price would read the spread as a move.
 */
function comparable (high: number | null, low: number | null, hour: HourAverage): [number, number] | null {
  const { avgHighPrice: hHigh, avgLowPrice: hLow } = hour
  if (isPrice(high) && isPrice(low) && isPrice(hHigh) && isPrice(hLow)) return [(high + low) / 2, (hHigh + hLow) / 2]
  if (isPrice(high) && isPrice(hHigh)) return [high, hHigh]
  if (isPrice(low) && isPrice(hLow)) return [low, hLow]
  return null
}

/** Fractional change vs the last hour's average, e.g. -0.08. */
export function hourMove (latest: LatestPrice | undefined, hour: HourAverage | undefined, now: number): number | null {
  if (!latest || !hour) return null
  const pair = comparable(freshPrice(latest.high, latest.highTime, now), freshPrice(latest.low, latest.lowTime, now), hour)
  return pair ? (pair[0] - pair[1]) / pair[1] : null
}

/** What the rule compares against its threshold right now, or null when prices are missing or stale. */
export function currentValue (rule: AlertRule, input: Omit<EvaluateInput, 'rules'>): number | null {
  const latest = input.latest[String(rule.itemId)]
  if (rule.kind === 'move') return hourMove(latest, input.hour?.[String(rule.itemId)], input.now)
  if (!latest) return null
  const high = freshPrice(latest.high, latest.highTime, input.now)
  const low = freshPrice(latest.low, latest.lowTime, input.now)
  if (rule.kind === 'margin') return high !== null && low !== null ? high - input.tax(high, rule.itemId) - low : null
  return rule.side === 'buy' ? low : high
}

export function isMatch (rule: AlertRule, value: number): boolean {
  switch (rule.kind) {
    case 'below': return value <= rule.threshold
    case 'above': return value >= rule.threshold
    case 'margin': return value >= rule.threshold
    case 'move': {
      const pct = value * 100
      if (rule.direction === 'down') return pct <= -rule.threshold
      if (rule.direction === 'up') return pct >= rule.threshold
      return Math.abs(pct) >= rule.threshold
    }
  }
}

export const isCoolingDown = (rule: AlertRule, now: number): boolean =>
  rule.lastTriggeredAt !== null && now - rule.lastTriggeredAt < rule.cooldownMs

const sideLabel = (side: PriceSide) => (side === 'buy' ? 'Buy price' : 'Sell price')
const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`

/** "Sell price above 1,200,000", "Margin after tax 25,000+", "Drops 5% in 1h". */
export function describeRule (rule: Pick<AlertRule, 'kind' | 'side' | 'direction' | 'threshold'>): string {
  switch (rule.kind) {
    case 'below': return `${sideLabel(rule.side)} at or below ${gpFull(rule.threshold)}`
    case 'above': return `${sideLabel(rule.side)} at or above ${gpFull(rule.threshold)}`
    case 'margin': return `Margin after tax ${gpFull(rule.threshold)}+`
    case 'move': {
      const verb = rule.direction === 'down' ? 'Drops' : rule.direction === 'up' ? 'Rises' : 'Moves'
      return `${verb} ${pct(rule.threshold)}+ vs last hour`
    }
  }
}

function triggerText (rule: AlertRule, value: number): { title: string; body: string } {
  const title = `${rule.name}: ${describeRule(rule).replace(/^./, c => c.toLowerCase())}`
  if (rule.kind === 'move') {
    const move = value * 100
    return { title, body: `${move >= 0 ? 'Up' : 'Down'} ${pct(Math.abs(Math.round(move * 10) / 10))} vs the last hour's average. Tap for the chart.` }
  }
  const what = rule.kind === 'margin' ? 'Margin after tax is' : `${sideLabel(rule.side)} is`
  return { title, body: `${what} ${gpFull(value)} gp now. Tap for the chart.` }
}

/** Fires every enabled rule whose condition holds and isn't cooling down. */
export function evaluateAlerts (input: EvaluateInput): EvaluateResult {
  const triggers: AlertTrigger[] = []
  const rules = input.rules.map(rule => {
    if (!rule.enabled || isCoolingDown(rule, input.now)) return rule
    const value = currentValue(rule, input)
    if (value === null || !isMatch(rule, value)) return rule
    triggers.push({ ruleId: rule.id, itemId: rule.itemId, name: rule.name, ...triggerText(rule, value), at: input.now })
    return { ...rule, lastTriggeredAt: input.now }
  })
  return { triggers, rules }
}

/** Rules that need the /1h averages as well as /latest. */
export const needsHourAverages = (rules: readonly AlertRule[]): boolean =>
  rules.some(r => r.enabled && r.kind === 'move')
