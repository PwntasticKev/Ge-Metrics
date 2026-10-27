import { deriveProcessingSession, type ProcessingSession } from './processingSessions.ts'
import { recordedPaceRecipeKey } from './recordedPace.ts'
import { validateRecorderExtension } from '../components/processingSessions/validation.ts'

export type ResultsExclusionReason = 'invalid_record' | 'unfinished' | 'elapsed_unconfirmed' | 'zero_active_time' | 'accounting_unknown' | 'outside_window' | 'future_timing' | 'duplicate' | 'duplicate_conflict'
export interface ProcessingResultsTotals {
  eligibleCount: number
  totalProfitGp: number
  /** Confirmed processing time minus pauses; external GE waits are excluded. */
  totalActiveMs: number
  profitPerActiveHourGp: number | null
}
export interface ProcessingRecipeResults extends ProcessingResultsTotals {
  recipeKey: string
  recipe: ProcessingSession['recipe']
}

// Stable serialization includes retained storage fields/revisions, ignoring object key order.
// Non-JSON and cyclic records fail independently rather than compromising the cohort.
function fingerprint(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${fingerprint((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  throw new RangeError('Invalid saved record')
}
const emptyTotals = (): ProcessingResultsTotals => ({ eligibleCount: 0, totalProfitGp: 0, totalActiveMs: 0, profitPerActiveHourGp: null })
function add(totals: ProcessingResultsTotals, profit: number, activeMs: number) {
  const nextProfit = totals.totalProfitGp + profit
  const nextTime = totals.totalActiveMs + activeMs
  if (!Number.isSafeInteger(nextProfit) || !Number.isSafeInteger(nextTime)) throw new RangeError('Processing results aggregate overflow')
  const rate = nextProfit / nextTime * 3_600_000
  if (!Number.isFinite(rate)) throw new RangeError('Processing results rate overflow')
  totals.eligibleCount++
  totals.totalProfitGp = nextProfit
  totals.totalActiveMs = nextTime
  totals.profitPerActiveHourGp = rate
}

/** Historical manual records only: callers supply durable saved sessions, never pending edits.
 * Explicit inclusive processing-end window; null lookbackDays means all history.
 * Both totals and rates use exactly the same reconciled, positive-active-time cohort.
 * Each excluded input row receives one reason. Identical duplicate IDs contribute once;
 * conflicting IDs exclude every copy (including malformed copies), without first-wins accounting.
 * Invalid records are skipped; invalid options and aggregate overflow throw RangeError.
 * No clock, quotes, tax recalculation, journal merge, forecasting or storage effects.
 */
export function summarizeProcessingResults(sessions: readonly ProcessingSession[], options: { now: number; lookbackDays: number | null }) {
  const { now, lookbackDays } = options
  const windowMs = lookbackDays === null ? null : lookbackDays * 86_400_000
  if (!Number.isSafeInteger(now) || now < 0 || (windowMs !== null && (!Number.isSafeInteger(windowMs) || windowMs <= 0))) throw new RangeError('Expected valid now and positive bounded lookbackDays, or null for all history')
  const windowStartedAt = windowMs === null ? null : Math.max(0, now - windowMs)
  const exclusionCounts: Record<ResultsExclusionReason, number> = { invalid_record: 0, unfinished: 0, elapsed_unconfirmed: 0, zero_active_time: 0, accounting_unknown: 0, outside_window: 0, future_timing: 0, duplicate: 0, duplicate_conflict: 0 }
  const exclusions: { sessionIndex: number; reason: ResultsExclusionReason }[] = []
  const exclude = (sessionIndex: number, reason: ResultsExclusionReason) => { exclusionCounts[reason]++; exclusions.push({ sessionIndex, reason }) }
  const identities = new Map<string, { index: number; fingerprint: string | null }[]>()
  sessions.forEach((s, index) => {
    if (s && typeof s.id === 'string' && s.id.length) {
      let savedFingerprint: string | null = null
      try { savedFingerprint = fingerprint(s) } catch { /* Invalid copy still conflicts with this ID. */ }
      const copies = identities.get(s.id) ?? []
      copies.push({ index, fingerprint: savedFingerprint }); identities.set(s.id, copies)
    }
  })
  const totals = emptyTotals()
  const recipes = new Map<string, ProcessingRecipeResults>()
  sessions.forEach((s, sessionIndex) => {
    const copies = s && identities.get(s.id)
    if (copies && copies.length > 1) {
      if (copies.some(copy => copy.fingerprint === null || copy.fingerprint !== copies[0].fingerprint)) return exclude(sessionIndex, 'duplicate_conflict')
      if (copies[0].index !== sessionIndex) return exclude(sessionIndex, 'duplicate')
    }
    let derived: ReturnType<typeof deriveProcessingSession>
    let recipeKey: string
    try {
      fingerprint(s)
      validateRecorderExtension(s)
      if (Object.hasOwn(s, 'revision')) {
        const revision = (s as ProcessingSession & { revision: unknown }).revision
        if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) throw new RangeError('Invalid saved revision')
      }
      derived = deriveProcessingSession(s)
      if (typeof s.recipe.id !== 'string' || typeof s.recipe.methodKey !== 'string' || typeof s.recipe.name !== 'string' || !(s.recipe.source === null || typeof s.recipe.source === 'string')) throw new RangeError('Invalid recipe identity')
      recipeKey = recordedPaceRecipeKey(s.recipe)
    } catch { return exclude(sessionIndex, 'invalid_record') }
    if (!['processed', 'settled'].includes(s.status) || s.processingEndedAt === null) return exclude(sessionIndex, 'unfinished')
    const timestamps = [s.processingStartedAt!, s.processingEndedAt, ...s.pauses.flatMap(p => [p.startedAt, p.endedAt!]), ...s.externalGeWaits.flatMap(w => [w.startedAt, w.endedAt]), ...s.sales.map(sale => sale.soldAt)]
    if (timestamps.some(time => time > now)) return exclude(sessionIndex, 'future_timing')
    if (windowStartedAt !== null && s.processingEndedAt < windowStartedAt) return exclude(sessionIndex, 'outside_window')
    if (derived.requiresElapsedConfirmation) return exclude(sessionIndex, 'elapsed_unconfirmed')
    if (derived.activeMs === null || derived.activeMs <= 0) return exclude(sessionIndex, 'zero_active_time')
    if (!derived.canSettle || !derived.inventoryResolved || derived.finalProfitGp === null) return exclude(sessionIndex, 'accounting_unknown')
    let recipe: ProcessingSession['recipe']
    // Retain the exact snapshot, but reject uncloneable records before any aggregation,
    // including when another record has already created this recipe group.
    try { recipe = structuredClone(s.recipe) } catch { return exclude(sessionIndex, 'invalid_record') }
    const group = recipes.get(recipeKey) ?? { ...emptyTotals(), recipeKey, recipe }
    add(totals, derived.finalProfitGp, derived.activeMs)
    add(group, derived.finalProfitGp, derived.activeMs)
    recipes.set(recipeKey, group)
  })
  return { ...totals, windowStartedAt, windowEndedAt: now, recipes: [...recipes.values()], exclusions, exclusionCounts, excludedCount: exclusions.length }
}
