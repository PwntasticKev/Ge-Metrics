import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newSession, transition } from './model.ts'
import { canRetryRecovery, chooseRecovery, recoveryFor, recoverySnapshot } from './recovery.ts'
const recipe = { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [], outputs: [], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }
test('stale processing draft cannot retry or rebase over ended committed state', () => {
  const draft = { ...transition(newSession(recipe, 's'), 'start', 100), revision: 1 }
  const committed = { ...transition(draft, 'end', 200), revision: 2 }
  const recovery = recoveryFor(draft, committed)
  assert.equal(canRetryRecovery(recovery), false)
  assert.equal(recoverySnapshot(recovery), draft)
  const chosen = chooseRecovery(recovery, 'committed')
  assert.equal(canRetryRecovery(chosen), true)
  assert.deepEqual(recoverySnapshot(chosen), committed)
  assert.equal(recoverySnapshot(chosen).processingEndedAt, 200)
  assert.equal(chosen.draft, draft)
  assert.equal(recoverySnapshot(chooseRecovery(chosen, 'draft')).revision, 1)
  assert.equal(draft.processingEndedAt, null)
})
test('same revision failed write can retry; refreshing conflict preserves draft revision', () => {
  const draft = { ...newSession(recipe, 's'), revision: 2, actionsCompleted: 9 }
  const committed = { ...draft, actionsCompleted: 3 }
  assert.equal(canRetryRecovery(recoveryFor(draft, committed)), true)
  const refreshed = recoveryFor(draft, { ...committed, revision: 3 })
  assert.equal(canRetryRecovery(refreshed), false)
  assert.equal(refreshed.draft.actionsCompleted, 9)
  assert.equal(refreshed.draft.revision, 2)
  assert.throws(() => recoveryFor(draft, { ...committed, id: 'other' }))
})
test('loading active committed timer requires confirmation without mutating snapshots', () => {
  const active = { ...transition(newSession(recipe, 's'), 'start', 100), revision: 1 }
  const recovery = recoveryFor(active, active)
  assert.equal(recovery.committed.elapsedTimeConfirmed, false)
  assert.equal(active.elapsedTimeConfirmed, true)
  assert.equal(recovery.committed.revision, 1)
})
