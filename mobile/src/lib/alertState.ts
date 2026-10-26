// The saved alerts document: rules, a log of recent triggers and the last
// check. Pure validation and updates; storage lives in state/alerts.ts.
import { COOLDOWNS_MS, DEFAULT_COOLDOWN_MS, type AlertKind, type AlertRule, type AlertTrigger, type MoveDirection, type PriceSide } from './alerts.ts'

export type CheckSource = 'app' | 'background' | 'manual'

export interface LastCheck {
  readonly at: number
  readonly source: CheckSource
  /** Error message when the check failed, else null. */
  readonly error: string | null
  readonly fired: number
}

export interface LoggedTrigger extends AlertTrigger {
  readonly source: CheckSource
}

export interface AlertsState {
  readonly rules: readonly AlertRule[]
  readonly log: readonly LoggedTrigger[]
  readonly lastCheck: LastCheck | null
}

export const MAX_LOG = 50
export const MAX_RULES = 100
export const EMPTY_ALERTS: AlertsState = { rules: [], log: [], lastCheck: null }

const KINDS: readonly AlertKind[] = ['below', 'above', 'margin', 'move']
const SIDES: readonly PriceSide[] = ['buy', 'sell']
const DIRECTIONS: readonly MoveDirection[] = ['down', 'up', 'either']
const SOURCES: readonly CheckSource[] = ['app', 'background', 'manual']

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)

export function toRule (v: unknown): AlertRule | null {
  if (!isObject(v) || typeof v.id !== 'string' || !Number.isInteger(v.itemId) || (v.itemId as number) <= 0) return null
  if (typeof v.name !== 'string' || !oneOf(KINDS, v.kind)) return null
  if (typeof v.threshold !== 'number' || !Number.isFinite(v.threshold) || v.threshold < 0) return null
  return {
    id: v.id,
    itemId: v.itemId as number,
    name: v.name,
    icon: typeof v.icon === 'string' ? v.icon : null,
    kind: v.kind,
    side: oneOf(SIDES, v.side) ? v.side : 'sell',
    direction: oneOf(DIRECTIONS, v.direction) ? v.direction : 'either',
    threshold: v.threshold,
    cooldownMs: COOLDOWNS_MS.includes(v.cooldownMs as never) ? v.cooldownMs as number : DEFAULT_COOLDOWN_MS,
    enabled: v.enabled !== false,
    createdAt: isTime(v.createdAt) ? v.createdAt : 0,
    lastTriggeredAt: isTime(v.lastTriggeredAt) ? v.lastTriggeredAt : null
  }
}

function toLogged (v: unknown): LoggedTrigger | null {
  if (!isObject(v) || typeof v.ruleId !== 'string' || !Number.isInteger(v.itemId) || typeof v.name !== 'string') return null
  if (typeof v.title !== 'string' || typeof v.body !== 'string' || !isTime(v.at)) return null
  return { ruleId: v.ruleId, itemId: v.itemId as number, name: v.name, title: v.title, body: v.body, at: v.at, source: oneOf(SOURCES, v.source) ? v.source : 'app' }
}

function toLastCheck (v: unknown): LastCheck | null {
  if (!isObject(v) || !isTime(v.at) || !oneOf(SOURCES, v.source)) return null
  return { at: v.at, source: v.source, error: typeof v.error === 'string' ? v.error : null, fired: isTime(v.fired) ? v.fired : 0 }
}

const keep = <T>(v: unknown, to: (x: unknown) => T | null): T[] => (Array.isArray(v) ? v.map(to).filter((x): x is T => x !== null) : [])

/** Keeps every valid record; one bad entry doesn't wipe the rest. */
export function parseAlerts (raw: unknown): AlertsState {
  if (!isObject(raw)) return EMPTY_ALERTS
  return {
    rules: keep(raw.rules, toRule).slice(0, MAX_RULES),
    log: keep(raw.log, toLogged).slice(0, MAX_LOG),
    lastCheck: toLastCheck(raw.lastCheck)
  }
}

/** Newest first, capped. */
export function withTriggers (state: AlertsState, triggers: readonly AlertTrigger[], source: CheckSource): AlertsState {
  if (!triggers.length) return state
  const logged = triggers.map(t => ({ ...t, source })).reverse()
  return { ...state, log: [...logged, ...state.log].slice(0, MAX_LOG) }
}

export const withRule = (state: AlertsState, rule: AlertRule): AlertsState =>
  ({ ...state, rules: [...state.rules.filter(r => r.id !== rule.id), rule].slice(-MAX_RULES) })

export const withoutRule = (state: AlertsState, id: string): AlertsState =>
  ({ ...state, rules: state.rules.filter(r => r.id !== id) })

export const withRuleEnabled = (state: AlertsState, id: string, enabled: boolean): AlertsState =>
  ({ ...state, rules: state.rules.map(r => (r.id === id ? { ...r, enabled } : r)) })

export const enabledCount = (state: AlertsState): number => state.rules.filter(r => r.enabled).length

const SUFFIX: Record<string, number> = { '': 1, k: 1e3, m: 1e6, b: 1e9 }

/** "1.2m" -> 1200000, "25k" -> 25000, "1,500" -> 1500. Null when it isn't a whole, positive amount. */
export function parseGp (text: string): number | null {
  const match = /^([0-9]*\.?[0-9]+)\s*([kmb]?)$/i.exec(text.replace(/[,\s]/g, '').replace(/gp$/i, ''))
  if (!match) return null
  const value = Math.round(Number(match[1]) * SUFFIX[match[2].toLowerCase()])
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

/** "5" or "2.5%" -> 5 / 2.5, between 0.1 and 1000. */
export function parsePercent (text: string): number | null {
  const value = Number(text.trim().replace(/%$/, ''))
  return Number.isFinite(value) && value >= 0.1 && value <= 1000 ? Math.round(value * 10) / 10 : null
}

/** "just now", "12m ago", "3h ago", "2d ago". */
export function agoText (at: number, now: number): string {
  const mins = Math.max(0, Math.floor((now - at) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return hours < 48 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}
