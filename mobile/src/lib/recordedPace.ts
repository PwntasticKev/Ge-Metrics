import { deriveProcessingSession, type ProcessingSession } from './processingSessions.ts'
import { validateRecorderExtension } from '../components/processingSessions/validation.ts'

type Recipe = ProcessingSession['recipe']
export type PaceExclusionReason = 'invalid_record' | 'recipe_mismatch' | 'not_ended' | 'elapsed_unconfirmed' | 'future_timing' | 'outside_window' | 'unknown_actions' | 'zero_actions' | 'zero_active_time' | 'aggregate_overflow'

// Explicit fields avoid property-order dependence and include catalog changes, not just ID.
export function recordedPaceRecipeKey(r: Recipe): string {
  const items = (rows: Recipe['inputs']) => rows.map(i => [i.itemId, i.name, i.icon, i.qtyPerAction])
  return JSON.stringify([r.id, r.methodKey, r.name, r.source, items(r.inputs), items(r.outputs), r.coinCostPerAction, r.coinRevenuePerAction, r.curatedActionsPerHour])
}

/** Historical actuals only. The caller must explicitly opt in before applying this to planning.
 * Window membership uses processing end time (inclusive); now and lookbackDays have no defaults.
 * No sales settlement, profit estimate, confidence score, ranking, storage, or clock effects.
 */
export function summarizeRecordedPace(sessions: readonly ProcessingSession[], recipe: Recipe, options: { now: number; lookbackDays: number }) {
  const { now, lookbackDays } = options
  const windowMs = lookbackDays * 86_400_000
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isFinite(windowMs) || windowMs <= 0 || windowMs > Number.MAX_SAFE_INTEGER) throw new RangeError('Expected a valid now and positive bounded lookbackDays')
  const windowStartedAt = Math.max(0, now - windowMs)
  const target = recordedPaceRecipeKey(recipe)
  const exclusionCounts: Record<PaceExclusionReason, number> = { invalid_record: 0, recipe_mismatch: 0, not_ended: 0, elapsed_unconfirmed: 0, future_timing: 0, outside_window: 0, unknown_actions: 0, zero_actions: 0, zero_active_time: 0, aggregate_overflow: 0 }
  const exclusions: { sessionIndex: number; reason: PaceExclusionReason }[] = []
  const samples: { sessionId: string; endedAt: number; actions: number; activeMs: number; actionsPerHour: number }[] = []
  let totalActions = 0; let totalActiveMs = 0
  sessions.forEach((s, sessionIndex) => {
    const exclude = (reason: PaceExclusionReason) => { exclusionCounts[reason]++; exclusions.push({ sessionIndex, reason }) }
    try {
      validateRecorderExtension(s)
      const derived = deriveProcessingSession(s)
      if (recordedPaceRecipeKey(s.recipe) !== target) return exclude('recipe_mismatch')
      if (!['processed', 'settled'].includes(s.status) || s.processingEndedAt === null) return exclude('not_ended')
      if (!s.elapsedTimeConfirmed) return exclude('elapsed_unconfirmed')
      const timestamps = [s.processingStartedAt!, s.processingEndedAt, ...s.pauses.flatMap(p => [p.startedAt, p.endedAt!]), ...s.externalGeWaits.flatMap(w => [w.startedAt, w.endedAt]), ...s.sales.map(sale => sale.soldAt)]
      if (timestamps.some(t => t > now)) return exclude('future_timing')
      if (s.processingEndedAt < windowStartedAt) return exclude('outside_window')
      if (s.actionsCompleted === null) return exclude('unknown_actions')
      if (s.actionsCompleted === 0) return exclude('zero_actions')
      if (derived.activeMs === null || derived.activeMs <= 0) return exclude('zero_active_time')
      const actionsPerHour = s.actionsCompleted / derived.activeMs * 3_600_000
      if (!Number.isFinite(actionsPerHour) || !Number.isSafeInteger(totalActions + s.actionsCompleted) || !Number.isSafeInteger(totalActiveMs + derived.activeMs)) return exclude('aggregate_overflow')
      totalActions += s.actionsCompleted; totalActiveMs += derived.activeMs
      samples.push({ sessionId: s.id, endedAt: s.processingEndedAt, actions: s.actionsCompleted, activeMs: derived.activeMs, actionsPerHour })
    } catch { exclude('invalid_record') }
  })
  return {
    sampleCount: samples.length, totalActions, totalActiveMs,
    actionsPerHour: totalActiveMs > 0 ? totalActions / totalActiveMs * 3_600_000 : null,
    windowStartedAt, windowEndedAt: now, samples, exclusions, exclusionCounts, excludedCount: exclusions.length,
  }
}
