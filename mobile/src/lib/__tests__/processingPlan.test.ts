import assert from 'node:assert/strict'
import { test } from 'node:test'
import { captureInitialPlan, readInitialPlan, validateNewInitialPlan, type DisplayedPlanInput } from '../processingPlan.ts'
import type { ProcessingSession } from '../processingSessions.ts'
export const recipe: ProcessingSession['recipe'] = { id: 'r', methodKey: 'm', name: 'R', source: null, inputs: [{ itemId: 100, name: 'I', icon: null, qtyPerAction: 2 }], outputs: [{ itemId: 101, name: 'O', icon: null, qtyPerAction: 1 }], coinCostPerAction: 3, coinRevenuePerAction: 1, curatedActionsPerHour: 60 }
export function input(): DisplayedPlanInput {
  return { recipe, quotes: [
    { itemId: 100, qtyPerAction: 2, mode: 'instant', source: 'latest-high', unitPriceGp: 10.5, quoteTradeAtMs: 10, sourceDataUpdatedAtMs: 20, averagePeriod: null, averageSideVolume: null },
    { itemId: 101, qtyPerAction: 1, mode: 'instant', source: 'latest-low', unitPriceGp: 100.5, quoteTradeAtMs: null, sourceDataUpdatedAtMs: 20, averagePeriod: null, averageSideVolume: null },
  ], sizing: { cashBudgetGp: 1000, activeMinutes: 10, actions: 10, rate: { source: 'curated', actionsPerHour: 60, recordedEvidence: null }, mappingLimitActions: null, hasUnknownInputLimit: true }, amounts: { cost: 24, revenue: 101.5, tax: 2, profit: 75.5 } }
}
test('capture copies exact fractional quotes and canonical amounts, read binds ordered recipe', () => {
  const source = input(); const result = captureInitialPlan(source, 100)
  assert.ok(result.ok); if (!result.ok) return
  assert.equal(readInitialPlan(result.plan, recipe, 100).status, 'valid')
  assert.equal(result.plan.outputTaxes[0].taxPerUnitGp, 2)
  source.quotes[0].unitPriceGp = 99
  assert.equal(result.plan.quotes[0].unitPriceGp, 10.5)
  assert.equal(readInitialPlan(result.plan, { ...recipe, inputs: [{ ...recipe.inputs[0], qtyPerAction: 3 }] }, 100).status, 'invalid')
  assert.equal(readInitialPlan(result.plan, recipe, 99).status, 'invalid')
})
test('patient provenance is an average with unknown bounds, never a trade timestamp', () => {
  const value = input(); Object.assign(value.quotes[0], { mode: 'patient', source: '24h-avg-low', quoteTradeAtMs: null, averagePeriod: { windowSeconds: 86400, startAtMs: null, endAtMs: null }, averageSideVolume: 2 })
  assert.ok(captureInitialPlan(value, 100).ok)
  value.quotes[0].quoteTradeAtMs = 1
  assert.equal(captureInitialPlan(value, 100).ok, false)
})
test('missing, unsupported, malformed, unsafe and lossy JSON are explicit', () => {
  assert.equal(readInitialPlan(undefined, recipe, 100).status, 'missing')
  assert.equal(readInitialPlan({ version: 2 }, recipe, 100).status, 'unsupported')
  for (const change of [NaN, Infinity, undefined, () => 1, -1, Number.MAX_SAFE_INTEGER]) {
    const value = input(); value.quotes[0].unitPriceGp = change as number
    assert.equal(captureInitialPlan(value, 100).ok, false)
  }
  const value = input(); Object.defineProperty(value.quotes[0], 'extra', { enumerable: true, get() { throw Error('must not run') } })
  assert.equal(captureInitialPlan(value, 100).ok, false)
  assert.equal(captureInitialPlan({ ...input(), quotes: [] }, 100).ok, false)
})
test('null rate/actions and signed profit are valid, unsafe batch products are rejected', () => {
  const value = input(); value.sizing.rate = null; value.sizing.actions = null
  assert.ok(captureInitialPlan(value, 100).ok)
  value.quotes[1].unitPriceGp = 1; value.amounts = { cost: 24, revenue: 2, tax: 0, profit: -22 }
  assert.ok(captureInitialPlan(value, 100).ok)
  value.sizing.actions = Number.MAX_SAFE_INTEGER
  assert.equal(captureInitialPlan(value, 100).ok, false)
})

test('recorded rate captures only actual summary counters and reconciles the selected rate', async () => {
  const { recordedPaceRecipeKey } = await import('../recordedPace.ts')
  const value = input()
  value.sizing.rate = { source: 'recorded-explicit', actionsPerHour: 60, recordedEvidence: { recipeKey: recordedPaceRecipeKey(recipe), computedAtMs: 50, lookbackDays: 30, sampleCount: 2, totalActions: 60, totalActiveMs: 3_600_000 } }
  assert.ok(captureInitialPlan(value, 100).ok)
  value.sizing.rate.recordedEvidence!.totalActions++
  assert.equal(captureInitialPlan(value, 100).ok, false)
})
test('strict JSON rejects cycles, deep data, oversized text, extended arrays and invalid nullables', () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle
  let deep: unknown = 0; for (let i = 0; i < 14; i++) deep = { deep }
  for (const extra of [cycle, deep, 'x'.repeat(65537), new Date(), { value: undefined }]) {
    assert.equal(captureInitialPlan({ ...input(), extra } as DisplayedPlanInput, 100).ok, false)
  }
  for (const timestamp of [undefined, -1, 101, 0.5, '10']) {
    const value = input(); value.quotes[0].quoteTradeAtMs = timestamp as number
    assert.equal(captureInitialPlan(value, 100).ok, false)
  }
  const zero = input(); zero.sizing.actions = 0; zero.sizing.activeMinutes = 0
  assert.ok(captureInitialPlan(zero, 100).ok)
})

test('ordered quote bindings reject ratio changes even when total cost is unchanged', () => {
  const value = input()
  value.recipe = { ...recipe, inputs: [recipe.inputs[0], { ...recipe.inputs[0], qtyPerAction: 1 }] }
  value.quotes.splice(1, 0, { ...value.quotes[0], qtyPerAction: 1 })
  value.amounts = { ...value.amounts, cost: 34.5, profit: 65 }
  const captured = captureInitialPlan(value, 100); assert.ok(captured.ok); if (!captured.ok) return
  const swapped = { ...value.recipe, inputs: [...value.recipe.inputs].reverse() }
  assert.equal(readInitialPlan(captured.plan, swapped, 100).status, 'invalid')
})

test('trade observations cannot postdate their local cache update', () => {
  const value = input(); value.quotes[0].quoteTradeAtMs = 21
  assert.equal(captureInitialPlan(value, 100).ok, false)
})

test('captured execution identity binds id and method independently and excludes display metadata', () => {
  const captured = captureInitialPlan(input(), 100); assert.ok(captured.ok); if (!captured.ok) return
  for (const changed of [
    { ...recipe, id: 'other' }, { ...recipe, methodKey: 'other-method' },
    { ...recipe, id: 'other', methodKey: 'other-method' },
    { ...recipe, coinCostPerAction: 4, inputs: [{ ...recipe.inputs[0], qtyPerAction: 1 }] },
    { ...recipe, curatedActionsPerHour: 61 },
    { ...recipe, inputs: recipe.outputs, outputs: recipe.inputs },
  ]) assert.equal(readInitialPlan(captured.plan, changed, 100).status, 'invalid')
  assert.equal(readInitialPlan(captured.plan, { ...recipe, name: 'Renamed', source: 'updated', inputs: [{ ...recipe.inputs[0], name: 'New name', icon: 'new' }] }, 100).status, 'valid')
  const unbound = { ...captured.plan }; delete (unbound as Partial<typeof unbound>).recipeExecutionKey
  assert.equal(readInitialPlan(unbound, recipe, 100).status, 'invalid')
})

test('same-amount structural swaps cannot reuse a captured execution binding', () => {
  const value = input()
  value.recipe = { ...recipe, inputs: [{ ...recipe.inputs[0], qtyPerAction: 1 }, { ...recipe.inputs[0], itemId: 102, qtyPerAction: 1 }] }
  value.quotes = [{ ...value.quotes[0], qtyPerAction: 1 }, { ...value.quotes[0], itemId: 102, qtyPerAction: 1 }, value.quotes[1]]
  const captured = captureInitialPlan(value, 100); assert.ok(captured.ok); if (!captured.ok) return
  const swapped = { ...value.recipe, inputs: [...value.recipe.inputs].reverse() }
  const reboundQuotes = { ...captured.plan, quotes: [captured.plan.quotes[1], captured.plan.quotes[0], captured.plan.quotes[2]] }
  assert.equal(readInitialPlan(reboundQuotes, swapped, 100).status, 'invalid')
  assert.throws(() => validateNewInitialPlan(reboundQuotes, swapped, 100), /identity/)
  assert.throws(() => validateNewInitialPlan(captured.plan, value.recipe, 99), /capture time/)
  assert.doesNotThrow(() => validateNewInitialPlan(captured.plan, value.recipe, 100))
})
