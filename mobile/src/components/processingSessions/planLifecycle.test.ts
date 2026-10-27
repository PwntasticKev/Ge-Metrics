import assert from 'node:assert/strict'
import { test } from 'node:test'
import { newSession } from './model.ts'
import { isInitiallyUnsaved, initialPlanMessage } from './planLifecycle.ts'
const recipe = { id: 'r', methodKey: 'm', name: 'R', source: null, inputs: [{ itemId: 1, name: 'I', icon: null, qtyPerAction: 1 }], outputs: [], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }
test('known committed unstarted draft stays saved; local and pending drafts stay unsaved', () => {
  const local = newSession(recipe, 's')
  const committed = { ...local, revision: 1 }
  assert.equal(isInitiallyUnsaved(committed, committed, false), false)
  assert.equal(isInitiallyUnsaved(local, null, false), true)
  assert.equal(isInitiallyUnsaved(committed, committed, true), true)
  assert.equal(isInitiallyUnsaved({ ...committed, otherExpensesGp: 5 }, committed, false), true)
})
test('legacy and unavailable evidence never claim a captured comparison', () => {
  assert.match(initialPlanMessage({ status: 'missing' }), /not saved/)
  assert.match(initialPlanMessage({ status: 'unsupported', version: 2 }), /unsupported/)
  assert.match(initialPlanMessage({ status: 'invalid', reason: 'bad' }), /unavailable/)
})
