/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createLimiter } from '../limiter.ts'

describe('createLimiter', () => {
  it('never runs more than the limit at once and returns each result', async () => {
    const limit = createLimiter(2, 0)
    let running = 0
    let peak = 0
    const job = (n: number) => limit(async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise(r => setTimeout(r, 5))
      running--
      return n * 2
    })
    const results = await Promise.all([1, 2, 3, 4, 5].map(job))
    assert.deepEqual(results, [2, 4, 6, 8, 10])
    assert.equal(peak, 2)
  })
  it('spaces job starts by the gap', async () => {
    const limit = createLimiter(5, 20)
    const starts: number[] = []
    await Promise.all([0, 1, 2].map(() => limit(async () => { starts.push(Date.now()) })))
    assert.ok(starts[2] - starts[0] >= 38, `starts ${starts.join(',')}`)
  })
  it('frees the slot when a job fails', async () => {
    const limit = createLimiter(1, 0)
    await assert.rejects(limit(async () => { throw new Error('boom') }))
    assert.equal(await limit(async () => 'ok'), 'ok')
  })
  it('rejects a bad concurrency', () => {
    assert.throws(() => createLimiter(0, 0))
  })
})
