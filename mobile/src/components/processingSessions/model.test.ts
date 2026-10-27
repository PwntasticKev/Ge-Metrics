import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transition, newSession, confirmActuals, completeQuantities, interruptTimer, asRecorder } from './model.ts'
const recipe = { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [{ itemId: 1, name: 'In', icon: null, qtyPerAction: 2 }], outputs: [{ itemId: 2, name: 'Out', icon: null, qtyPerAction: 1 }], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }
test('actuals start unknown, zero is explicit and incomplete rows cannot settle', () => {
  const s = newSession(recipe, 's')
  assert.equal(s.recorder.inputs[0].acquiredQty, null)
  assert.equal(s.recorder.outputs[0].producedQty, null)
  assert.equal(completeQuantities(s), false)
  assert.throws(() => transition(s, 'settle', 100))
  const next = confirmActuals(s, { ...s.recorder, inputs: s.recorder.inputs.map(i => ({ ...i, acquiredQty: 0, consumedQty: 0 })), outputs: s.recorder.outputs.map(o => ({ ...o, producedQty: 0 })) })
  assert.equal(completeQuantities(next), true)
  assert.equal(next.inputs[0].consumedCostGp, null)
})
test('safe timing transitions, paused end closes pause, recovered timer requires confirmation', () => {
  let s = transition(newSession(recipe, 's'), 'start', 100)
  assert.throws(() => transition(s, 'start', 101))
  s = transition(s, 'ge_wait', 110)
  assert.throws(() => transition(s, 'break_other', 120))
  s = { ...s, elapsedTimeConfirmed: false }
  assert.throws(() => transition(s, 'end', 140))
  s = transition(s, 'confirm_elapsed', 140)
  s = transition(s, 'end', 150)
  assert.equal(s.pauses[0].endedAt, 150)
  assert.equal(s.status, 'processed')
  assert.throws(() => transition(s, 'resume', 151))
})
test('manual quantities may differ from ratios and oversales block corrections', () => {
  let s = newSession(recipe, 's')
  s = confirmActuals(s, { ...s.recorder, inputs: s.recorder.inputs.map(i => ({ ...i, acquiredQty: 10, consumedQty: 6 })), outputs: s.recorder.outputs.map(o => ({ ...o, producedQty: 9 })) })
  s.sales = [{ id: 'sale', outputId: s.outputs[0].id, qty: 8, unitPriceGp: 1, soldAt: 1, taxGp: 0, taxBasis: 'engine', taxRuleVersion: null }]
  assert.throws(() => confirmActuals(s, { ...s.recorder, outputs: s.recorder.outputs.map(o => ({ ...o, producedQty: 7 })) }))
  assert.equal(s.inputs[0].consumedQty, 6)
})
test('resuming never mutates the saved pause and end before start is rejected', () => {
  const started = transition(newSession(recipe, 's'), 'start', 100)
  const paused = transition(started, 'break_other', 110)
  const resumed = transition(paused, 'resume', 120)
  assert.equal(paused.pauses[0].endedAt, null)
  assert.equal(resumed.pauses[0].endedAt, 120)
  assert.throws(() => transition(resumed, 'end', 90))
})

test('route interruption requires explicit confirmation and preserves timer intervals', () => {
  const started = transition(newSession(recipe, 's'), 'start', 100)
  const paused = transition(started, 'ge_wait', 110)
  for (const s of [started, paused]) {
    const returned = interruptTimer(s)
    assert.equal(returned.elapsedTimeConfirmed, false)
    assert.deepEqual(returned.pauses, s.pauses)
    assert.equal(returned.processingEndedAt, null)
    assert.throws(() => transition(returned, 'end', 150))
    assert.equal(transition(returned, 'confirm_elapsed', 150).elapsedTimeConfirmed, true)
  }
  const ended = transition(started, 'end', 150)
  assert.equal(interruptTimer(ended), ended)
})
test('draft helpers reject malformed extensions rather than replacing them', () => {
  const s = newSession(recipe, 's')
  const malformed = { ...s, recorder: {} } as unknown as typeof s
  assert.throws(() => asRecorder(malformed), /Unreadable recorder/)
  assert.throws(() => completeQuantities(malformed), /Unreadable recorder/)
  assert.throws(() => confirmActuals(s, malformed.recorder), /Unreadable recorder/)
})
