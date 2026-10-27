import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProcessingSession } from '../../lib/processingSessions.ts'
import { summarizeRecordedPace } from '../../lib/recordedPace.ts'
import { createRecordedPaceHistory } from './history.ts'

const now = 10 * 86_400_000
const recipe: ProcessingSession['recipe'] = { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [], outputs: [{ itemId: 1, name: 'Item', icon: null, qtyPerAction: 1 }], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: 100 }
function session(changes: Partial<ProcessingSession> = {}): ProcessingSession {
  return { id: 's', recipe: structuredClone(recipe), status: 'processed', processingStartedAt: now - 3_600_000, processingEndedAt: now, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: 100, inputs: [], outputs: [{ id: 'o', item: recipe.outputs[0], producedQty: 100 }], sales: [], processingFeesGp: null, otherExpensesGp: null, directCoinReceiptsGp: null, ...changes }
}
const options = { now, lookbackDays: 30 }

test('planning changes reuse history; each canonical group is derived only once', () => {
  const other = { ...recipe, id: 'other' }
  let malformedReads = 0
  const malformed = { get recipe() { malformedReads++; throw new Error('Unreadable snapshot') } } as unknown as ProcessingSession
  const sessions = [session(), session({ recipe: other }), session({ actionsCompleted: -1 }), malformed]
  let calls = 0
  let recordsDerived = 0
  const history = createRecordedPaceHistory(sessions, options, (group, snapshot, window) => {
    calls++
    recordsDerived += group.length
    return summarizeRecordedPace(group, snapshot, window)
  })
  const initial = history.summary(recipe)
  // Independent planning render triggers consult the same history generation.
  // ProcessingLab's history memo depends only on saved sessions and the window.
  for (const controls of [{ query: 'ore' }, { cash: 10 }, { minutes: 5 }, { recorded: true }, { inputs: 'patient' }, { outputs: 'patient' }]) {
    void controls
    assert.equal(history.summary(recipe), initial)
    history.summary(other)
  }
  assert.equal(calls, 2)
  assert.equal(recordsDerived, 3) // Includes the invalid matching record once.
  assert.equal(malformedReads, 1)
  const reordered = Object.fromEntries(Object.entries(recipe).reverse()) as typeof recipe
  reordered.outputs = [Object.fromEntries(Object.entries(recipe.outputs[0]).reverse()) as typeof recipe.outputs[number]]
  assert.equal(history.summary(reordered), initial)
  assert.equal(calls, 2)
  const changed = createRecordedPaceHistory(sessions, { now: now + 31 * 86_400_000, lookbackDays: 30 })
  assert.equal(changed.summary(recipe).sampleCount, 0)
})

test('grouping preserves weighted results and handles malformed snapshots', () => {
  const sessions = [session(), session({ id: 'long', processingStartedAt: now - 10_800_000, actionsCompleted: 900 }), session({ recipe: { ...recipe, coinCostPerAction: 1 } }), session({ elapsedTimeConfirmed: false }), session({ actionsCompleted: -1 }), session({ recipe: { ...recipe, outputs: null } as unknown as typeof recipe }), null as unknown as ProcessingSession]
  const history = createRecordedPaceHistory(sessions, options)
  const actual = history.summary(recipe)
  const expected = summarizeRecordedPace(sessions, recipe, options)
  for (const field of ['sampleCount', 'totalActions', 'totalActiveMs', 'actionsPerHour', 'windowStartedAt', 'windowEndedAt', 'samples'] as const) assert.deepEqual(actual[field], expected[field], field)
  assert.equal(actual.actionsPerHour, 250)
  assert.equal(actual.exclusionCounts.invalid_record, 1)
  assert.equal(history.summary(recipe), actual)
  assert.equal(history.summary({ ...recipe, name: 'Changed metadata' }).sampleCount, 0)
})
