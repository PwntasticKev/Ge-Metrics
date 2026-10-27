import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeProcessingResults } from '../processingResults.ts'
import type { ProcessingSession } from '../processingSessions.ts'
const day = 86_400_000
const now = 40 * day
function session(id = 's', changes: Partial<ProcessingSession> = {}): ProcessingSession {
  return { id, status: 'processed', recipe: { id: 'r', methodKey: 'm', name: 'Manual recipe', source: null, inputs: [], outputs: [], coinCostPerAction: 999, coinRevenuePerAction: 999, curatedActionsPerHour: null }, processingStartedAt: now - 3_600_000, processingEndedAt: now, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: null, inputs: [], outputs: [], sales: [], processingFeesGp: 0, otherExpensesGp: 0, directCoinReceiptsGp: 0, ...changes }
}
const summary = (rows: ProcessingSession[], lookbackDays: number | null = 7) => summarizeProcessingResults(rows, { now, lookbackDays })
test('known negative and zero results qualify; unknown accounting does not', () => {
  const result = summary([session('loss', { processingFeesGp: 100 }), session('zero'), session('unknown', { processingFeesGp: null })])
  assert.equal(result.eligibleCount, 2)
  assert.equal(result.totalProfitGp, -100)
  assert.equal(result.exclusionCounts.accounting_unknown, 1)
})
test('weights profit by active time, removes pauses and excludes external wait from denominator', () => {
  const rows = [session('short', { directCoinReceiptsGp: 100, pauses: [{ id: 'p', startedAt: now - 3_600_000, endedAt: now - 1_800_000, reason: 'break_other' }] }), session('long', { directCoinReceiptsGp: 900, processingStartedAt: now - 10_800_000, externalGeWaits: [{ id: 'w', side: 'buy', startedAt: now - 20_000_000, endedAt: now - 11_000_000 }] })]
  const before = structuredClone(rows)
  const result = summary(rows)
  assert.equal(result.totalActiveMs, 12_600_000)
  assert.equal(result.profitPerActiveHourGp, 1000 / 3.5)
  assert.equal(result.recipes[0].profitPerActiveHourGp, result.profitPerActiveHourGp)
  assert.deepEqual(rows, before)
})
test('rejects unfinished, unconfirmed, zero time, partial inventory and unresolved costs', () => {
  const item = { itemId: 1, name: 'Item', icon: null }
  const result = summary([session('open', { status: 'processing', processingEndedAt: null }), session('unconfirmed', { elapsedTimeConfirmed: false }), session('zero', { processingStartedAt: now }), session('unsold', { outputs: [{ id: 'o', item, producedQty: 1 }] }), session('unused', { inputs: [{ id: 'i', item, acquiredQty: 2, consumedQty: 1, origin: 'purchased', acquisitionCostGp: 2, consumedCostGp: 1, opportunityValueGp: null }] })])
  assert.equal(result.eligibleCount, 0)
  assert.equal(result.profitPerActiveHourGp, null)
  assert.deepEqual(result.exclusions.map(e => e.reason), ['unfinished', 'elapsed_unconfirmed', 'zero_active_time', 'accounting_unknown', 'accounting_unknown'])
})
test('uses saved tax, consumed historical cost, direct coins and fees without opportunity repricing', () => {
  const item = { itemId: 1, name: 'Item', icon: null }
  const s = session('saved', { inputs: [{ id: 'i', item, acquiredQty: 1, consumedQty: 1, origin: 'already_owned', acquisitionCostGp: 50, consumedCostGp: 50, opportunityValueGp: 9999 }], outputs: [{ id: 'o', item, producedQty: 1 }], sales: [{ id: 'sale', outputId: 'o', qty: 1, unitPriceGp: 200, soldAt: now, taxGp: 37, taxBasis: 'player_confirmed', taxRuleVersion: 'saved' }], processingFeesGp: 3, otherExpensesGp: 5, directCoinReceiptsGp: 7 })
  assert.equal(summary([s]).totalProfitGp, 112)
  assert.equal(summary([{ ...s, status: 'settled' }]).eligibleCount, 1)
})
test('inclusive end window, all history, future timing and exact recipe snapshots', () => {
  const boundary = now - 7 * day
  const rows = [session('boundary', { processingStartedAt: boundary - 1, processingEndedAt: boundary }), session('old', { processingStartedAt: boundary - 2, processingEndedAt: boundary - 1 }), session('future', { processingEndedAt: now + 1 }), session('futureSale', { externalGeWaits: [{ id: 'w', side: 'sell', startedAt: now, endedAt: now + 1 }] })]
  assert.equal(summary(rows).eligibleCount, 1)
  assert.equal(summary(rows).exclusionCounts.future_timing, 2)
  assert.equal(summary(rows, null).eligibleCount, 2)
  const changed = session('changed'); changed.recipe.name = 'Renamed'
  assert.equal(summary([session(), changed]).recipes.length, 2)
})
test('deduplicates independent of object key order and rejects all conflicting copies', () => {
  const s = session()
  const reordered = Object.fromEntries(Object.entries(s).reverse()) as unknown as ProcessingSession
  assert.equal(summary([s, reordered]).eligibleCount, 1)
  assert.equal(summary([s, reordered]).exclusionCounts.duplicate, 1)
  const conflict = summary([s, { ...s, directCoinReceiptsGp: 1 }])
  assert.equal(conflict.eligibleCount, 0)
  assert.equal(conflict.exclusionCounts.duplicate_conflict, 2)
  assert.equal(conflict.excludedCount, 2)
})
test('skips malformed records but rejects invalid options and aggregate overflow explicitly', () => {
  assert.equal(summary([null as unknown as ProcessingSession, session('bad', { processingFeesGp: -1 }), { ...session('extension'), recorder: {} } as ProcessingSession]).exclusionCounts.invalid_record, 3)
  for (const options of [{ now: NaN, lookbackDays: 7 }, { now, lookbackDays: 0 }, { now, lookbackDays: Infinity }]) assert.throws(() => summarizeProcessingResults([], options), RangeError)
  assert.throws(() => summary([session('a', { directCoinReceiptsGp: Number.MAX_SAFE_INTEGER }), session('b', { directCoinReceiptsGp: 1 })]), /overflow/i)
})
test('excludes a deeply retained recipe that cannot be cloned without contaminating valid totals', () => {
  // Warm the serializer so its stack limit does not mask the native clone failure.
  for (let iteration = 0; iteration < 100; iteration++) summary([session()])
  let extra: Record<string, unknown> = {}
  for (let depth = 0; depth < 2500; depth++) extra = { nested: extra }
  const invalid = session('deep', { directCoinReceiptsGp: 999 })
  Object.assign(invalid.recipe, { extra })
  const valid = session('valid', { directCoinReceiptsGp: 100 })
  for (const rows of [[invalid, valid], [valid, invalid]]) {
    const result = summary(rows)
    assert.equal(result.eligibleCount, 1)
    assert.equal(result.totalProfitGp, 100)
    assert.equal(result.totalActiveMs, 3_600_000)
    assert.equal(result.profitPerActiveHourGp, 100)
    assert.equal(result.recipes.length, 1)
    assert.equal(result.recipes[0].eligibleCount, 1)
    assert.equal(result.recipes[0].totalProfitGp, 100)
    assert.equal(result.recipes[0].totalActiveMs, 3_600_000)
    assert.equal(result.excludedCount, 1)
    assert.equal(result.exclusionCounts.invalid_record, 1)
    assert.deepEqual(result.exclusions, [{ sessionIndex: rows.indexOf(invalid), reason: 'invalid_record' }])
  }
})
