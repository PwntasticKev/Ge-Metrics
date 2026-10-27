import type { MarketItem } from '@ge/engine'
import { computeProcessFlip } from '../../../src/domain/flipping/processFlip.js'
import { geTax, GE_TAX_EXEMPT_IDS } from '../../../src/domain/flipping/geTax.js'
import { sizeProcessingBatch } from './processingLab.ts'
import { recordedPaceRecipeKey } from './recordedPace.ts'
import type { ProcessingSession } from './processingSessions.ts'

type Recipe = ProcessingSession['recipe']
export interface PlanQuote {
  itemId: number
  /** Ordered leg binding, not a second recipe snapshot. */
  qtyPerAction: number
  mode: 'instant' | 'patient'
  source: 'latest-high' | 'latest-low' | '24h-avg-low' | '24h-avg-high'
  unitPriceGp: number
  quoteTradeAtMs: number | null
  sourceDataUpdatedAtMs: number | null
  averagePeriod: null | { windowSeconds: 86400; startAtMs: number | null; endAtMs: number | null }
  averageSideVolume: number | null
}
export interface PlanSizing {
  cashBudgetGp: number; activeMinutes: number; actions: number | null
  rate: null | { source: 'curated' | 'recorded-explicit'; actionsPerHour: number; recordedEvidence: null | {
    recipeKey: string; computedAtMs: number; lookbackDays: 30; sampleCount: number; totalActions: number; totalActiveMs: number
  } }
  /** Mapping capacity only, never remaining personal capacity. Minutes exclude GE waits. */
  mappingLimitActions: number | null; hasUnknownInputLimit: boolean
}
export interface PlanAmounts { cost: number; revenue: number; tax: number; profit: number }
export interface DisplayedPlanInput {
  recipe: Recipe
  /** All input legs followed by all output legs, in recipe order; no aggregation. */
  quotes: PlanQuote[]
  sizing: PlanSizing
  /** Exact selected computeProcessFlip values, reconciled before capture. */
  amounts: PlanAmounts
}
export interface InitialPlanV1 {
  /** Immutable execution binding captured from the selected recipe; excludes display metadata. */
  recipeExecutionKey: string
  version: 1; capturedAtMs: number; quotes: PlanQuote[]; sizing: PlanSizing; amounts: PlanAmounts
  outputTaxes: { taxPerUnitGp: number; exempt: boolean }[]
  /** App implementation assumption, not an external historical rule certification. */
  taxAssumption: 'app-geTax-floor-2pct-min50-cap5m-saved-output-decisions-v1'
}
export type PlanRead = { status: 'missing' } | { status: 'unsupported'; version: unknown } | { status: 'invalid'; reason: string } | { status: 'valid'; plan: InitialPlanV1 }
const taxAssumption = 'app-geTax-floor-2pct-min50-cap5m-saved-output-decisions-v1' as const
function check(ok: unknown, message = 'Invalid initial plan'): asserts ok { if (!ok) throw new RangeError(message) }
const whole = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
const money = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER
const signed = (n: number) => Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER
const timestamp = (n: unknown, bound: number) => n === null || whole(n) && n <= bound

/** Strict bounded JSON inspection before serialization, without invoking getters/toJSON. */
export function assertPlanJson(value: unknown, bounded = true): void {
  let nodes = 0
  const active = new Set<object>()
  function visit(v: unknown, depth: number) {
    check(++nodes <= (bounded ? 8192 : 1_000_000) && depth <= (bounded ? 12 : 100), 'Plan exceeds structural bounds')
    if (v === null || typeof v === 'boolean') return
    if (typeof v === 'string') { check(!bounded || v.length <= 8192, 'Plan string too long'); return }
    if (typeof v === 'number') { check(Number.isFinite(v), 'Nonfinite plan number'); return }
    check(typeof v === 'object', 'Plan must be plain JSON')
    const object = v as object
    check(!active.has(object), 'Cyclic plan')
    check(Array.isArray(v) ? Object.getPrototypeOf(v) === Array.prototype : Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'Plan must be plain JSON')
    active.add(object)
    const keys = Reflect.ownKeys(object)
    check(!bounded || keys.length <= 1024, 'Plan has too many properties')
    for (const key of keys) {
      if (Array.isArray(v) && key === 'length') continue
      if (Array.isArray(v)) check(typeof key === 'string' && /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < v.length, 'Extended plan array')
      check(typeof key === 'string' && (!bounded || key.length <= 512), 'Invalid plan key')
      const descriptor = Object.getOwnPropertyDescriptor(object, key)!
      check('value' in descriptor && descriptor.enumerable, 'Plan accessors are forbidden')
      visit(descriptor.value, depth + 1)
    }
    if (Array.isArray(v)) check(Object.keys(v).length === v.length, 'Sparse or extended plan array')
    active.delete(object)
  }
  visit(value, 0)
  // encodeURIComponent counts UTF-8 bytes without a platform-specific dependency.
  check(!bounded || encodeURIComponent(JSON.stringify(value)).replace(/%[0-9A-F]{2}|./g, 'x').length <= 65536, 'Plan exceeds 64 KiB')
}

/** Execution identity deliberately excludes display metadata and unknown extensions. */
export function processingRecipeExecutionKey(r: Recipe): string {
  return JSON.stringify([r.id, r.methodKey, r.inputs.map(i => [i.itemId, i.qtyPerAction]), r.outputs.map(i => [i.itemId, i.qtyPerAction]), r.coinCostPerAction, r.coinRevenuePerAction, r.curatedActionsPerHour])
}
function validate(plan: InitialPlanV1, recipe: Recipe, nowMs: number, currentTax: boolean) {
  check(whole(nowMs) && whole(plan.capturedAtMs) && plan.capturedAtMs <= nowMs, 'Invalid capture time')
  check(plan.version === 1 && plan.taxAssumption === taxAssumption)
  check(plan.recipeExecutionKey === processingRecipeExecutionKey(recipe), 'Recipe execution identity mismatch')
  const rows = [...recipe.inputs, ...recipe.outputs]
  check(rows.length <= 64 && plan.quotes.length === rows.length && recipe.inputs.length > 0, 'Incomplete ordered quotes')
  for (const id of [recipe.id, recipe.methodKey]) check(typeof id === 'string' && id.length > 0 && id.length <= 256)
  check(whole(recipe.coinCostPerAction) && whole(recipe.coinRevenuePerAction))
  check(recipe.curatedActionsPerHour === null || money(recipe.curatedActionsPerHour) && recipe.curatedActionsPerHour > 0)
  const items = new Map<number, MarketItem>()
  rows.forEach((row, index) => {
    const q = plan.quotes[index]; const input = index < recipe.inputs.length
    check(whole(row.itemId) && row.itemId > 0 && whole(row.qtyPerAction) && row.qtyPerAction > 0)
    check(q.itemId === row.itemId && q.qtyPerAction === row.qtyPerAction && money(q.unitPriceGp) && q.unitPriceGp > 0, 'Missing or mismatched quote')
    check(timestamp(q.quoteTradeAtMs, plan.capturedAtMs) && timestamp(q.sourceDataUpdatedAtMs, plan.capturedAtMs), 'Invalid quote timestamp')
    check(q.quoteTradeAtMs === null || q.sourceDataUpdatedAtMs === null || q.quoteTradeAtMs <= q.sourceDataUpdatedAtMs, 'Trade postdates cache update')
    if (q.mode === 'instant') {
      check(q.source === (input ? 'latest-high' : 'latest-low') && q.averagePeriod === null && q.averageSideVolume === null, 'Invalid instant provenance')
    } else {
      check(q.mode === 'patient' && q.source === (input ? '24h-avg-low' : '24h-avg-high') && q.quoteTradeAtMs === null, 'Invalid average provenance')
      check(q.averagePeriod?.windowSeconds === 86400 && q.averagePeriod.startAtMs === null && q.averagePeriod.endAtMs === null, 'Unsupported average bounds')
      check(whole(q.averageSideVolume) && q.averageSideVolume > 0)
    }
    const item = items.get(row.itemId) ?? { id: row.itemId, name: row.name, icon: row.icon, members: false, limit: null, highalch: null, high: null, low: null, highTime: null, lowTime: null, dailyVolume: null }
    const side = input ? 'low' : 'high'
    check(item[side] === null || item[side] === q.unitPriceGp, 'Conflicting repeated item quotes')
    items.set(row.itemId, { ...item, [side]: q.unitPriceGp })
    check(money(row.qtyPerAction * q.unitPriceGp), 'Unsafe quote product')
  })
  const s = plan.sizing
  check(money(s.cashBudgetGp) && money(s.activeMinutes) && (s.actions === null || whole(s.actions)) && (s.mappingLimitActions === null || whole(s.mappingLimitActions)) && typeof s.hasUnknownInputLimit === 'boolean')
  if (s.rate === null) check(s.actions === null, 'Unsized rate requires null actions')
  else {
    check(money(s.rate.actionsPerHour) && s.rate.actionsPerHour > 0 && recipe.curatedActionsPerHour !== null)
    if (s.rate.source === 'curated') check(s.rate.actionsPerHour === recipe.curatedActionsPerHour && s.rate.recordedEvidence === null)
    else {
      const e = s.rate.recordedEvidence
      check(s.rate.source === 'recorded-explicit' && e !== null && e.recipeKey === recordedPaceRecipeKey(recipe) && e.lookbackDays === 30)
      check(whole(e.computedAtMs) && e.computedAtMs <= plan.capturedAtMs && whole(e.sampleCount) && e.sampleCount > 0 && whole(e.totalActions) && e.totalActions > 0 && whole(e.totalActiveMs) && e.totalActiveMs > 0)
      check(s.rate.actionsPerHour === e.totalActions / e.totalActiveMs * 3_600_000, 'Recorded rate evidence mismatch')
    }
  }
  const flip = computeProcessFlip({ id: recipe.id, method: recipe.methodKey, name: recipe.name, inputs: recipe.inputs.map(r => ({ id: r.itemId, qty: r.qtyPerAction })), outputs: recipe.outputs.map(r => ({ id: r.itemId, qty: r.qtyPerAction })), coinCost: recipe.coinCostPerAction, coinRevenue: recipe.coinRevenuePerAction }, { nowSec: plan.capturedAtMs / 1000, get: (id: number) => items.get(id) ?? null, all: () => [...items.values()] })
  check(flip, 'Unavailable canonical quote')
  check(plan.outputTaxes.length === recipe.outputs.length)
  let savedTax = 0
  recipe.outputs.forEach((row, index) => {
    const t = plan.outputTaxes[index]; const q = plan.quotes[recipe.inputs.length + index]
    check(whole(t.taxPerUnitGp) && typeof t.exempt === 'boolean' && t.taxPerUnitGp <= q.unitPriceGp && (!t.exempt || t.taxPerUnitGp === 0))
    if (currentTax) check(t.taxPerUnitGp === geTax(q.unitPriceGp, row.itemId) && t.exempt === GE_TAX_EXEMPT_IDS.has(row.itemId), 'Tax assumption mismatch')
    savedTax += t.taxPerUnitGp * row.qtyPerAction; check(money(savedTax))
  })
  const a = plan.amounts
  check(money(a.cost) && money(a.revenue) && money(a.tax) && signed(a.profit))
  // Read uses saved tax decisions, so later exemption-list changes cannot rewrite history.
  check(a.cost === flip.cost && a.revenue === flip.revenue && a.tax === savedTax && a.profit === a.revenue - a.cost - a.tax, 'Displayed amounts mismatch')
  if (s.rate !== null) {
    check(money(s.rate.actionsPerHour * s.activeMinutes), 'Unsafe active-time product')
    const batch = sizeProcessingBatch({ cost: a.cost, profit: a.profit, tax: a.tax, actionsPerHour: s.rate.actionsPerHour, cash: s.cashBudgetGp, minutes: s.activeMinutes, limitActions: s.mappingLimitActions })
    check(s.actions === batch.actions, 'Displayed batch mismatch')
  }
  if (s.actions !== null) {
    for (const row of rows) check(whole(row.qtyPerAction * s.actions), 'Unsafe batch quantity')
    for (const n of [a.cost, a.revenue, a.tax, a.profit]) check(signed(n * s.actions), 'Unsafe batch amount')
  }
}
export function captureInitialPlan(input: DisplayedPlanInput, nowMs: number): { ok: true; plan: InitialPlanV1 } | { ok: false; reason: string } {
  try {
    assertPlanJson(input)
    const plan: InitialPlanV1 = { version: 1, recipeExecutionKey: processingRecipeExecutionKey(input.recipe), capturedAtMs: nowMs, quotes: input.quotes, sizing: input.sizing, amounts: input.amounts, outputTaxes: input.recipe.outputs.map((r, i) => ({ taxPerUnitGp: geTax(input.quotes[input.recipe.inputs.length + i]?.unitPriceGp, r.itemId), exempt: GE_TAX_EXEMPT_IDS.has(r.itemId) })), taxAssumption }
    assertPlanJson(plan); validate(plan, input.recipe, nowMs, true)
    return { ok: true, plan: JSON.parse(JSON.stringify(plan)) }
  } catch (error) { return { ok: false, reason: error instanceof Error ? error.message : 'Invalid plan' } }
}
export function readInitialPlan(raw: unknown, recipe: Recipe, nowMs: number): PlanRead {
  if (raw === undefined) return { status: 'missing' }
  try {
    assertPlanJson(raw)
    check(raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    const version = (raw as { version?: unknown }).version
    if (whole(version) && version !== 1) return { status: 'unsupported', version }
    const plan = raw as InitialPlanV1
    validate(plan, recipe, nowMs, false)
    return { status: 'valid', plan: JSON.parse(JSON.stringify(plan)) }
  } catch (error) { return { status: 'invalid', reason: error instanceof Error ? error.message : 'Invalid plan' } }
}

/** Creation-only check. Existing opaque metadata is never required to pass this. */
export function validateNewInitialPlan(raw: unknown, recipe: Recipe, nowMs: number): void {
  assertPlanJson(raw)
  const plan = raw as InitialPlanV1
  validate(plan, recipe, nowMs, true)
}
