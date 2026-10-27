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
test('open and load-latest guard rejects raw timer differences hidden by recovery', () => {
  const running = { ...example(), status: 'processing' as const, processingEndedAt: null, revision: 2 }
  for (const rows of [[running, { ...running, elapsedTimeConfirmed: false }], [{ ...running, elapsedTimeConfirmed: false }, running]]) {
    const raw = JSON.stringify({ version: 1, sessions: rows })
    for (let read = 0; read < 2; read++) {
      const result = decodeProcessingSessions(raw)
      assert.equal(committedExplanationSnapshot(result, 's'), null)
    }
  }
})
test('exact raw timer copies allow recovered projection without mutating read evidence', () => {
  const running = { ...example(), status: 'processing' as const, processingEndedAt: null, revision: 2 }
  const result = decodeProcessingSessions(JSON.stringify({ version: 1, sessions: [running, Object.fromEntries(Object.entries(running).reverse())] }))
  const before = JSON.stringify(result)
  const saved = committedExplanationSnapshot(result, 's')
  assert.ok(saved)
  assert.equal(saved.elapsedTimeConfirmed, false)
  assert.equal(saved.processingEndedAt, null)
  assert.equal(saved.revision, 2)
  assert.equal(JSON.stringify(result), before)
})
test('running raw labels, future fields and array order remain part of identity', () => {
  const running = { ...example(), status: 'processing' as const, processingEndedAt: null, label: 'saved', futureField: [1, 2] }
  for (const copy of [{ ...running, label: 'other' }, { ...running, futureField: [2, 1] }, { ...running, futureField: [1, 2], extra: true }, { id: 's' }]) {
    for (const rows of [[running, copy], [copy, running]]) assert.equal(select(rows), null)
  }
})
test('missing raw evidence cannot authorize a normalized snapshot', () => {
  const result = decodeProcessingSessions(JSON.stringify({ version: 1, sessions: [example()] }))
  assert.ok(result.ok)
  assert.equal(committedExplanationSnapshot({ ...result, sourceRecords: [] }, 's'), null)
  // Older/incomplete read shapes must fail closed rather than trust normalized rows.
  const legacy = { ...result }
  Reflect.deleteProperty(legacy, 'sourceRecords')
  assert.equal(committedExplanationSnapshot(legacy, 's'), null)
})
