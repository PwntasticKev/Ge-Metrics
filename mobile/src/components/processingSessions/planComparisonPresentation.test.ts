import assert from 'node:assert/strict'
import { test } from 'node:test'
import { comparisonPresentation, comparisonScope, comparisonSource } from './planComparisonPresentation.ts'
import { example } from './explanationFixture.ts'
import type { compareProcessingPlan } from '../../lib/processingPlanComparison.ts'
type Result = ReturnType<typeof compareProcessingPlan>
test('every unavailable reason has specific read-only guidance', () => {
  const reasons = ['plan_missing', 'plan_unsupported', 'plan_invalid', 'actuals_unavailable', 'actions_required', 'ambiguous_items', 'quantity_mismatch', 'arithmetic_unrepresentable'] as const
  const messages = reasons.map(reason => (() => { const data = comparisonPresentation({ ok: false, reason }, example()); assert.equal(data.ok, false); if (data.ok) throw new Error('Expected unavailable'); return data.message })())
  assert.equal(new Set(messages).size, reasons.length)
  assert.match(messages[3], /complete|confirmed/)
  assert.match(messages[5], /ambiguous/)
})
test('scope distinguishes zero selection and unsized without a currency effect', () => {
  assert.match(comparisonScope(100, 0), /Saved selection: 0 actions; recorded: 100/)
  assert.match(comparisonScope(100, null), /unsized/)
  assert.doesNotMatch(comparisonScope(100, 120), /GP|time/)
})
test('render data uses signed full GP and historical valuation wording for all six terms', () => {
  const result: Result = { ok: true, actions: 100, selectedActions: 120, baselineGp: 96000, finalProfitGp: 86920, terms: [
    { kind: 'input_historical_valuation', signedGp: -10000, sources: [], omittedSources: 2 },
    { kind: 'gross_sold_price', signedGp: 4000, sources: [], omittedSources: 0 },
    { kind: 'saved_sale_tax', signedGp: -80, sources: [], omittedSources: 0 },
    { kind: 'processing_fee', signedGp: -2000, sources: [], omittedSources: 0 },
    { kind: 'direct_coin', signedGp: 0, sources: [], omittedSources: 0 },
    { kind: 'other_expenses_excluded_model', signedGp: -1000, sources: [], omittedSources: 0 },
  ] }
  const data = comparisonPresentation(result, example())
  assert.ok(data.ok)
  assert.equal(data.baseline, '+96,000 GP'); assert.equal(data.finalProfit, '+86,920 GP')
  assert.match(data.rows[0].label, /historical valuation/)
  assert.equal(data.rows[0].value, '−10,000 GP'); assert.equal(data.rows[4].value, '+0 GP')
  assert.deepEqual(data.rows[0].sources, ['2 additional source rows omitted.'])
  assert.match(data.rows[5].label, /excluded from quote model/)
})
test('sources preserve fractional quotes, zero actuals, tax basis and unknown version with bounded identity', () => {
  const s = example()
  const text = comparisonSource({ sourceId: 'x'.repeat(300), itemId: 1, quantity: 100, savedUnitGp: 900.001, actualGp: 0, taxBasis: 'player_confirmed', taxRuleVersion: null }, s)
  assert.match(comparisonSource({ sourceId: 'tiny', savedUnitGp: 1e-25 }, s), /1e-25 GP/)
  assert.match(text, /900\.001 GP/); assert.match(text, /actual 0 GP/)
  assert.match(text, /player_confirmed/); assert.match(text, /version unknown/)
  assert.ok(!text.includes('x'.repeat(257)))
  assert.match(comparisonSource({ sourceId: 'tax', taxBasis: 'engine', taxRuleVersion: 'saved-v1' }, s), /saved-v1/)
  assert.match(comparisonSource({ sourceId: 'row', itemId: 999 }, s), /Item 999/)
})
