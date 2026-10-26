/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { classifySignal, signalText } from '../updateSignals.ts'

const reason = (s: string) => classifySignal(s)?.reason ?? null
const dir = (s: string) => classifySignal(s)?.direction ?? null

describe('classifySignal', () => {
  it('reads supply changes before generic buff and nerf words', () => {
    assert.equal(reason('The drop rate of the Dragon pickaxe has been increased to 1/500.'), 'more supply')
    assert.equal(dir('Increasing the drop rate of Zulrah\'s scales.'), 'down')
    assert.equal(reason('Dragon bones will no longer be dropped by baby dragons.'), 'less supply')
    assert.equal(dir('The drop rate of Onyx is reduced.'), 'up')
    assert.equal(reason('You\'ll unlock a shop to purchase more.'), 'more supply')
  })
  it('spots new uses', () => {
    assert.equal(reason('Ascension shards are used to charge the Archivist\'s Folio.'), 'new use')
    assert.equal(dir('The new potion requires Dragon bones as an ingredient.'), 'up')
  })
  it('spots nerfs and buffs', () => {
    assert.equal(reason('The special attack of the Dragon claws has been nerfed.'), 'nerf or removal')
    assert.equal(reason('The Abyssal whip now provides +5 Strength.'), 'buff')
  })
  it('returns null without a signal', () => {
    assert.equal(classifySignal('Join us on Twitch for the launch of the Dragon hunter crossbow.'), null)
    assert.equal(signalText(null), 'no clear signal')
    assert.equal(signalText({ direction: 'up', reason: 'new use' }), '▲ new use')
  })
})
