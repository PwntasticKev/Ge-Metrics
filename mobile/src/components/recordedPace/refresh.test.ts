import assert from 'node:assert/strict'
import { test } from 'node:test'
import { refreshRecordedPace } from './refresh.ts'

test('manual refresh removes opt-ins before a pending reload and retains curated fallback on failure', async () => {
  let choices: Record<string, number> = { greenLeather: 185.567 }
  let failLoad!: (error: Error) => void
  const pending = new Promise<void>((_resolve, reject) => { failLoad = reject })
  const loadResult = pending.catch(() => 'storage error')
  let reloads = 0
  const refresh = () => refreshRecordedPace(next => { choices = next }, () => {
    assert.deepEqual(choices, {}, 'reload must never start with recorded opt-ins')
    reloads++
    return pending
  })
  refresh()
  assert.deepEqual(choices, {}, 'reset must not wait for the focused reload or its completion')
  assert.equal(reloads, 1)
  failLoad(new Error('storage unavailable'))
  assert.equal(await loadResult, 'storage error')
  assert.deepEqual(choices, {})
  // A later explicit opt-in can be reset by another manual refresh too.
  choices = { greenLeather: 200 }
  refresh()
  assert.deepEqual(choices, {})
  assert.equal(reloads, 2)
})
