import assert from 'node:assert/strict'
import { test } from 'node:test'
import { example } from './explanationFixture.ts'
import { decodeProcessingSessions } from '../../lib/processingSessionStorage.ts'
import { canExplainCommitted, committedExplanationSnapshot } from './explanationSelection.ts'
const select = (rows: unknown[]) => committedExplanationSnapshot(decodeProcessingSessions(JSON.stringify({ version: 1, sessions: rows })), 's')
test('raw copies require exact identity in both orders including retained fields and revision', () => {
  const s = example()
  assert.ok(select([s, Object.fromEntries(Object.entries(s).reverse())]))
  for (const copy of [{ ...s, revision: 1 }, { ...s, futureField: true }, { id: 's' }]) {
    assert.equal(select([s, copy]), null); assert.equal(select([copy, s]), null)
  }
  assert.ok(select([{ id: 'unrelated' }, s]))
  assert.equal(committedExplanationSnapshot({ ok: false, error: new Error('load') }, 's'), null)
})
test('every unsafe lifecycle state and changed snapshot hides explanation', () => {
  const s = select([example()])!
  const state = { busy: false, unsaved: false, recovery: false, error: false, editing: false }
  assert.equal(canExplainCommitted(s, s, state), true)
  for (const key of Object.keys(state)) assert.equal(canExplainCommitted(s, s, { ...state, [key]: true }), false)
  assert.equal(canExplainCommitted({ ...s, revision: 99 }, s, state), false)
  assert.equal(canExplainCommitted(s, null, state), false)
})
