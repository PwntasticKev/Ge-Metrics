import { decodeProcessingSessions } from '../processingSessionStorage.ts'
import { recordedPaceSnapshot } from '../../components/recordedPace/adapter.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeRecordedPace } from '../recordedPace.ts'
import type { ProcessingSession } from '../processingSessions.ts'
const now = 10 * 86_400_000
const recipe: ProcessingSession['recipe'] = { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [], outputs: [{ itemId: 1, name: 'Item', icon: null, qtyPerAction: 1 }], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }
function session(changes: Partial<ProcessingSession> = {}): ProcessingSession {
  return { id: 's', recipe: structuredClone(recipe), status: 'processed', processingStartedAt: now - 3_600_000, processingEndedAt: now, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: 100, inputs: [], outputs: [{ id: 'o', item: recipe.outputs[0], producedQty: 100 }], sales: [], processingFeesGp: null, otherExpensesGp: null, directCoinReceiptsGp: null, ...changes }
}
const summary = (sessions: ProcessingSession[]) => summarizeRecordedPace(sessions, recipe, { now, lookbackDays: 2 })
test('weights heterogeneous durations by active time, accepts unsold processed inventory, and is pure', () => {
  const sessions = [session(), session({ id: 'long', processingStartedAt: now - 10_800_000, actionsCompleted: 900 })]
  const before = structuredClone(sessions)
  const result = summary(sessions)
  assert.equal(result.sampleCount, 2)
  assert.equal(result.totalActions, 1000)
  assert.equal(result.totalActiveMs, 14_400_000)
  assert.equal(result.actionsPerHour, 250)
  assert.deepEqual(sessions, before)
  assert.equal('profitGp' in result, false)
})
test('subtracts GE and other pauses and excludes external wait from active time', () => {
  const s = session({ pauses: [{ id: 'p', startedAt: now - 3_600_000, endedAt: now - 1_800_000, reason: 'ge_wait' }, { id: 'b', startedAt: now - 900_000, endedAt: now - 450_000, reason: 'break_other' }], externalGeWaits: [{ id: 'w', side: 'buy', startedAt: now - 7_200_000, endedAt: now - 3_600_000 }] })
  assert.equal(summary([s]).totalActiveMs, 1_350_000)
})
test('excludes unknown, zero, invalid, unfinished and unconfirmed actuals with counts', () => {
  const result = summary([session({ elapsedTimeConfirmed: false }), session({ actionsCompleted: null }), session({ actionsCompleted: 0 }), session({ processingStartedAt: now }), session({ actionsCompleted: -1 }), session({ status: 'processing', processingEndedAt: null }), null as unknown as ProcessingSession])
  assert.equal(result.sampleCount, 0)
  assert.equal(result.actionsPerHour, null)
  assert.equal(result.excludedCount, 7)
  assert.deepEqual(result.exclusions.map(e => e.reason), ['elapsed_unconfirmed', 'unknown_actions', 'zero_actions', 'zero_active_time', 'invalid_record', 'not_ended', 'invalid_record'])
  assert.equal(result.exclusionCounts.invalid_record, 2)
})
test('requires the complete matching snapshot, including quantities and catalog identity', () => {
  const variants = [ { ...recipe, methodKey: 'other' }, { ...recipe, coinCostPerAction: 1 }, { ...recipe, outputs: [{ ...recipe.outputs[0], qtyPerAction: 2 }] }, { ...recipe, outputs: [{ ...recipe.outputs[0], itemId: 2 }] }, { ...recipe, curatedActionsPerHour: 999 } ]
  assert.equal(summary(variants.map(recipe => session({ recipe }))).exclusionCounts.recipe_mismatch, variants.length)
  assert.equal(summary([session({ recipe: { ...recipe } })]).sampleCount, 1)
})
test('bounds end dates inclusively and excludes future processing and external timing', () => {
  const boundary = now - 2 * 86_400_000
  const result = summary([session({ processingStartedAt: boundary - 1000, processingEndedAt: boundary }), session({ processingStartedAt: boundary - 1001, processingEndedAt: boundary - 1 }), session({ processingEndedAt: now + 1 }), session({ externalGeWaits: [{ id: 'future', side: 'sell', startedAt: now, endedAt: now + 1 }] })])
  assert.equal(result.sampleCount, 1)
  assert.equal(result.exclusionCounts.outside_window, 1)
  assert.equal(result.exclusionCounts.future_timing, 2)
  for (const options of [{ now: NaN, lookbackDays: 1 }, { now, lookbackDays: 0 }, { now, lookbackDays: Infinity }]) assert.throws(() => summarizeRecordedPace([], recipe, options), RangeError)
})
test('invalid recorder extensions and invalid intervals cannot contribute', () => {
  const malformed = { ...session(), recorder: {} }
  assert.equal(summary([malformed, session({ pauses: [{ id: 'p', startedAt: now, endedAt: now + 1, reason: 'ge_wait' }] })]).exclusionCounts.invalid_record, 2)
})

// Exercise the real durable decode: its public sessions list is last-wins.
function durable(rows: unknown[]) {
  const decoded = decodeProcessingSessions(JSON.stringify({ version: 1, sessions: rows }))
  if (!decoded.ok) throw decoded.error
  assert.equal(decoded.ok, true)
  return recordedPaceSnapshot(decoded)
}
test('durable conflicting IDs never supply pace in either order', () => {
  const copies = [session(), session({ actionsCompleted: 10000 })]
  for (const rows of [copies, [...copies].reverse()]) {
    const result = durable(rows)
    assert.equal(summary(result.sessions).actionsPerHour, null)
    assert.equal(result.excludedCount, 2)
  }
})
test('durable identical copies count once despite object key order', () => {
  const original = session()
  const reordered = Object.fromEntries(Object.entries(original).reverse())
  const result = durable([original, reordered])
  assert.equal(summary(result.sessions).sampleCount, 1)
  assert.equal(result.excludedCount, 0)
})
test('malformed same-ID copy excludes all copies without double counting unreadables', () => {
  const result = durable([session(), { ...session(), actionsCompleted: -1 }, null, session({ id: 'unrelated' })])
  assert.equal(summary(result.sessions).sampleCount, 1)
  assert.equal(result.sessions[0].id, 'unrelated')
  assert.equal(result.excludedCount, 3)
})
test('durable pace accepts ended confirmed sessions with unknown financials', () => {
  const result = durable([session()])
  assert.equal(summary(result.sessions).actionsPerHour, 100)
})
test('retained fields and revisions participate in durable conflicts', () => {
  for (const extra of [{ revision: 1 }, { retained: { value: 2 } }]) {
    assert.equal(durable([session(), { ...session(), ...extra }]).sessions.length, 0)
  }
})

test('invalid cyclic and deep retained data cannot compromise unrelated rows', () => {
  const decoded = decodeProcessingSessions(JSON.stringify({ version: 1, sessions: [session({ id: 'safe' })] }))
  if (!decoded.ok) throw decoded.error
  const cyclic: Record<string, unknown> = { ...session(), retained: null }
  cyclic.retained = cyclic
  let deep: unknown = null
  for (let i = 0; i < 110; i++) deep = { nested: deep }
  decoded.document.sessions.push(cyclic, { ...session(), id: 'deep', retained: deep })
  const result = recordedPaceSnapshot(decoded)
  assert.deepEqual(result.sessions.map(row => row.id), ['safe'])
  assert.equal(result.excludedCount, 2)
})
