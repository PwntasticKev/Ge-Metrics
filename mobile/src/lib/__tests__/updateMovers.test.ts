/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildMoverGroup, type MoverItem } from '../updateMovers.ts'

const update = { title: 'Post', date: Date.UTC(2026, 9, 14), url: null, kind: 'game', links: [] }
const items: Record<number, MoverItem> = {
  1: { id: 1, name: 'Up', icon: null, high: 120, low: 100 },
  2: { id: 2, name: 'Down', icon: null, high: 50, low: 50 },
  3: { id: 3, name: 'New', icon: null, high: 10, low: 8 }
}
const baseline = {
  1: { avgHighPrice: 105, avgLowPrice: 95 },
  2: { avgHighPrice: 110, avgLowPrice: 90 }
}

describe('buildMoverGroup', () => {
  it('ranks by the size of the move and keeps unknown moves last', () => {
    const group = buildMoverGroup(update, [3, 1, 2, 99], id => items[id] ?? null, baseline, 10)
    assert.deepEqual(group.rows.map(r => [r.name, r.change]), [['Down', -0.5], ['Up', 0.1], ['New', null]])
    assert.equal(group.rows[1].before, 100)
    assert.equal(group.rows[1].now, 110)
    assert.equal(group.hidden, 0)
  })
  it('caps the rows and counts the rest', () => {
    const group = buildMoverGroup(update, [1, 2, 3], id => items[id] ?? null, undefined, 2)
    assert.equal(group.rows.length, 2)
    assert.equal(group.hidden, 1)
  })
})
