import { deriveProcessingSession, type ProcessingSession } from './processingSessions.ts'
import { validateRecorderExtension } from '../components/processingSessions/validation.ts'

export type ProfitTerm = { label: string; signedGp: number; sources: string[] }
export type ProfitExplanation = { ok: true; terms: ProfitTerm[]; finalProfitGp: number } | { ok: false; reason: string }
const safeSum = (values: number[]) => values.reduce((a, b) => {
  const n = a + b
  if (!Number.isSafeInteger(n)) throw new RangeError('Unsafe explanation total')
  return n
}, 0)
/** Saved actuals only. The accounting core remains the final-profit authority. */
export function explainProcessingSession(s: ProcessingSession, now: number): ProfitExplanation {
  try {
    validateRecorderExtension(s)
    if (Object.hasOwn(s, 'recorder')) {
      const recorder = (s as ProcessingSession & { recorder: { inputs: ProcessingSession['inputs']; outputs: ProcessingSession['outputs'] } }).recorder
      for (const key of ['inputs', 'outputs'] as const) {
        if (recorder[key].length !== s[key].length) throw new Error('Review incomplete actuals')
        for (const row of recorder[key]) {
          const core = s[key].find(r => r.id === row.id)
          if (!core) throw new Error('Review actuals')
          // Compare all confirmed accounting and item fields, independent of retained JSON fields.
          for (const field of key === 'inputs' ? ['acquiredQty', 'consumedQty', 'origin', 'acquisitionCostGp', 'consumedCostGp', 'opportunityValueGp'] : ['producedQty']) {
            if ((row as unknown as Record<string, unknown>)[field] !== (core as unknown as Record<string, unknown>)[field]) throw new Error('Review actuals')
          }
          if (row.item.itemId !== core.item.itemId || row.item.name !== core.item.name || row.item.icon !== core.item.icon) throw new Error('Review actuals')
        }
      }
    }
    const timestamps = [s.processingStartedAt, s.processingEndedAt, ...s.sales.map(r => r.soldAt), ...s.pauses.flatMap(r => [r.startedAt, r.endedAt]), ...s.externalGeWaits.flatMap(r => [r.startedAt, r.endedAt])]
    if (!Number.isSafeInteger(now) || now < 0 || timestamps.some(t => t !== null && t > now)) throw new Error('Invalid saved time')
    const d = deriveProcessingSession(s, now)
    if (d.finalProfitGp === null) return { ok: false, reason: 'Review actuals: final profit needs confirmed accounting, timing and resolved inventory.' }
    if (s.sales.some(r => r.taxRuleVersion !== null && typeof r.taxRuleVersion !== 'string')) throw new Error('Invalid saved tax provenance')
    const gross = safeSum(s.sales.map(r => r.qty * r.unitPriceGp))
    const tax = safeSum(s.sales.map(r => r.taxGp))
    const inputs = safeSum(s.inputs.map(r => r.consumedCostGp!))
    if (gross - tax !== d.netSoldCashGp || safeSum([inputs, s.processingFeesGp!, s.otherExpensesGp!]) !== d.consumedHistoricalCostGp) throw new Error('Totals disagree')
    const terms: ProfitTerm[] = [
      { label: 'Gross sold receipts', signedGp: gross, sources: s.sales.map(r => `${s.outputs.find(o => o.id === r.outputId)!.item.name} · tranche ${r.id}: ${r.qty} × ${r.unitPriceGp} GP = ${r.qty * r.unitPriceGp} GP`) },
      { label: 'Direct coin receipts', signedGp: s.directCoinReceiptsGp!, sources: ['Saved direct coin receipts; separate from GE sales.'] },
      { label: 'Saved sale tax', signedGp: -tax, sources: s.sales.map(r => `Tranche ${r.id}: ${r.taxGp} GP · saved ${r.taxBasis === 'engine' ? 'engine-calculated' : 'player-confirmed'} tax · ${r.taxRuleVersion == null ? 'rule version unknown' : `rule version ${r.taxRuleVersion}`}`) },
      { label: 'Consumed input historical cost', signedGp: -inputs, sources: s.inputs.map(r => `${r.item.name} · ${r.id}: ${r.consumedQty} consumed · ${r.consumedCostGp} GP assigned historical cost · ${r.origin === 'already_owned' ? 'already owned' : 'purchased'}`) },
      { label: 'Processing fees', signedGp: -s.processingFeesGp!, sources: ['Saved processing fees.'] },
      { label: 'Other expenses', signedGp: -s.otherExpensesGp!, sources: ['Saved other expenses.'] },
    ]
    if (safeSum(terms.map(t => t.signedGp)) !== d.finalProfitGp) throw new Error('Totals disagree')
    return { ok: true, terms, finalProfitGp: d.finalProfitGp }
  } catch { return { ok: false, reason: 'Review actuals: saved source rows are incomplete, inconsistent or invalid.' } }
}
