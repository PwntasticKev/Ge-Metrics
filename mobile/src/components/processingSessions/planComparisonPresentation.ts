import type { compareProcessingPlan } from '../../lib/processingPlanComparison.ts'
import type { ProcessingSession } from '../../lib/processingSessions.ts'
type Result = ReturnType<typeof compareProcessingPlan>
type Available = Extract<Result, { ok: true }>
type Source = Available['terms'][number]['sources'][number]
const number = (n: number) => Number.isInteger(n) ? n.toLocaleString('en-US') : String(n)
const signed = (n: number) => `${n < 0 ? '−' : '+'}${number(Math.abs(n))} GP`
const bounded = (s: string) => s.slice(0, 256)
const reasons: Record<Extract<Result, { ok: false }>['reason'], string> = {
  plan_missing: 'No original quote plan was saved. Older sessions are not backfilled.',
  plan_unsupported: 'The saved quote plan uses an unsupported version.',
  plan_invalid: 'The saved quote plan could not be validated.',
  actuals_unavailable: 'Comparison needs complete, confirmed actuals with all acquired inputs consumed and all outputs sold.',
  actions_required: 'Comparison needs a known positive recorded action count; it cannot be inferred.',
  ambiguous_items: 'Repeated or cross-side item identities are ambiguous for this comparison.',
  quantity_mismatch: 'Recorded items and quantities must match the saved recipe at the recorded action count.',
  arithmetic_unrepresentable: 'This comparison cannot be represented exactly in safe whole GP; saved quotes are not rounded.',
}
const labels: Record<Available['terms'][number]['kind'], string> = {
  input_historical_valuation: 'Input historical valuation difference',
  gross_sold_price: 'Gross sold-price difference',
  saved_sale_tax: 'Saved sale-tax difference',
  processing_fee: 'Processing-fee difference',
  direct_coin: 'Direct-coin difference',
  other_expenses_excluded_model: 'Other recorded expenses (excluded from quote model)',
}
export function comparisonScope(actions: number, selectedActions: number | null) {
  return `Saved selection: ${selectedActions === null ? 'unsized (no action count)' : `${number(selectedActions)} actions`}; recorded: ${number(actions)}. Baseline applies saved unit assumptions to the recorded ${number(actions)}-action cohort. Selection size is context only.`
}
export function comparisonSource(source: Source, session: ProcessingSession): string {
  const parts = [`Source ${bounded(source.sourceId)}`]
  if (source.itemId !== undefined) {
    const candidates = [...session.recipe.inputs, ...session.recipe.outputs, ...session.inputs.map(r => r.item), ...session.outputs.map(r => r.item)].filter(r => r.itemId === source.itemId)
    const names = [...new Set(candidates.map(r => r.name))]
    parts.push(names.length === 1 ? `${bounded(names[0])} (item ${source.itemId})` : `Item ${source.itemId}`)
  }
  if (source.quoteIndex !== undefined) parts.push(`saved quote ${source.quoteIndex + 1}`)
  if (source.quantity !== undefined) parts.push(`quantity ${number(source.quantity)}`)
  if (source.savedUnitGp !== undefined) parts.push(`saved unit ${number(source.savedUnitGp)} GP`)
  if (source.actualGp !== undefined) parts.push(`actual ${number(source.actualGp)} GP`)
  if (source.origin) parts.push(source.origin === 'already_owned' ? 'already owned; assigned historical valuation' : 'purchased; assigned historical valuation')
  if (source.taxBasis !== undefined) parts.push(`saved tax basis ${source.taxBasis}; rule version ${source.taxRuleVersion == null ? 'unknown' : bounded(source.taxRuleVersion)}`)
  return parts.join(' · ')
}
export function comparisonPresentation(result: Result, session: ProcessingSession) {
  if (!result.ok) return { ok: false as const, message: reasons[result.reason] }
  return { ok: true as const, scope: comparisonScope(result.actions, result.selectedActions), baseline: signed(result.baselineGp), baselineNegative: result.baselineGp < 0, finalProfit: signed(result.finalProfitGp), finalProfitNegative: result.finalProfitGp < 0, rows: result.terms.map(t => ({
    label: labels[t.kind], value: signed(t.signedGp), negative: t.signedGp < 0,
    sources: [...t.sources.map(s => comparisonSource(s, session)), ...(t.omittedSources ? [`${t.omittedSources} additional source rows omitted.`] : t.sources.length ? [] : ['No saved source rows.'])],
  })) }
}
