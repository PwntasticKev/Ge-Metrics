import { validateProcessingSessionLabel } from './processingSessionLabel.ts'

/** Manual actuals only. No catalog, journal, slots, storage, or clock side effects. */
export interface SessionItem { itemId: number; name: string; icon: string | null }
export interface ProcessingSale {
  id: string; outputId: string; qty: number; unitPriceGp: number; soldAt: number
  taxGp: number; taxBasis: 'engine' | 'player_confirmed'; taxRuleVersion: string | null
}
export interface ProcessingSession {
  /** Optional player label; explicit null clears a saved label. */
  label?: string | null
  /** Opaque durable evidence; only processingPlan interprets supported versions. */
  initialPlan?: unknown
  id: string
  status: 'draft' | 'processing' | 'processed' | 'settled'
  recipe: {
    id: string; methodKey: string; name: string; source: string | null
    inputs: (SessionItem & { qtyPerAction: number })[]
    outputs: (SessionItem & { qtyPerAction: number })[]
    coinCostPerAction: number; coinRevenuePerAction: number; curatedActionsPerHour: number | null
  }
  processingStartedAt: number | null
  processingEndedAt: number | null
  /** Set false on recovery of an open timer; only a player confirmation restores pace. */
  elapsedTimeConfirmed: boolean
  pauses: { id: string; startedAt: number; endedAt: number | null; reason: 'ge_wait' | 'break_other' }[]
  externalGeWaits: { id: string; side: 'buy' | 'sell'; startedAt: number; endedAt: number }[]
  actionsCompleted: number | null
  inputs: { id: string; item: SessionItem; acquiredQty: number; consumedQty: number; origin: 'purchased' | 'already_owned'; acquisitionCostGp: number | null; consumedCostGp: number | null; opportunityValueGp: number | null }[]
  outputs: { id: string; item: SessionItem; producedQty: number }[]
  processingFeesGp: number | null; otherExpensesGp: number | null; directCoinReceiptsGp: number | null
  sales: ProcessingSale[]
}
const whole = (n: number) => Number.isSafeInteger(n) && n >= 0
function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) throw new RangeError(message)
}
function amount(n: number) { requireValid(whole(n), 'Expected a nonnegative safe integer'); return n }
function sum(ns: number[]) { return ns.reduce((a, b) => amount(a + b), 0) }
function knownSum(ns: (number | null)[]) { return ns.includes(null) ? null : sum(ns as number[]) }
function ids(rows: { id: string }[]) {
  requireValid(rows.every(r => typeof r.id === 'string' && r.id.length > 0) && new Set(rows.map(r => r.id)).size === rows.length, 'Missing or duplicate row ID')
}
function itemValid(item: SessionItem) { requireValid(whole(item.itemId) && item.itemId > 0 && typeof item.name === 'string' && (item.icon === null || typeof item.icon === 'string'), 'Invalid item') }
/** Call once for each completed price tranche, injecting @ge/engine geTax. Never recompute saved sales. */
export function snapshotProcessingSale(sale: Omit<ProcessingSale, 'taxGp' | 'taxBasis'>, itemId: number, geTax: (price: number, itemId: number) => number): ProcessingSale {
  amount(sale.qty); amount(sale.unitPriceGp); amount(sale.soldAt); amount(itemId)
  const taxGp = amount(amount(geTax(sale.unitPriceGp, itemId)) * sale.qty)
  requireValid(taxGp <= amount(sale.qty * sale.unitPriceGp), 'Tax exceeds sale proceeds')
  return { ...sale, taxGp, taxBasis: 'engine' }
}
/** Throws RangeError for invalid manual records. now is explicit, used only for open timers. */
export function deriveProcessingSession(s: ProcessingSession, now?: number) {
  validateProcessingSessionLabel(s)
  requireValid(typeof s.id === 'string' && s.id.length > 0 && ['draft', 'processing', 'processed', 'settled'].includes(s.status), 'Invalid session')
  requireValid(typeof s.elapsedTimeConfirmed === 'boolean', 'Missing elapsed confirmation')
  for (const n of [s.actionsCompleted, s.processingFeesGp, s.otherExpensesGp, s.directCoinReceiptsGp, s.processingStartedAt, s.processingEndedAt]) if (n !== null) amount(n)
  if (now !== undefined) amount(now)
  for (const rows of [s.inputs, s.outputs, s.sales, s.pauses, s.externalGeWaits]) ids(rows)
  for (const row of [...s.recipe.inputs, ...s.recipe.outputs]) { itemValid(row); amount(row.qtyPerAction) }
  amount(s.recipe.coinCostPerAction); amount(s.recipe.coinRevenuePerAction)
  requireValid(s.recipe.curatedActionsPerHour === null || (Number.isFinite(s.recipe.curatedActionsPerHour) && s.recipe.curatedActionsPerHour > 0), 'Invalid curated rate')
  const unusedInputs = s.inputs.map(i => {
    itemValid(i.item); amount(i.acquiredQty); amount(i.consumedQty)
    requireValid(['purchased', 'already_owned'].includes(i.origin) && i.consumedQty <= i.acquiredQty, 'Invalid consumption')
    for (const n of [i.acquisitionCostGp, i.consumedCostGp, i.opportunityValueGp]) if (n !== null) amount(n)
    requireValid(i.acquisitionCostGp === null || i.consumedCostGp === null || i.consumedCostGp <= i.acquisitionCostGp, 'Consumed cost exceeds acquisition cost')
    requireValid(i.acquisitionCostGp === null || i.consumedCostGp === null || i.consumedQty !== i.acquiredQty || i.consumedCostGp === i.acquisitionCostGp, 'Fully consumed input must consume its acquisition cost')
    requireValid(i.consumedQty !== 0 || [i.consumedCostGp, i.opportunityValueGp].every(n => n === null || n === 0), 'Unconsumed input cannot carry consumed value')
    return { inputId: i.id, qty: i.acquiredQty - i.consumedQty, historicalCostGp: i.acquisitionCostGp === null || i.consumedCostGp === null ? null : i.acquisitionCostGp - i.consumedCostGp }
  })
  const netSales: number[] = []
  const sold = new Map<string, number>()
  for (const sale of s.sales) {
    for (const n of [sale.qty, sale.unitPriceGp, sale.soldAt, sale.taxGp]) amount(n)
    requireValid(sale.qty > 0 && s.outputs.some(o => o.id === sale.outputId) && ['engine', 'player_confirmed'].includes(sale.taxBasis), 'Invalid sale')
    const gross = amount(sale.qty * sale.unitPriceGp)
    requireValid(sale.taxGp <= gross, 'Tax exceeds sale proceeds')
    netSales.push(gross - sale.taxGp); sold.set(sale.outputId, sum([sold.get(sale.outputId) ?? 0, sale.qty]))
  }
  const unsoldOutputs = s.outputs.map(o => {
    itemValid(o.item); amount(o.producedQty)
    const qty = o.producedQty - (sold.get(o.id) ?? 0)
    requireValid(qty >= 0, 'Sales exceed output produced')
    return { outputId: o.id, qty }
  })
  const start = s.processingStartedAt
  const end = s.processingEndedAt ?? now ?? null
  requireValid(s.processingEndedAt === null || start !== null, 'End requires start')
  if (start !== null && end !== null) requireValid(end >= start, 'End precedes start')
  requireValid(s.status !== 'draft' || (start === null && s.processingEndedAt === null), 'Draft session cannot have processing timestamps')
  requireValid(s.status !== 'processing' || s.processingEndedAt === null, 'Processing session cannot have an end')
  requireValid(s.status === 'draft' || start !== null, 'Started session requires start')
  requireValid(!['processed', 'settled'].includes(s.status) || s.processingEndedAt !== null, 'Finished session requires end')
  const intervals: { start: number; end: number }[] = []
  const pauses: number[] = []; const waits: number[] = []
  let open = 0
  for (const p of s.pauses) {
    amount(p.startedAt); if (p.endedAt !== null) amount(p.endedAt)
    requireValid(['ge_wait', 'break_other'].includes(p.reason) && start !== null && p.startedAt >= start, 'Invalid pause')
    if (p.endedAt === null) { open++; requireValid(s.processingEndedAt === null, 'Finished session has open pause') }
    const stop = p.endedAt ?? end
    requireValid(stop === null || stop >= p.startedAt, 'Pause ends before start')
    requireValid(end === null || (p.startedAt <= end && (stop === null || stop <= end)), 'Pause outside processing')
    intervals.push({ start: p.startedAt, end: stop ?? Number.MAX_SAFE_INTEGER })
    if (stop !== null) { pauses.push(stop - p.startedAt); if (p.reason === 'ge_wait') waits.push(stop - p.startedAt) }
  }
  requireValid(open <= 1, 'Multiple open pauses')
  const external: { start: number; end: number }[] = []
  for (const w of s.externalGeWaits) {
    amount(w.startedAt); amount(w.endedAt)
    requireValid(['buy', 'sell'].includes(w.side) && w.endedAt >= w.startedAt, 'Invalid GE wait')
    requireValid(start === null || w.endedAt <= start || (s.processingEndedAt !== null && w.startedAt >= s.processingEndedAt), 'External wait overlaps processing')
    external.push({ start: w.startedAt, end: w.endedAt }); waits.push(w.endedAt - w.startedAt)
  }
  for (const rows of [intervals, external]) {
    rows.sort((a, b) => a.start - b.start)
    for (let i = 1; i < rows.length; i++) requireValid(rows[i].start >= rows[i - 1].end, 'Overlapping intervals')
  }
  const elapsedMs = start === null || end === null ? null : end - start
  const pausedMs = end === null ? null : sum(pauses)
  const activeMs = !s.elapsedTimeConfirmed || elapsedMs === null || pausedMs === null ? null : amount(elapsedMs - pausedMs)
  const netSoldCashGp = sum(netSales)
  const extras = [s.processingFeesGp, s.otherExpensesGp]
  const cashOutlayGp = knownSum([...s.inputs.filter(i => i.origin === 'purchased').map(i => i.acquisitionCostGp), ...extras])
  const consumedHistoricalCostGp = knownSum([...s.inputs.map(i => i.consumedCostGp), ...extras])
  const opportunityCostGp = knownSum([...s.inputs.map(i => i.opportunityValueGp), ...extras])
  const inventoryResolved = [...unusedInputs, ...unsoldOutputs].every(i => i.qty === 0)
  const finished = ['processed', 'settled'].includes(s.status) && s.processingEndedAt !== null && s.elapsedTimeConfirmed
  const costsConfirmed = [...s.inputs.flatMap(i => [i.acquisitionCostGp, i.consumedCostGp]), ...extras, s.directCoinReceiptsGp].every(n => n !== null)
  const canSettle = finished && inventoryResolved && costsConfirmed
  requireValid(s.status !== 'settled' || canSettle, 'Session cannot settle with inventory or unconfirmed accounting/timing')
  const receipts = s.directCoinReceiptsGp === null ? null : sum([netSoldCashGp, s.directCoinReceiptsGp])
  return {
    activeMs, pausedMs, elapsedMs, geWaitMs: sum(waits), totalElapsedMs: elapsedMs === null ? null : sum([elapsedMs, ...external.map(w => w.end - w.start)]),
    requiresElapsedConfirmation: !s.elapsedTimeConfirmed,
    actionsPerHour: activeMs && s.actionsCompleted !== null ? s.actionsCompleted * 3_600_000 / activeMs : null,
    outputPerHour: s.outputs.map(o => ({ outputId: o.id, qtyPerHour: activeMs ? o.producedQty * 3_600_000 / activeMs : null })),
    netSoldCashGp, directCoinReceiptsGp: s.directCoinReceiptsGp, cashOutlayGp, consumedHistoricalCostGp,
    cashMovementGp: receipts === null || cashOutlayGp === null ? null : receipts - cashOutlayGp,
    unusedInputs, unsoldOutputs, inventoryResolved, canSettle,
    finalProfitGp: canSettle && receipts !== null && consumedHistoricalCostGp !== null ? receipts - consumedHistoricalCostGp : null,
    opportunityCostGp,
    opportunityProfitGp: finished && inventoryResolved && receipts !== null && opportunityCostGp !== null ? receipts - opportunityCostGp : null
  }
}
