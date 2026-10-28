/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { GameUpdate } from '../gameUpdates.ts'
import type { OfferPick } from '../pickFill.ts'
import { bigReleases, decideRegime, regimeForMode, releaseInWindow, releaseName, resizePicks, scaledQty, shortDate, standAsideText, TRADE } from '../regime.ts'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const oct20 = Date.UTC(2026, 9, 20)
const live = oct20 + 12 * HOUR
const update = (title: string, date = oct20, kind = 'game'): GameUpdate => ({ title, date, url: null, kind, links: [] })
const fractured = update('The Fractured Archive - Out Today')
const base = { mood: null, updates: [fractured], updateGate: true }

describe('bigReleases', () => {
  it('keeps game posts whose title reads like a release', () => {
    const list = bigReleases([
      fractured,
      update('More Gathering Efficiencies', oct20 - 6 * DAY),
      update('The Fractured Archive - Everything You Need To Know', oct20 - 14 * DAY, 'future'),
      update('Sailing Launches Today', oct20 - 30 * DAY),
      update('Menu Entry Swapper Overhaul - Live Now!', oct20 - 2 * DAY)
    ])
    assert.deepEqual(list.map(r => r.title), ['Sailing Launches Today', 'The Fractured Archive - Out Today'])
    assert.equal(list[1].at, live)
  })
  it('adds announced releases', () => {
    const list = bigReleases([], [{ title: 'Leagues VI', date: Date.UTC(2026, 10, 4) }])
    assert.equal(list.length, 1)
    assert.equal(list[0].at, Date.UTC(2026, 10, 4, 12))
  })
})

describe('releaseInWindow', () => {
  const releases = bigReleases([fractured])
  it('stands aside until exactly 7 days after live time', () => {
    assert.ok(releaseInWindow(releases, live + 7 * DAY - 1))
    assert.equal(releaseInWindow(releases, live + 7 * DAY), null)
  })
  it('does not read a published post before its live time', () => {
    // Midnight to noon UTC on the post day: the post isn't treated as out yet,
    // and only an announced (upcoming) date fires the day-before side.
    assert.equal(decideRegime({ ...base, updates: [], now: live - 1 }).state, 'trade')
    assert.equal(decideRegime({ ...base, now: live }).state, 'stand-aside')
  })
  it('fires one day ahead for an announced release', () => {
    const upcoming = [{ title: 'Leagues VI', date: oct20 }]
    assert.equal(decideRegime({ ...base, updates: [], upcoming, now: live - DAY }).state, 'stand-aside')
    assert.equal(decideRegime({ ...base, updates: [], upcoming, now: live - DAY - 1 }).state, 'trade')
  })
})

describe('decideRegime', () => {
  const now = Date.UTC(2026, 9, 26, 9)
  it('stands aside after a big release, with the reason', () => {
    const r = decideRegime({ ...base, now })
    assert.equal(r.state, 'stand-aside')
    assert.equal(r.size, 0)
    assert.equal(r.sizeIfShown, 1)
    assert.equal(r.release?.title, fractured.title)
    assert.match(r.reasons[0].text, /^Stand aside: The Fractured Archive released 20 Oct\. Quick flips lost money in the week after big releases\./)
  })
  it('risk-off alone is caution at half size', () => {
    const r = decideRegime({ ...base, updates: [], mood: 'risk-off', now })
    assert.equal(r.state, 'caution')
    assert.equal(r.size, 0.5)
    assert.deepEqual(r.reasons.map(x => x.kind), ['risk-off'])
    assert.match(r.reasons[0].text, /quick amounts are halved/)
  })
  it('stand aside beats caution, and showing anyway keeps the half size', () => {
    const r = decideRegime({ ...base, mood: 'risk-off', now })
    assert.equal(r.state, 'stand-aside')
    assert.equal(r.sizeIfShown, 0.5)
    assert.deepEqual(r.reasons.map(x => x.kind), ['release', 'risk-off'])
  })
  it('the setting turns the release gate off but not risk-off', () => {
    assert.equal(decideRegime({ ...base, updateGate: false, now }).state, 'trade')
    assert.equal(decideRegime({ ...base, updateGate: false, mood: 'risk-off', now }).state, 'caution')
  })
  it('trades in a normal market', () => {
    assert.deepEqual(decideRegime({ ...base, updates: [], mood: 'risk-on', now }), TRADE)
  })
  it('only gates Next 4 hours and Plan', () => {
    const r = decideRegime({ ...base, now })
    assert.equal(regimeForMode(r, 'quick'), r)
    assert.equal(regimeForMode(r, 'plan'), r)
    assert.equal(regimeForMode(r, 'overnight'), TRADE)
    assert.equal(regimeForMode(r, 'dips'), TRADE)
  })
})

describe('copy', () => {
  it('names the release without the "out today" suffix', () => {
    assert.equal(releaseName('The Fractured Archive - Out Today'), 'The Fractured Archive')
    assert.equal(releaseName('Sailing Launches Today'), 'Sailing Launches Today')
    assert.equal(shortDate(oct20), '20 Oct')
  })
  it('says "releases" before an announced release goes live', () => {
    const [r] = bigReleases([], [{ title: 'Leagues VI', date: oct20 }])
    assert.match(standAsideText(r, live - HOUR), /^Stand aside: Leagues VI releases 20 Oct\./)
  })
})

describe('resizePicks', () => {
  const offer = { qty: 10, margin: 50, buyAt: 1000, sellAt: 1070, tax: 20, roi: 0.05, profit: 500, cost: 10_000, flow: null, rate: null, fillHours: null }
  const pick = { id: 1, name: 'Rune', buyAt: 1000, sellAt: 1070, tax: 20, profit: 50, roi: 0.05, maxQty: 10, potential: 500, cost: 10_000, offer } as unknown as OfferPick
  it('halves amounts and recomputes profit and cost', () => {
    const [half] = resizePicks([pick], 0.5)
    assert.equal(half.maxQty, 5)
    assert.equal(half.potential, 250)
    assert.equal(half.cost, 5000)
    assert.equal(half.offer.qty, 5)
    assert.equal(pick.maxQty, 10)
  })
  it('keeps at least one and leaves full size alone', () => {
    assert.equal(scaledQty(1, 0.5), 1)
    const list = [pick]
    assert.equal(resizePicks(list, 1), list)
  })
})
