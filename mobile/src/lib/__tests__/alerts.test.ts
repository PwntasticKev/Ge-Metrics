/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { currentValue, describeRule, evaluateAlerts, hourMove, needsHourAverages, STALE_AFTER_MS, type AlertRule, type LatestPrice } from '../alerts.ts'
import { agoText, EMPTY_ALERTS, MAX_LOG, parseAlerts, parseGp, parsePercent, withoutRule, withRule, withRuleEnabled, withTriggers } from '../alertState.ts'

const NOW = Date.UTC(2026, 9, 26, 12)
const NOW_SEC = NOW / 1000
const HOUR = 3_600_000
// 2% capped at 5M, like the GE; tests only need something deterministic.
const tax = (price: number) => Math.min(Math.floor(price * 0.02), 5_000_000)

const rule = (over: Partial<AlertRule>): AlertRule => ({
  id: 'r1', itemId: 4151, name: 'Abyssal whip', icon: null, kind: 'below', side: 'buy', direction: 'either',
  threshold: 1_000_000, cooldownMs: HOUR, enabled: true, createdAt: 0, lastTriggeredAt: null, ...over
})

const whip: LatestPrice = { high: 1_100_000, highTime: NOW_SEC - 60, low: 1_000_000, lowTime: NOW_SEC - 60 }
const latest = { 4151: whip }
const run = (rules: AlertRule[], extra: Partial<Parameters<typeof evaluateAlerts>[0]> = {}) =>
  evaluateAlerts({ rules, latest, now: NOW, tax, ...extra })

describe('price rules', () => {
  it('fires "below" on the buy side (wiki low) at the threshold', () => {
    const { triggers, rules } = run([rule({ threshold: 1_000_000 })])
    assert.equal(triggers.length, 1)
    assert.equal(triggers[0].itemId, 4151)
    assert.match(triggers[0].body, /1,000,000 gp/)
    assert.equal(rules[0].lastTriggeredAt, NOW)
  })
  it('does not fire "below" when the price is above', () => {
    assert.equal(run([rule({ threshold: 999_999 })]).triggers.length, 0)
  })
  it('fires "above" on the sell side (wiki high)', () => {
    assert.equal(run([rule({ kind: 'above', side: 'sell', threshold: 1_100_000 })]).triggers.length, 1)
    assert.equal(run([rule({ kind: 'above', side: 'sell', threshold: 1_100_001 })]).triggers.length, 0)
    assert.equal(run([rule({ kind: 'above', side: 'buy', threshold: 1_100_000 })]).triggers.length, 0)
  })
  it('ignores stale and missing prices', () => {
    const stale = { 4151: { ...whip, lowTime: NOW_SEC - STALE_AFTER_MS / 1000 - 1 } }
    assert.equal(run([rule({})], { latest: stale }).triggers.length, 0)
    assert.equal(run([rule({ itemId: 1 })]).triggers.length, 0)
  })
})

describe('margin rule', () => {
  it('uses sell - tax - buy', () => {
    const r = rule({ kind: 'margin', threshold: 78_000 })
    assert.equal(currentValue(r, { latest, now: NOW, tax }), 78_000)
    assert.equal(run([r]).triggers.length, 1)
    assert.equal(run([{ ...r, threshold: 78_001 }]).triggers.length, 0)
  })
  it('needs both sides', () => {
    const oneSided = { 4151: { ...whip, low: null } }
    assert.equal(run([rule({ kind: 'margin', threshold: 0 })], { latest: oneSided }).triggers.length, 0)
  })
})

describe('1h move rule', () => {
  const hour = { 4151: { avgHighPrice: 1_200_000, avgLowPrice: 1_100_000 } }
  it('compares the mid price with the last hour average', () => {
    const move = hourMove(whip, hour[4151], NOW)
    assert.ok(move !== null && Math.abs(move - (1_050_000 - 1_150_000) / 1_150_000) < 1e-9)
  })
  it('compares like for like when the average is one-sided', () => {
    assert.equal(hourMove(whip, { avgHighPrice: 1_100_000, avgLowPrice: null }, NOW), 0)
    assert.equal(hourMove({ ...whip, high: null }, { avgHighPrice: 1_100_000, avgLowPrice: null }, NOW), null)
  })
  it('respects the direction', () => {
    assert.equal(run([rule({ kind: 'move', direction: 'down', threshold: 8 })], { hour }).triggers.length, 1)
    assert.equal(run([rule({ kind: 'move', direction: 'up', threshold: 8 })], { hour }).triggers.length, 0)
    assert.equal(run([rule({ kind: 'move', direction: 'either', threshold: 8 })], { hour }).triggers.length, 1)
    assert.equal(run([rule({ kind: 'move', direction: 'down', threshold: 9 })], { hour }).triggers.length, 0)
  })
  it('skips without hour data', () => {
    assert.equal(run([rule({ kind: 'move', threshold: 1 })]).triggers.length, 0)
  })
  it('says which way it moved', () => {
    const [t] = run([rule({ kind: 'move', direction: 'down', threshold: 5 })], { hour }).triggers
    assert.match(t.body, /^Down 8\.7%/)
  })
  it('only asks for /1h when an enabled move rule exists', () => {
    assert.equal(needsHourAverages([rule({})]), false)
    assert.equal(needsHourAverages([rule({ kind: 'move', enabled: false })]), false)
    assert.equal(needsHourAverages([rule({ kind: 'move' })]), true)
  })
})

describe('cooldown and enabled', () => {
  it('waits out the cooldown, then fires again', () => {
    assert.equal(run([rule({ lastTriggeredAt: NOW - HOUR + 1 })]).triggers.length, 0)
    assert.equal(run([rule({ lastTriggeredAt: NOW - HOUR })]).triggers.length, 1)
  })
  it('skips disabled rules and leaves them untouched', () => {
    const r = rule({ enabled: false })
    const result = run([r])
    assert.equal(result.triggers.length, 0)
    assert.equal(result.rules[0], r)
  })
  it('does not mutate the input rules', () => {
    const r = rule({})
    run([r])
    assert.equal(r.lastTriggeredAt, null)
  })
})

describe('describeRule', () => {
  it('reads like a sentence', () => {
    assert.equal(describeRule(rule({})), 'Buy price at or below 1,000,000')
    assert.equal(describeRule(rule({ kind: 'above', side: 'sell', threshold: 5 })), 'Sell price at or above 5')
    assert.equal(describeRule(rule({ kind: 'margin', threshold: 25_000 })), 'Margin after tax 25,000+')
    assert.equal(describeRule(rule({ kind: 'move', direction: 'down', threshold: 5 })), 'Drops 5%+ vs last hour')
    assert.equal(describeRule(rule({ kind: 'move', direction: 'either', threshold: 2.5 })), 'Moves 2.5%+ vs last hour')
  })
})

describe('alert state', () => {
  it('drops bad records but keeps good ones', () => {
    const parsed = parseAlerts({ rules: [rule({}), { id: 'x' }, rule({ id: 'r2', kind: 'nope' as never })], log: 'bad', lastCheck: { at: 1, source: 'background', fired: 2 } })
    assert.equal(parsed.rules.length, 1)
    assert.deepEqual(parsed.log, [])
    assert.deepEqual(parsed.lastCheck, { at: 1, source: 'background', error: null, fired: 2 })
    assert.deepEqual(parseAlerts(null), EMPTY_ALERTS)
  })
  it('falls back to the default cooldown for unknown values', () => {
    assert.equal(parseAlerts({ rules: [rule({ cooldownMs: 7 })] }).rules[0].cooldownMs, HOUR)
  })
  it('adds, replaces, toggles and removes rules without mutating', () => {
    const one = withRule(EMPTY_ALERTS, rule({}))
    const replaced = withRule(one, rule({ threshold: 5 }))
    assert.equal(replaced.rules.length, 1)
    assert.equal(replaced.rules[0].threshold, 5)
    assert.equal(withRuleEnabled(replaced, 'r1', false).rules[0].enabled, false)
    assert.equal(replaced.rules[0].enabled, true)
    assert.equal(withoutRule(replaced, 'r1').rules.length, 0)
    assert.equal(EMPTY_ALERTS.rules.length, 0)
  })
  it('logs newest first and caps the log', () => {
    const { triggers } = run([rule({}), rule({ id: 'r2', kind: 'margin', threshold: 0 })])
    let state = withTriggers(EMPTY_ALERTS, triggers, 'background')
    assert.deepEqual(state.log.map(t => t.ruleId), ['r2', 'r1'])
    assert.equal(state.log[0].source, 'background')
    for (let i = 0; i < MAX_LOG; i++) state = withTriggers(state, triggers, 'app')
    assert.equal(state.log.length, MAX_LOG)
  })
})

describe('input helpers', () => {
  it('parses GP with k/m/b suffixes and commas', () => {
    assert.equal(parseGp('1.2m'), 1_200_000)
    assert.equal(parseGp('25K'), 25_000)
    assert.equal(parseGp('1,500'), 1500)
    assert.equal(parseGp('2b'), 2_000_000_000)
    assert.equal(parseGp('0'), null)
    assert.equal(parseGp('abc'), null)
    assert.equal(parseGp(''), null)
  })
  it('parses percents within range', () => {
    assert.equal(parsePercent('5'), 5)
    assert.equal(parsePercent('2.55%'), 2.6)
    assert.equal(parsePercent('0'), null)
    assert.equal(parsePercent('x'), null)
  })
  it('says how long ago', () => {
    assert.equal(agoText(NOW - 10_000, NOW), 'just now')
    assert.equal(agoText(NOW - 12 * 60_000, NOW), '12m ago')
    assert.equal(agoText(NOW - 3 * HOUR, NOW), '3h ago')
    assert.equal(agoText(NOW - 72 * HOUR, NOW), '3d ago')
  })
})
