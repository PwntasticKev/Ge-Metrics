import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProcessingSessionRepository } from '../../lib/processingSessionStorage.ts'
import { createPlanRecording } from './recordDisplayedPlan.ts'
import type { DisplayedPlanInput } from '../../lib/processingPlan.ts'
const displayed = (): DisplayedPlanInput => ({
  recipe: { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [{ itemId: 100, name: 'I', icon: null, qtyPerAction: 1 }], outputs: [{ itemId: 101, name: 'O', icon: null, qtyPerAction: 1 }], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null },
  quotes: [100, 101].map((itemId, i) => ({ itemId, qtyPerAction: 1, mode: 'instant', source: i ? 'latest-low' : 'latest-high', unitPriceGp: i ? 100 : 10, quoteTradeAtMs: 10, sourceDataUpdatedAtMs: 20, averagePeriod: null, averageSideVolume: null })),
  sizing: { cashBudgetGp: 1000, activeMinutes: 60, actions: null, rate: null, mappingLimitActions: 100, hasUnknownInputLimit: false }, amounts: { cost: 10, revenue: 100, tax: 2, profit: 88 }
})
test('one pending action freezes displayed values before storage and duplicate taps cannot create drafts', async () => {
  let raw: string | null = null
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const repo = createProcessingSessionRepository({ getItem: async () => { await gate; return raw }, setItem: async (_, value) => { raw = value } }, () => 100)
  const action = createPlanRecording(repo, () => 'reserved', () => 100)
  const source = displayed()
  const first = action.run(() => source)
  const duplicate = action.run(() => { throw Error('must not recapture') })
  source.quotes[0].unitPriceGp = 999
  release()
  assert.equal((await duplicate).status, 'busy')
  const result = await first
  assert.equal(result.status, 'saved')
  if (result.status !== 'saved') return
  assert.equal(result.session.id, 'reserved')
  assert.equal(result.session.status, 'draft')
  assert.equal(result.session.processingStartedAt, null)
  assert.equal(result.session.actionsCompleted, null)
  assert.equal(result.session.recorder.inputs[0].acquiredQty, null)
  assert.equal(result.session.processingFeesGp, null)
  assert.equal((result.session.initialPlan as { quotes: { unitPriceGp: number }[] }).quotes[0].unitPriceGp, 10)
  // Navigation may fail; retry returns the same saved draft without another write/revision.
  assert.equal((await action.run(() => { throw Error('no fresh capture') })).status, 'saved')
  const loaded = await repo.load(); assert.ok(loaded.ok)
  if (loaded.ok) { assert.equal(loaded.sessions.length, 1); assert.equal(loaded.sessions[0].revision, 1) }
})
test('failed and uncertain writes retry the exact reserved draft and reject conflicting copies', async () => {
  for (const uncertain of [false, true]) {
    let raw: string | null = null; let fail = true
    const repo = createProcessingSessionRepository({ getItem: async () => raw, setItem: async (_, value) => { if (!fail || uncertain) raw = value; if (fail) { fail = false; throw Error('disk') } } }, () => 100)
    const action = createPlanRecording(repo, () => 'retry', () => 100)
    assert.equal((await action.run(displayed)).status, 'failed')
    const result = await action.run(() => { throw Error('must retain capture') })
    assert.equal(result.status, 'saved')
    if (result.status === 'saved') assert.equal(result.session.revision, 1)
  }
  let raw: string | null = null
  const repo = createProcessingSessionRepository({ getItem: async () => raw, setItem: async (_, value) => { raw = value; throw Error('uncertain') } }, () => 100)
  const action = createPlanRecording(repo, () => 'conflict', () => 100)
  await action.run(displayed)
  const doc = JSON.parse(raw!); doc.sessions.push({ id: 'conflict' }); raw = JSON.stringify(doc)
  assert.equal((await action.run(displayed)).status, 'failed')
})
test('invalid capture creates no session and does not silently substitute new quotes', async () => {
  const repo = createProcessingSessionRepository({ getItem: async () => null, setItem: async () => { throw Error('must not save') } }, () => 100)
  const action = createPlanRecording(repo)
  const bad = displayed(); bad.amounts.cost = 99
  assert.equal((await action.run(() => bad)).status, 'unavailable')
})
test('quote adapter binds ordered input high/output low observations and patient averages have no trade event', async () => {
  const { displayedQuotes } = await import('./recordDisplayedPlan.ts')
  const { labMarket } = await import('../../lib/processingLab.ts')
  const { readInitialPlan } = await import('../../lib/processingPlan.ts')
  const { initialPlanMessage } = await import('../processingSessions/planLifecycle.ts')
  const items = [100, 101].map(id => ({ id, name: String(id), icon: null, members: false, limit: 100, highalch: null, high: 10, low: 100, highTime: 1, lowTime: 2, dailyVolume: null }))
  const market = { nowSec: 3, get: (id: number) => items.find(i => i.id === id) ?? null, all: () => items }
  const day = { '100': { avgLowPrice: 10.5, avgHighPrice: 12, lowPriceVolume: 7, highPriceVolume: 8 }, '101': { avgLowPrice: 99, avgHighPrice: 100.5, lowPriceVolume: 9, highPriceVolume: 10 } }
  const value = displayed()
  const instant = displayedQuotes(value.recipe, market, labMarket(market, 'instant', 'instant', day), { inputs: 'instant', outputs: 'instant' }, day, 3000, 4000)
  assert.deepEqual(instant.map(q => [q.itemId, q.unitPriceGp, q.quoteTradeAtMs, q.sourceDataUpdatedAtMs]), [[100, 10, 1000, 3000], [101, 100, 2000, 3000]])
  value.quotes = displayedQuotes(value.recipe, market, labMarket(market, 'patient', 'patient', day), { inputs: 'patient', outputs: 'patient' }, day, 3000, 4000)
  value.amounts = { cost: 10.5, revenue: 100.5, tax: 2, profit: 88 }
  assert.deepEqual(value.quotes.map(q => [q.source, q.unitPriceGp, q.quoteTradeAtMs, q.sourceDataUpdatedAtMs, q.averageSideVolume]), [['24h-avg-low', 10.5, null, 4000, 7], ['24h-avg-high', 100.5, null, 4000, 10]])
  const repo = createProcessingSessionRepository({ getItem: async () => null, setItem: async () => {} }, () => 5000)
  const result = await createPlanRecording(repo, () => 'patient', () => 5000).run(() => value)
  assert.equal(result.status, 'saved')
  if (result.status === 'saved') {
    const read = readInitialPlan(result.session.initialPlan, result.session.recipe, 5000)
    assert.equal(read.status, 'valid')
    assert.match(initialPlanMessage(read), /captured.*comparison is not available/)
    assert.equal(readInitialPlan(result.session.initialPlan, result.session.recipe, 4999).status, 'invalid')
  }
})
test('an existing reserved ID is never a creation target, even at legacy revision zero', async () => {
  const { newSession } = await import('../processingSessions/model.ts')
  let raw = JSON.stringify({ version: 1, sessions: [newSession(displayed().recipe, 'collision')] })
  const repo = createProcessingSessionRepository({ getItem: async () => raw, setItem: async (_, value) => { raw = value } }, () => 100)
  const before = raw
  assert.equal((await createPlanRecording(repo, () => 'collision', () => 100).run(displayed)).status, 'failed')
  assert.equal(raw, before)
})
test('explicit recorded sizing remains distinct from curated sizing and is not actual activity', async () => {
  const { recordedPaceRecipeKey } = await import('../../lib/recordedPace.ts')
  const value = displayed(); value.recipe.curatedActionsPerHour = 60
  value.sizing.rate = { source: 'recorded-explicit', actionsPerHour: 120, recordedEvidence: { recipeKey: recordedPaceRecipeKey(value.recipe), computedAtMs: 50, lookbackDays: 30, sampleCount: 2, totalActions: 120, totalActiveMs: 3600000 } }
  value.sizing.actions = 100
  const repo = createProcessingSessionRepository({ getItem: async () => null, setItem: async () => {} }, () => 100)
  const result = await createPlanRecording(repo, () => 'recorded', () => 100).run(() => value)
  assert.equal(result.status, 'saved')
  if (result.status === 'saved') {
    assert.equal(result.session.actionsCompleted, null)
    assert.equal(result.session.processingEndedAt, null)
    assert.equal(result.session.sales.length, 0)
    assert.equal(result.session.directCoinReceiptsGp, null)
    const plan = result.session.initialPlan as { sizing: { actions: number; rate: { actionsPerHour: number } } }
    assert.equal(plan.sizing.actions, 100)
    assert.equal(plan.sizing.rate.actionsPerHour, 120)
  }
})

test('explicit abandonment releases failed captures and preserves any uncertain committed draft', async () => {
  for (const uncertain of [false, true]) {
    let raw: string | null = null; let fail = true; let ids = 0
    const repo = createProcessingSessionRepository({ getItem: async () => raw, setItem: async (_, value) => { if (!fail || uncertain) raw = value; if (fail) { fail = false; throw Error('disk') } } }, () => 100)
    const action = createPlanRecording(repo, () => `capture-${++ids}`, () => 100)
    assert.equal((await action.run(displayed)).status, 'failed')
    const before = raw
    assert.equal(action.abandon(), true)
    assert.equal(raw, before)
    const current = displayed(); current.quotes[0].unitPriceGp = 20
    current.amounts.cost = 20; current.amounts.profit = 78; current.sizing.cashBudgetGp = 2000
    const result = await action.run(() => current)
    assert.equal(result.status, 'saved')
    if (result.status !== 'saved') continue
    assert.equal(result.session.id, 'capture-2')
    assert.equal((result.session.initialPlan as { quotes: { unitPriceGp: number }[] }).quotes[0].unitPriceGp, 20)
    const loaded = await repo.load(); assert.ok(loaded.ok)
    if (loaded.ok) {
      assert.equal(loaded.sessions.length, uncertain ? 2 : 1)
      if (uncertain) assert.equal((loaded.sessions.find(s => s.id === 'capture-1')!.initialPlan as { quotes: { unitPriceGp: number }[] }).quotes[0].unitPriceGp, 10)
    }
  }
})

test('abandonment is blocked while busy and navigation retries retain the saved ID until abandoned', async () => {
  let raw: string | null = null; let ids = 0; let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const repo = createProcessingSessionRepository({ getItem: async () => { await gate; return raw }, setItem: async (_, value) => { raw = value } }, () => 100)
  const action = createPlanRecording(repo, () => `navigation-${++ids}`, () => 100)
  const pending = action.run(displayed)
  assert.equal(action.abandon(), false)
  release()
  const first = await pending; assert.equal(first.status, 'saved')
  const retried = await action.run(() => { throw Error('navigation failure must not recapture') })
  assert.equal(retried.status, 'saved')
  if (retried.status === 'saved') assert.equal(retried.session.id, 'navigation-1')
  const before = raw
  assert.equal(action.abandon(), true)
  assert.equal(raw, before)
  const next = await action.run(displayed)
  assert.equal(next.status, 'saved')
  if (next.status === 'saved') assert.equal(next.session.id, 'navigation-2')
})
