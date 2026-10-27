import assert from 'node:assert/strict'
import { test } from 'node:test'
import { example } from '../../components/processingSessions/explanationFixture.ts'
import { captureInitialPlan, readInitialPlan, validateNewInitialPlan, type InitialPlanV1, processingRecipeExecutionKey } from '../processingPlan.ts'
import { compareProcessingPlan } from '../processingPlanComparison.ts'
import type { ProcessingSession } from '../processingSessions.ts'
function fixture(): ProcessingSession {
  const s = example()
  s.outputs[0].item = { ...s.outputs[0].item, itemId: 2 }
  s.recipe = { ...s.recipe, inputs: [{ ...s.inputs[0].item, qtyPerAction: 1 }], outputs: [{ ...s.outputs[0].item, qtyPerAction: 1 }], coinCostPerAction: 100, curatedActionsPerHour: 60 }
  const captured = captureInitialPlan({ recipe: s.recipe, quotes: [900, 2000].map((unitPriceGp, i) => ({ itemId: i + 1, qtyPerAction: 1, mode: 'instant', source: i === 0 ? 'latest-high' : 'latest-low', unitPriceGp, quoteTradeAtMs: null, sourceDataUpdatedAtMs: null, averagePeriod: null, averageSideVolume: null })), sizing: { cashBudgetGp: 120000, activeMinutes: 120, actions: 120, rate: { source: 'curated', actionsPerHour: 60, recordedEvidence: null }, mappingLimitActions: null, hasUnknownInputLimit: true }, amounts: { cost: 1000, revenue: 2000, tax: 40, profit: 960 } }, 1000)
  assert.ok(captured.ok); s.initialPlan = captured.plan
  return s
}
const plan = (s: ProcessingSession) => s.initialPlan as InitialPlanV1
function success(s = fixture()) { const r = compareProcessingPlan(s, 2000); assert.ok(r.ok); return r }
test('same quantity equation, source provenance and frozen input', () => {
  const s = fixture(); const before = JSON.stringify(s)
  function freeze(v: unknown): void { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v) } }
  freeze(s)
  const r = success(s)
  assert.equal(r.actions, 100); assert.equal(r.selectedActions, 120); assert.equal(r.baselineGp, 96000)
  assert.deepEqual(r.terms.map(t => t.signedGp), [-10000, 4000, -80, -2000, 0, -1000])
  assert.equal(r.finalProfitGp, 86920)
  assert.equal(r.baselineGp + r.terms.reduce((n, t) => n + t.signedGp, 0), r.finalProfitGp)
  assert.equal(r.terms.length, 6); assert.equal(JSON.stringify(s), before)
  assert.equal(r.terms[2].sources.find(s => s.sourceId === 'a')!.taxRuleVersion, null)
})
test('missing unsupported invalid and future plan are distinct', () => {
  for (const [raw, reason] of [[undefined, 'plan_missing'], [null, 'plan_invalid'], [{ version: 2 }, 'plan_unsupported'], [{}, 'plan_invalid']] as const) {
    const s = fixture(); s.initialPlan = raw; assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason })
  }
  const s = fixture(); plan(s).capturedAtMs = 3000
  assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'plan_invalid' })
})
test('saved batch zero and unsized rate do not change actual baseline', () => {
  for (const mode of ['zero', 'null']) { const s = fixture(); plan(s).sizing.actions = mode === 'zero' ? 0 : null; plan(s).sizing.activeMinutes = 0; if (mode === 'null') plan(s).sizing.rate = null; assert.equal(success(s).baselineGp, 96000) }
})
test('saved tax decisions survive disagreement with creation tax', () => {
  const s = fixture(); plan(s).outputTaxes[0].taxPerUnitGp = 30; plan(s).amounts.tax = 30; plan(s).amounts.profit = 970
  assert.equal(readInitialPlan(s.initialPlan, s.recipe, 2000).status, 'valid')
  assert.throws(() => validateNewInitialPlan(s.initialPlan, s.recipe, 2000))
  const r = success(s); assert.equal(r.baselineGp, 97000); assert.equal(r.terms[2].signedGp, -1080)
})
test('actual accounting and recorder guards remain authoritative', () => {
  const changes: ((s: ProcessingSession) => void)[] = [s => { s.inputs[0].consumedCostGp = null }, s => { s.processingFeesGp = null }, s => { s.inputs[0].acquiredQty++ }, s => { s.outputs[0].producedQty++ }, s => { s.sales[0].soldAt = 3000 }, s => { Object.assign(s, { recorder: { inputs: [], outputs: [] } }) }]
  for (const change of changes) { const s = fixture(); change(s); assert.equal(compareProcessingPlan(s, 2000).ok, false) }
  const s = fixture(); s.inputs[0].origin = 'already_owned'; s.processingEndedAt = 0; assert.equal(success(s).finalProfitGp, 86920)
})
test('known positive actions and exact recipe quantities required', () => {
  for (const actions of [null, 0]) { const s = fixture(); s.actionsCompleted = actions; assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'actions_required' }) }
  const s = fixture(); s.actionsCompleted = 101; assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'quantity_mismatch' })
  const extra = fixture(); extra.inputs.push({ ...extra.inputs[0], id: 'extra', item: { ...extra.inputs[0].item, itemId: 3 }, acquiredQty: 0, consumedQty: 0, acquisitionCostGp: 0, consumedCostGp: 0 }); assert.equal(compareProcessingPlan(extra, 2000).ok, false)
})
test('fractional quotes require integer realized products without rounding', () => {
  const s = fixture(); plan(s).quotes[0].unitPriceGp = 900.5; plan(s).amounts.cost = 1000.5; plan(s).amounts.profit = 959.5; plan(s).sizing.rate = null; plan(s).sizing.actions = null
  assert.equal(success(s).baselineGp, 95950)
  plan(s).quotes[0].unitPriceGp = 900.001; plan(s).amounts.cost = 1000.001; plan(s).amounts.profit = 2000 - 1000.001 - 40
  assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'arithmetic_unrepresentable' })
})

function rebind(s: ProcessingSession) {
  const p = plan(s); p.recipeExecutionKey = processingRecipeExecutionKey(s.recipe)
  p.sizing.rate = null; p.sizing.actions = null
  p.amounts.cost = s.recipe.coinCostPerAction + s.recipe.inputs.reduce((n, r, i) => n + r.qtyPerAction * p.quotes[i].unitPriceGp, 0)
  p.amounts.revenue = s.recipe.coinRevenuePerAction + s.recipe.outputs.reduce((n, r, i) => n + r.qtyPerAction * p.quotes[s.recipe.inputs.length + i].unitPriceGp, 0)
  p.amounts.tax = s.recipe.outputs.reduce((n, r, i) => n + r.qtyPerAction * p.outputTaxes[i].taxPerUnitGp, 0)
  p.amounts.profit = p.amounts.revenue - p.amounts.cost - p.amounts.tax
}
test('distinct multi-input and co-product whole cohorts use six session terms', () => {
  const s = fixture(); const p = plan(s)
  s.recipe.inputs.push({ ...s.recipe.inputs[0], itemId: 3, qtyPerAction: 2 })
  s.inputs.push({ ...s.inputs[0], id: 'i2', item: { ...s.inputs[0].item, itemId: 3 }, acquiredQty: 200, consumedQty: 200 })
  p.quotes.splice(1, 0, { ...p.quotes[0], itemId: 3, qtyPerAction: 2 })
  s.recipe.outputs.push({ ...s.recipe.outputs[0], itemId: 4 })
  s.outputs.push({ ...s.outputs[0], id: 'o2', item: { ...s.outputs[0].item, itemId: 4 } })
  s.sales.push({ ...s.sales[0], id: 'c', outputId: 'o2', qty: 100, taxGp: 4000 })
  p.quotes.push({ ...p.quotes[2], itemId: 4 }); p.outputTaxes.push({ ...p.outputTaxes[0] }); rebind(s)
  const r = success(s); assert.equal(r.terms.length, 6); assert.equal(r.finalProfitGp, 182920)
  s.outputs[1].producedQty = 90; s.sales[2].qty = 90
  assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'quantity_mismatch' })
})
test('repeated and cross-side items are ambiguous even with valid saved plans', () => {
  const cross = fixture(); cross.recipe.outputs[0].itemId = 1; cross.outputs[0].item.itemId = 1; plan(cross).quotes[1].itemId = 1; rebind(cross)
  assert.deepEqual(compareProcessingPlan(cross, 2000), { ok: false, reason: 'ambiguous_items' })
  const repeated = fixture(); repeated.recipe.inputs.push({ ...repeated.recipe.inputs[0] }); plan(repeated).quotes.splice(1, 0, { ...plan(repeated).quotes[0] }); rebind(repeated)
  assert.deepEqual(compareProcessingPlan(repeated, 2000), { ok: false, reason: 'ambiguous_items' })
})
test('zero and negative quote baselines are valid, with direct coins compared separately', () => {
  for (const price of [1000, 900]) {
    const s = fixture(); plan(s).quotes[1].unitPriceGp = price; plan(s).outputTaxes[0].taxPerUnitGp = 0; rebind(s)
    assert.equal(success(s).baselineGp, (price - 1000) * 100)
  }
  const s = fixture(); s.recipe.coinRevenuePerAction = 10; rebind(s)
  assert.equal(success(s).terms[4].signedGp, -1000)
})
test('overflow of realized products and cancellation intermediates is rejected', () => {
  const s = fixture(); plan(s).quotes[1].unitPriceGp = Number.MAX_SAFE_INTEGER / 2; rebind(s)
  assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'arithmetic_unrepresentable' })
  const c = fixture(); plan(c).quotes[1].unitPriceGp = 80000000000000; c.recipe.coinRevenuePerAction = 80000000000000; rebind(c)
  assert.deepEqual(compareProcessingPlan(c, 2000), { ok: false, reason: 'arithmetic_unrepresentable' })
})
test('binding changes, malformed recorder and complete-but-disagreeing recorder are blocked', () => {
  const s = fixture(); plan(s).quotes.reverse()
  assert.deepEqual(compareProcessingPlan(s, 2000), { ok: false, reason: 'plan_invalid' })
  for (const mode of ['malformed', 'mismatch']) {
    const r = fixture(); const recorder = { inputs: structuredClone(r.inputs), outputs: structuredClone(r.outputs) }
    if (mode === 'mismatch') recorder.inputs[0].consumedCostGp = recorder.inputs[0].consumedCostGp! - 1
    Object.assign(r, { recorder: mode === 'malformed' ? null : recorder })
    assert.deepEqual(compareProcessingPlan(r, 2000), { ok: false, reason: 'actuals_unavailable' })
  }
})
test('source details are bounded and omissions explicit', () => {
  const s = fixture(); s.sales = Array.from({ length: 100 }, (_, i) => ({ ...s.sales[0], id: String(i), qty: 1, taxGp: 40 }))
  const r = success(s)
  assert.equal(r.terms[1].sources.length, 64); assert.equal(r.terms[1].omittedSources, 37)
  assert.equal(r.terms[2].sources.length, 64); assert.equal(r.terms[2].omittedSources, 37)
})
