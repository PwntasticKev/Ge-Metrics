import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProcessingSessionRepository } from '../../lib/processingSessionStorage.ts'
import type { ProcessingSession } from '../../lib/processingSessions.ts'
import { processingResultsSnapshot, summarizeDurableRows } from './adapter.ts'

const now = 3_600_000
function session(id: string, profit: number): ProcessingSession {
  return { id, status: 'processed', recipe: { id: 'r', methodKey: 'm', name: 'Manual recipe', source: null, inputs: [], outputs: [], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }, processingStartedAt: 0, processingEndedAt: now, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: null, inputs: [], outputs: [], sales: [], processingFeesGp: 0, otherExpensesGp: 0, directCoinReceiptsGp: profit }
}
const options = { now, lookbackDays: null }
async function readSnapshot(rows: unknown[]) {
  const durable = JSON.stringify({ version: 1, sessions: rows })
  let writes = 0
  const repository = createProcessingSessionRepository({
    getItem: async () => durable,
    setItem: async () => { writes++ },
  })
  const loaded = await repository.load()
  if (!loaded.ok) throw loaded.error
  const before = structuredClone(loaded.document)
  const snapshot = processingResultsSnapshot(loaded, options)
  assert.deepEqual(loaded.document, before)
  assert.equal(writes, 0)
  return { snapshot, loaded }
}

test('storage decoding to screen adapter counts identical durable copies once', async () => {
  const row = session('same', 100)
  const { snapshot, loaded } = await readSnapshot([row, row])
  assert.equal(loaded.sessions.length, 1)
  assert.equal(snapshot.rawCount, 2)
  assert.equal(snapshot.readableCount, 2)
  assert.equal(snapshot.unreadableRetainedCount, 0)
  assert.equal(snapshot.summary.eligibleCount, 1)
  assert.equal(snapshot.summary.totalProfitGp, 100)
  assert.equal(snapshot.summary.excludedCount, 1)
  assert.equal(snapshot.summary.exclusionCounts.duplicate, 1)
})

test('storage decoding to screen adapter excludes conflicting copies in both orders', async () => {
  const copies = [session('same', 100), session('same', 900)]
  for (const rows of [copies, [...copies].reverse()]) {
    const { snapshot, loaded } = await readSnapshot(rows)
    assert.equal(loaded.sessions.length, 1)
    assert.equal(snapshot.summary.eligibleCount, 0)
    assert.equal(snapshot.summary.totalProfitGp, 0)
    assert.equal(snapshot.summary.excludedCount, 2)
    assert.equal(snapshot.summary.exclusionCounts.duplicate_conflict, 2)
  }
})

test('malformed same-ID copy remains a conflict and unrelated valid record qualifies', async () => {
  const valid = session('same', 100)
  const invalid = { id: 'same', recipe: null }
  for (const copies of [[valid, invalid], [invalid, valid]]) {
    const { snapshot } = await readSnapshot([...copies, session('unrelated', 50), null])
    assert.equal(snapshot.rawCount, 4)
    assert.equal(snapshot.readableCount, 2)
    assert.equal(snapshot.unreadableRetainedCount, 2)
    assert.equal(snapshot.summary.eligibleCount, 1)
    assert.equal(snapshot.summary.totalProfitGp, 50)
    assert.equal(snapshot.summary.exclusionCounts.duplicate_conflict, 2)
    assert.equal(snapshot.summary.exclusionCounts.invalid_record, 1)
    assert.equal(snapshot.summary.excludedCount, 3)
    assert.equal(snapshot.summary.eligibleCount + snapshot.summary.excludedCount, snapshot.rawCount)
  }
})

test('unknown JSON rows reach validation without adapter property access', () => {
  const result = summarizeDurableRows([null, false, 1, 'row', [], {}, { id: 'bad' }], options)
  assert.equal(result.eligibleCount, 0)
  assert.equal(result.exclusionCounts.invalid_record, 7)
})
