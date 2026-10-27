import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveProcessingSession, snapshotProcessingSale, type ProcessingSession } from '../processingSessions.ts'
const enginePath = '../../../../src/domain/flipping/geTax.js'
const { geTax } = await import(enginePath) as { geTax: (price: number, itemId: number) => number }
const item = { itemId: 2353, name: 'Bar', icon: null }
function session(): ProcessingSession {
  return {
    id: 's', status: 'processed', recipe: { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [{ ...item, qtyPerAction: 1 }], outputs: [{ ...item, qtyPerAction: 1 }], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null },
    processingStartedAt: 0, processingEndedAt: 1000, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: 100,
    inputs: [{ id: 'i', item, acquiredQty: 100, consumedQty: 100, origin: 'purchased', acquisitionCostGp: 100, consumedCostGp: 100, opportunityValueGp: 150 }],
    outputs: [{ id: 'o', item, producedQty: 100 }], processingFeesGp: 0, otherExpensesGp: 0, directCoinReceiptsGp: 0,
    sales: [{ id: 'sale', outputId: 'o', qty: 100, unitPriceGp: 10, soldAt: 1000, taxGp: 0, taxBasis: 'player_confirmed', taxRuleVersion: null }]
  }
}
test('settled historical and opportunity accounting replace one another', () => {
  const d = deriveProcessingSession(session())
  assert.equal(d.finalProfitGp, 900)
  assert.equal(d.opportunityProfitGp, 850)
  assert.equal(d.cashOutlayGp, 100)
})
test('partial processing and sales retain inventory without allocating joint cost', () => {
  const s = session(); s.inputs[0].consumedQty = 60; s.inputs[0].consumedCostGp = 60; s.sales[0].qty = 30
  const d = deriveProcessingSession(s)
  assert.equal(d.unusedInputs[0].qty, 40); assert.equal(d.unsoldOutputs[0].qty, 70)
  assert.equal(d.consumedHistoricalCostGp, 60); assert.equal(d.finalProfitGp, null)
  s.status = 'settled'; assert.throws(() => deriveProcessingSession(s))
})
test('owned unknown cost remains unknown even with an opportunity value', () => {
  const s = session(); s.inputs[0].origin = 'already_owned'; s.inputs[0].consumedCostGp = null; s.inputs[0].acquisitionCostGp = null
  assert.equal(deriveProcessingSession(s).finalProfitGp, null)
  assert.equal(deriveProcessingSession(s).cashOutlayGp, 0)
})
test('invalid quantities, oversales, duplicate IDs and unsafe totals reject', () => {
  for (const qty of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, 101]) {
    const s = session(); s.inputs[0].consumedQty = qty; assert.throws(() => deriveProcessingSession(s))
  }
  const s = session(); s.outputs[0].producedQty = 99; assert.throws(() => deriveProcessingSession(s))
  s.outputs[0].producedQty = 100; s.sales.push({ ...s.sales[0] }); assert.throws(() => deriveProcessingSession(s))
  s.sales.pop(); s.sales[0].unitPriceGp = Number.MAX_SAFE_INTEGER; assert.throws(() => deriveProcessingSession(s))
})
test('timing excludes pauses and recovery requires explicit confirmation', () => {
  const s = session(); s.pauses = [{ id: 'p', startedAt: 100, endedAt: 400, reason: 'ge_wait' }]
  s.externalGeWaits = [{ id: 'w', startedAt: 1000, endedAt: 1200, side: 'sell' }]
  assert.equal(deriveProcessingSession(s).activeMs, 700); assert.equal(deriveProcessingSession(s).geWaitMs, 500)
  s.externalGeWaits = []; s.processingEndedAt = null; s.status = 'processing'; s.elapsedTimeConfirmed = false
  assert.equal(deriveProcessingSession(s, 2000).activeMs, null)
  assert.equal(deriveProcessingSession(s, 2000).actionsPerHour, null)
  s.elapsedTimeConfirmed = true; assert.equal(deriveProcessingSession(s, 2000).activeMs, 1700)
})
test('reject overlapping/outside intervals and multiple open pauses', () => {
  for (const pauses of [
    [{ id: 'a', startedAt: 100, endedAt: 500, reason: 'ge_wait' as const }, { id: 'b', startedAt: 400, endedAt: 600, reason: 'break_other' as const }],
    [{ id: 'a', startedAt: 0, endedAt: 1100, reason: 'ge_wait' as const }],
    [{ id: 'a', startedAt: 0, endedAt: null, reason: 'ge_wait' as const }, { id: 'b', startedAt: 10, endedAt: null, reason: 'ge_wait' as const }]
  ]) { const s = session(); s.pauses = pauses; assert.throws(() => deriveProcessingSession(s)) }
  const s = session(); s.externalGeWaits = [{ id: 'w', side: 'buy', startedAt: 0, endedAt: 1 }]; assert.throws(() => deriveProcessingSession(s))
  s.externalGeWaits = []; s.processingEndedAt = 0; assert.equal(deriveProcessingSession(s).actionsPerHour, null)
})
test('per-price tax snapshots preserve rounding, exemptions, cap and saved corrections', () => {
  const sale = session().sales[0]
  assert.equal(snapshotProcessingSale({ ...sale, qty: 2, unitPriceGp: 99 }, item.itemId, geTax).taxGp, 2)
  assert.equal(snapshotProcessingSale({ ...sale, qty: 2, unitPriceGp: 100 }, item.itemId, geTax).taxGp, 4)
  assert.equal(snapshotProcessingSale({ ...sale, unitPriceGp: 49 }, item.itemId, geTax).taxGp, 0)
  assert.equal(snapshotProcessingSale({ ...sale, qty: 1, unitPriceGp: 1_000_000_000 }, item.itemId, geTax).taxGp, 5_000_000)
  assert.equal(snapshotProcessingSale({ ...sale, unitPriceGp: 1000 }, 13190, geTax).taxGp, 0)
  const s = session(); s.sales[0].taxGp = 5; assert.equal(deriveProcessingSession(s).netSoldCashGp, 995)
})
test('coin-only sessions and snapshots need no catalog or market data', () => {
  const s = session(); s.inputs = []; s.outputs = []; s.sales = []; s.directCoinReceiptsGp = 50
  assert.equal(deriveProcessingSession(s).finalProfitGp, 50)
  s.directCoinReceiptsGp = null; assert.equal(deriveProcessingSession(s).finalProfitGp, null)
})
test('open pause stops active time, invalid chronology rejects, and derivation is pure', () => {
  const s = session(); s.status = 'processing'; s.processingEndedAt = null
  s.pauses = [{ id: 'p', startedAt: 400, endedAt: null, reason: 'break_other' }]
  const before = JSON.stringify(s)
  assert.equal(deriveProcessingSession(s, 1000).activeMs, 400)
  assert.equal(JSON.stringify(s), before)
  assert.equal(deriveProcessingSession(s).activeMs, null)
  s.processingStartedAt = 2000; assert.throws(() => deriveProcessingSession(s, 1000))
})
test('fees, receipts and acquisition outlay must be confirmed before settlement', () => {
  for (const field of ['processingFeesGp', 'otherExpensesGp', 'directCoinReceiptsGp'] as const) {
    const s = session(); s[field] = null
    assert.equal(deriveProcessingSession(s).finalProfitGp, null)
    s.status = 'settled'; assert.throws(() => deriveProcessingSession(s))
  }
  const s = session(); s.inputs[0].acquisitionCostGp = null
  assert.equal(deriveProcessingSession(s).cashOutlayGp, null)
  assert.equal(deriveProcessingSession(s).finalProfitGp, null)
})

test('fully consumed acquisitions require all confirmed acquisition cost to be consumed', () => {
  for (const consumedCostGp of [0, 99]) {
    const s = session(); s.inputs[0].acquiredQty = 10; s.inputs[0].consumedQty = 10
    s.inputs[0].consumedCostGp = consumedCostGp
    assert.throws(() => deriveProcessingSession(s), /Fully consumed input/)
  }
  for (const field of ['acquisitionCostGp', 'consumedCostGp'] as const) {
    const s = session(); s.inputs[0][field] = null
    const d = deriveProcessingSession(s)
    assert.equal(d.unusedInputs[0].historicalCostGp, null)
    assert.equal(d.finalProfitGp, null)
    if (field === 'consumedCostGp') assert.equal(d.consumedHistoricalCostGp, null)
  }
})
test('zero consumption rejects positive consumed values while preserving unknown values', () => {
  for (const field of ['consumedCostGp', 'opportunityValueGp'] as const) {
    const s = session(); s.inputs[0].consumedQty = 0
    s.inputs[0].consumedCostGp = 0; s.inputs[0].opportunityValueGp = 0
    s.inputs[0][field] = 1
    assert.throws(() => deriveProcessingSession(s), /Unconsumed input/)
  }
  const s = session(); s.inputs[0].consumedQty = 0
  s.inputs[0].consumedCostGp = 0; s.inputs[0].opportunityValueGp = 0
  assert.equal(deriveProcessingSession(s).consumedHistoricalCostGp, 0)
  s.inputs[0].consumedCostGp = null; s.inputs[0].opportunityValueGp = null
  const d = deriveProcessingSession(s)
  assert.equal(d.consumedHistoricalCostGp, null)
  assert.equal(d.opportunityCostGp, null)
  assert.equal(d.unusedInputs[0].historicalCostGp, null)
})
test('status and processing timestamps agree before final accounting is available', () => {
  for (const [status, start, end] of [
    ['draft', 0, null], ['draft', 0, 1000], ['draft', null, 1000], ['processing', 0, 1000]
  ] as const) {
    const s = session(); s.status = status; s.processingStartedAt = start; s.processingEndedAt = end
    assert.throws(() => deriveProcessingSession(s))
  }
  for (const status of ['draft', 'processing'] as const) {
    const s = session(); s.status = status; s.processingEndedAt = null
    if (status === 'draft') s.processingStartedAt = null
    const d = deriveProcessingSession(s, 1000)
    assert.equal(d.canSettle, false)
    assert.equal(d.finalProfitGp, null)
    assert.equal(d.opportunityProfitGp, null)
  }
  for (const status of ['processed', 'settled'] as const) {
    const s = session(); s.status = status
    const d = deriveProcessingSession(s)
    assert.equal(d.canSettle, true)
    assert.equal(d.finalProfitGp, 900)
    assert.equal(d.opportunityProfitGp, 850)
  }
})

test('labels do not change derived accounting or timing', () => {
  const original = session()
  for (const label of [null, '日本 👩‍💻']) assert.deepEqual(deriveProcessingSession({ ...original, label }), deriveProcessingSession(original))
})
