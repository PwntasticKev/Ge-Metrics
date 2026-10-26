/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fillsText, isSharable, shareCardText, shareFileName, shareStamp, type SharePick } from '../shareCard.ts'

const at = new Date(2026, 9, 26, 14, 5).getTime()
const pick: SharePick = { itemId: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png', buyAt: 1_500_000, sellAt: 1_560_000, qty: 70, profitEach: 28_800, fillHours: 2.5, at }

describe('shareCardText', () => {
  it('lists buy, sell, quantity, total profit after tax and fill time', () => {
    const text = shareCardText(pick)
    assert.deepEqual(text.rows, [
      { label: 'Buy at', value: '1,500,000' },
      { label: 'Sell at', value: '1,560,000' },
      { label: 'Quantity', value: '70' }
    ])
    assert.equal(text.profit, '+2.02M')
    assert.equal(text.profitEach, '+29K each')
    assert.equal(text.fills, '~2.5h')
    assert.equal(text.stamp, '26 Oct 2026, 14:05')
  })
  it('leaves the fill time out when unknown', () => {
    const text = shareCardText({ ...pick, fillHours: null })
    assert.equal(text.fills, '–')
  })
})

describe('share helpers', () => {
  it('formats stamps and fill times', () => {
    assert.equal(shareStamp(at), '26 Oct 2026, 14:05')
    assert.equal(fillsText(Infinity), '–')
    assert.equal(fillsText(0.5), '~30m')
  })
  it('needs an amount and prices', () => {
    assert.equal(isSharable(pick), true)
    assert.equal(isSharable({ ...pick, qty: 0 }), false)
    assert.equal(isSharable(null), false)
  })
  it('makes a safe file name', () => {
    assert.equal(shareFileName('Abyssal whip'), 'ge-metrics-abyssal-whip.png')
    assert.equal(shareFileName('Toxic blowpipe (uncharged)'), 'ge-metrics-toxic-blowpipe.png')
    assert.equal(shareFileName('../..'), 'ge-metrics-pick.png')
  })
})
