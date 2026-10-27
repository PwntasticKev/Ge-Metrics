import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeSessionHistory, sessionHistoryPage, historyNavigation } from './sessionHistory.ts'

const record = (id: string, status = 'draft', processingStartedAt?: number) => ({ id, status, processingStartedAt, label: 'Été 東京', recipe: { name: 'Rune bars' } })

test('all older records are reachable in bounded pages, with clamped navigation', () => {
  const records = Array.from({ length: 19 }, (_, i) => record(String(i)))
  const pages = [0, 1, 2].map(page => sessionHistoryPage(records, '', page))
  assert.deepEqual(pages.map(p => p.rows.length), [8, 8, 3])
  assert.deepEqual(pages.flatMap(p => p.rows), records)
  assert.equal(sessionHistoryPage(records.slice(0, 2), '', 2).page, 0)
  assert.equal(sessionHistoryPage([], '', 9).page, 0)
  assert.equal(sessionHistoryPage(records, '', -1).page, 0)
})

test('query matches Unicode labels, recipe and IDs deterministically across every status', () => {
  const records = ['draft', 'processing', 'processed', 'settled'].map(status => record(`ID-${status}`, status))
  for (const query of ['ÉTÉ', '東京', 'rUnE', ' id- ']) assert.equal(sessionHistoryPage(records, query, 0).total, 4)
  assert.equal(sessionHistoryPage(records, 'ID-settled', 0).total, 1)
  assert.equal(sessionHistoryPage(records, 'missing', 0).total, 0)
})

test('query changes and new loads reset navigation', () => {
  const state = { query: '', page: 2 }
  assert.deepEqual(historyNavigation(state, { type: 'query', query: 'rune' }), { query: 'rune', page: 0 })
  assert.deepEqual(historyNavigation(state, { type: 'load' }), { query: '', page: 0 })
  assert.equal(historyNavigation(state, { type: 'page', page: 1 }).page, 1)
})

test('pending overlays durable IDs, retains unsaved-only and error-recovery records, and preserves sorting', () => {
  const durable = [record('same', 'settled', 100), record('old', 'draft'), record('recent', 'processed', 90)]
  const pending = [record('same', 'processing', 2), record('unsaved', 'draft')]
  const merged = mergeSessionHistory(durable, pending)
  assert.deepEqual(merged.map(s => s.id), ['same', 'recent', 'old', 'unsaved'])
  assert.equal(merged[0], pending[0])
  assert.equal(sessionHistoryPage(mergeSessionHistory([], pending), 'unsaved', 0).rows[0], pending[1])
})

test('merge and search neither mutate records nor require storage', () => {
  const records = [record('one'), record('two', 'processing', 4)]
  const before = JSON.stringify(records)
  records.forEach(s => { Object.freeze(s.recipe); Object.freeze(s) })
  Object.freeze(records)
  sessionHistoryPage(mergeSessionHistory(records, []), 'ÉTÉ', 1)
  assert.equal(JSON.stringify(records), before)
})
