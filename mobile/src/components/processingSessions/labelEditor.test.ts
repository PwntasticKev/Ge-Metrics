import assert from 'node:assert/strict'
import { test } from 'node:test'
import { labelEditor, labelSnapshot } from './labelEditor.ts'
import { example } from './explanationFixture.ts'
import { asRecorder } from './model.ts'
import { chooseRecovery, recoveryFor, recoverySnapshot } from './recovery.ts'
import { canExplainCommitted } from './explanationSelection.ts'

test('explicit save normalizes and clears; cancel and selection reset unsubmitted text', () => {
  const s = asRecorder({ ...example(), label: 'Old', initialPlan: { retained: 'quote evidence' } })
  const opened = labelEditor(null, { type: 'open', label: s.label })
  assert.equal(opened, 'Old')
  const typed = labelEditor(opened, { type: 'change', text: '  New  label ' })!
  assert.equal(s.label, 'Old')
  const next = labelSnapshot(s, typed)
  assert.equal(next.label, 'New label')
  assert.equal(next.recipe, s.recipe)
  assert.equal(next.initialPlan, s.initialPlan)
  const interrupted = { ...s, elapsedTimeConfirmed: false }
  assert.equal(labelSnapshot(interrupted, typed).elapsedTimeConfirmed, false)
  assert.equal(labelSnapshot(s, ' \n ').label, null)
  assert.equal(labelEditor(typed, { type: 'close' }), null)
  assert.equal(labelEditor(labelEditor(typed, { type: 'close' }), { type: 'open', label: 'Selected' }), 'Selected')
  assert.throws(() => labelSnapshot(s, '😀'.repeat(81)), /80/)
  assert.equal(labelSnapshot(s, '😀'.repeat(80)).label, '😀'.repeat(80))
})
test('failed-save snapshot retains label for retry while recovery keeps committed label separate', () => {
  const committed = asRecorder({ ...example(), label: 'Committed' })
  const pending = labelSnapshot(committed, 'Draft')
  const recovery = recoveryFor(pending, committed)
  assert.equal(recoverySnapshot(recovery).label, 'Draft')
  assert.equal(recoverySnapshot(chooseRecovery(recovery, 'committed')).label, 'Committed')
  assert.equal(recovery.draft.label, 'Draft')
  const state = { busy: false, unsaved: false, recovery: false, error: false, editing: true }
  assert.equal(canExplainCommitted(committed, committed, state), false)
  assert.equal(canExplainCommitted(pending, committed, { ...state, editing: false }), false)
})
