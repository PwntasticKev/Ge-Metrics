import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProcessingSessionExport } from '../processingSessionExport.ts'
import type { ProcessingExportSnapshotResult } from '../processingSessionStorage.ts'

function fixture(result: ProcessingExportSnapshotResult = { status: 'snapshot', raw: ' {"version":1,"sessions":[],"extra":"日本😀"} ', byteLength: 52 }) {
  const calls: unknown[] = []
  const file = { uri: 'cache/owned', write: async (raw: string) => { calls.push(['write', raw]) }, remove: async () => { calls.push('remove-owned') } }
  const io = {
    readSnapshot: async () => result,
    isSharingAvailable: async () => true,
    now: () => new Date('2026-10-27T23:04:05.678Z'),
    random: () => 0.5,
    createFile: async (name: string) => { calls.push(['create', name]); return file },
    share: async (uri: string): Promise<{ consumed: boolean }> => { calls.push(['share', uri]); return { consumed: false } },
  }
  return { calls, file, io }
}

test('writes exact raw and neutral UTC/random name; closed sheet retains owned cache file', async () => {
  const { io, calls } = fixture()
  const result = await createProcessingSessionExport(io).run()
  assert.equal(result.message, 'Share sheet closed. A saved copy is not confirmed.')
  assert.deepEqual(calls, [['create', 'processing-sessions-2026-10-27T23-04-05-678Z-80000000.json'], ['write', ' {"version":1,"sessions":[],"extra":"日本😀"} '], ['share', 'cache/owned']])
})

test('all rejected snapshots create no file or share', async () => {
  const results: ProcessingExportSnapshotResult[] = [{ status: 'absent' }, { status: 'read-error', error: new Error('secret') }, { status: 'too-large', byteLength: 11, limit: 10 }, { status: 'unsupported' }, { status: 'malformed' }]
  for (const result of results) {
    const { io, calls } = fixture(result)
    assert.equal((await createProcessingSessionExport(io).run()).status, 'error')
    assert.deepEqual(calls, [])
  }
})

test('unavailable sharing and thrown reads create nothing; busy resets', async () => {
  const { io, calls } = fixture()
  io.isSharingAvailable = async () => false
  const workflow = createProcessingSessionExport(io)
  assert.equal((await workflow.run()).status, 'error')
  io.readSnapshot = async () => { throw new Error('private raw') }
  assert.equal((await workflow.run()).message, 'Could not read saved processing sessions. Try again.')
  assert.equal(workflow.busy, false)
  assert.deepEqual(calls, [])
})

test('duplicate calls blocked while read pending, then busy resets', async () => {
  const { io } = fixture()
  let release!: () => void
  io.readSnapshot = async () => { await new Promise<void>(resolve => { release = resolve }); return { status: 'absent' } }
  const workflow = createProcessingSessionExport(io)
  const first = workflow.run()
  assert.equal(workflow.busy, true)
  assert.equal((await workflow.run()).status, 'busy')
  release()
  await first
  assert.equal(workflow.busy, false)
})

test('write failure cleans only owned file; create collision never deletes; share rejection retains', async () => {
  const { io, file, calls } = fixture()
  file.write = async () => { throw new Error('write') }
  const workflow = createProcessingSessionExport(io)
  assert.equal((await workflow.run()).status, 'error')
  assert.equal(calls.at(-1), 'remove-owned')
  calls.length = 0
  io.createFile = async () => { throw new Error('exists') }
  await workflow.run()
  assert.deepEqual(calls, [])
  const second = fixture()
  second.io.share = async () => { throw new Error('cancel') }
  assert.equal((await createProcessingSessionExport(second.io).run()).status, 'error')
  assert.ok(!second.calls.includes('remove-owned'))
})

test('cleanup waits for explicit consumption confirmation and ignores cleanup failure', async () => {
  const { io, calls, file } = fixture()
  io.share = async () => { assert.ok(!calls.includes('remove-owned')); return { consumed: true } }
  file.remove = async () => { calls.push('remove-owned'); throw new Error('cleanup') }
  assert.equal((await createProcessingSessionExport(io).run()).status, 'closed')
  assert.equal(calls.at(-1), 'remove-owned')
})
