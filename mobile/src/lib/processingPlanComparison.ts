import { readInitialPlan } from './processingPlan.ts'
import { explainProcessingSession } from './processingExplanation.ts'
import { deriveProcessingSession, type ProcessingSession } from './processingSessions.ts'

type ComparisonReason = 'plan_missing' | 'plan_unsupported' | 'plan_invalid' | 'actuals_unavailable' | 'actions_required' | 'ambiguous_items' | 'quantity_mismatch' | 'arithmetic_unrepresentable'
type TermKind = 'input_historical_valuation' | 'gross_sold_price' | 'saved_sale_tax' | 'processing_fee' | 'direct_coin' | 'other_expenses_excluded_model'
type Source = { sourceId: string; itemId?: number; quoteIndex?: number; quantity?: number; savedUnitGp?: number; actualGp?: number; origin?: 'purchased' | 'already_owned'; taxBasis?: 'engine' | 'player_confirmed'; taxRuleVersion?: string | null }
type Term = { kind: TermKind; signedGp: number; sources: Source[]; omittedSources: number }
type Comparison = { ok: true; actions: number; selectedActions: number | null; baselineGp: number; terms: Term[]; finalProfitGp: number } | { ok: false; reason: ComparisonReason }
const integer = (n: number): number => { if (!Number.isSafeInteger(n)) throw new RangeError('Unrepresentable comparison'); return n }
const sum = (ns: number[]) => ns.reduce((a, b) => integer(a + integer(b)), 0)
const product = (a: number, b: number) => integer(a * b)
const bounded = (value: string) => value.slice(0, 256)
function term(kind: TermKind, signedGp: number, sources: Source[]): Term {
  return { kind, signedGp: integer(signedGp), sources: sources.slice(0, 64), omittedSources: Math.max(0, sources.length - 64) }
}
/** Same realized cohort, saved unit assumptions. No allocation or causal attribution.
 * The committed-record adapter must reject conflicting raw copies before calling this
 * helper: a single supplied session cannot establish raw-record uniqueness.
 */
export function compareProcessingPlan(s: ProcessingSession, nowMs: number): Comparison {
  const unavailable = (reason: ComparisonReason): Comparison => ({ ok: false, reason })
  const read = readInitialPlan(s.initialPlan, s.recipe, nowMs)
  if (read.status !== 'valid') return unavailable(read.status === 'missing' ? 'plan_missing' : read.status === 'unsupported' ? 'plan_unsupported' : 'plan_invalid')
  const explanation = explainProcessingSession(s, nowMs)
  if (!explanation.ok) return unavailable('actuals_unavailable')
  const actions = s.actionsCompleted
  if (actions === null || !Number.isSafeInteger(actions) || actions <= 0) return unavailable('actions_required')
  const p = read.plan
  const recipeItems = [...s.recipe.inputs, ...s.recipe.outputs].map(r => r.itemId)
  const actualItems = [...s.inputs, ...s.outputs].map(r => r.item.itemId)
  if (new Set(recipeItems).size !== recipeItems.length || new Set(actualItems).size !== actualItems.length) return unavailable('ambiguous_items')
  if (s.inputs.length !== s.recipe.inputs.length || s.outputs.length !== s.recipe.outputs.length) return unavailable('quantity_mismatch')
  try {
    const inputSources: Source[] = []; const outputSources: Source[] = []
    const inputQuotes: number[] = []; const outputQuotes: number[] = []; const taxQuotes: number[] = []
    for (const [index, leg] of s.recipe.inputs.entries()) {
      const row = s.inputs.find(r => r.item.itemId === leg.itemId)
      const qty = product(actions, leg.qtyPerAction)
      if (!row || row.consumedQty !== qty || row.acquiredQty !== qty) return unavailable('quantity_mismatch')
      const q = p.quotes[index]; inputQuotes.push(product(qty, q.unitPriceGp))
      inputSources.push({ sourceId: bounded(row.id), itemId: leg.itemId, quoteIndex: index, quantity: qty, savedUnitGp: q.unitPriceGp, actualGp: row.consumedCostGp!, origin: row.origin })
    }
    for (const [index, leg] of s.recipe.outputs.entries()) {
      const row = s.outputs.find(r => r.item.itemId === leg.itemId)
      const qty = product(actions, leg.qtyPerAction)
      if (!row || row.producedQty !== qty || sum(s.sales.filter(r => r.outputId === row.id).map(r => r.qty)) !== qty) return unavailable('quantity_mismatch')
      const quoteIndex = s.recipe.inputs.length + index; const q = p.quotes[quoteIndex]
      outputQuotes.push(product(qty, q.unitPriceGp)); taxQuotes.push(product(qty, p.outputTaxes[index].taxPerUnitGp))
      outputSources.push({ sourceId: bounded(row.id), itemId: leg.itemId, quoteIndex, quantity: qty, savedUnitGp: q.unitPriceGp })
    }
    const iq = sum(inputQuotes); const oq = sum(outputQuotes); const tq = sum(taxQuotes)
    const fq = product(actions, s.recipe.coinCostPerAction); const cq = product(actions, s.recipe.coinRevenuePerAction)
    const inputs = sum(s.inputs.map(r => r.consumedCostGp!))
    const gross = sum(s.sales.map(r => product(r.qty, r.unitPriceGp))); const tax = sum(s.sales.map(r => r.taxGp))
    const actual = deriveProcessingSession(s, nowMs)
    if (integer(gross - tax) !== actual.netSoldCashGp || sum([inputs, s.processingFeesGp!, s.otherExpensesGp!]) !== actual.consumedHistoricalCostGp) return unavailable('actuals_unavailable')
    const baselineGp = sum([oq, cq, -tq, -iq, -fq])
    const salesSources: Source[] = s.sales.map(r => ({ sourceId: bounded(r.id), itemId: s.outputs.find(o => o.id === r.outputId)!.item.itemId, quantity: r.qty, actualGp: product(r.qty, r.unitPriceGp) }))
    const taxSources: Source[] = s.sales.map(r => ({ sourceId: bounded(r.id), quantity: r.qty, actualGp: r.taxGp, taxBasis: r.taxBasis, taxRuleVersion: r.taxRuleVersion === null ? null : bounded(r.taxRuleVersion) }))
    const terms = [
      term('input_historical_valuation', integer(iq - inputs), inputSources),
      term('gross_sold_price', integer(gross - oq), [...outputSources, ...salesSources]),
      term('saved_sale_tax', integer(tq - tax), [...s.recipe.outputs.map((r, i) => ({ sourceId: bounded(s.outputs.find(o => o.item.itemId === r.itemId)!.id), quoteIndex: s.recipe.inputs.length + i, quantity: product(actions, r.qtyPerAction), savedUnitGp: p.outputTaxes[i].taxPerUnitGp })), ...taxSources]),
      term('processing_fee', integer(fq - s.processingFeesGp!), [{ sourceId: 'processingFeesGp', quantity: actions, savedUnitGp: s.recipe.coinCostPerAction, actualGp: s.processingFeesGp! }]),
      term('direct_coin', integer(s.directCoinReceiptsGp! - cq), [{ sourceId: 'directCoinReceiptsGp', quantity: actions, savedUnitGp: s.recipe.coinRevenuePerAction, actualGp: s.directCoinReceiptsGp! }]),
      term('other_expenses_excluded_model', -s.otherExpensesGp!, [{ sourceId: 'otherExpensesGp', actualGp: s.otherExpensesGp! }]),
    ]
    const finalProfitGp = sum([baselineGp, ...terms.map(t => t.signedGp)])
    if (finalProfitGp !== actual.finalProfitGp || finalProfitGp !== explanation.finalProfitGp) return unavailable('actuals_unavailable')
    return { ok: true, actions, selectedActions: p.sizing.actions, baselineGp, terms, finalProfitGp }
  } catch { return unavailable('arithmetic_unrepresentable') }
}
