import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProcessingSession } from '../processingSessions.ts'
import { explainProcessingSession } from '../processingExplanation.ts'
import { example } from '../../components/processingSessions/explanationFixture.ts'
test('source equation reconciles 86920 with fees once and no opportunity cost', () => {
  const s = example(); const before = JSON.stringify(s)
  const freeze = (value: unknown): void => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) } }
  freeze(s)
  const result = explainProcessingSession(s, 2000)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.terms.map(t => t.signedGp), [204000, 0, -4080, -100000, -12000, -1000])
  assert.equal(result.finalProfitGp, 86920)
  assert.equal(result.terms[0].sources.length, 2)
  assert.match(result.terms[2].sources.join(' '), /version unknown/)
  assert.match(result.terms[2].sources.join(' '), /player-confirmed/)
  assert.equal(JSON.stringify(s), before)
})
test('saved tax corrections remain authoritative', () => {
  const s = example(); s.sales[0].taxGp = 1
  const r = explainProcessingSession(s, 2000); assert.equal(r.ok && r.finalProfitGp, 89319)
})
test('unknown, inventory, unsafe and future records cannot explain final profit', () => {
  for (const change of [
    (s: ProcessingSession) => { s.directCoinReceiptsGp = null },
    (s: ProcessingSession) => { s.processingFeesGp = null },
    (s: ProcessingSession) => { s.otherExpensesGp = null },
    (s: ProcessingSession) => { s.inputs[0].origin = 'already_owned'; s.inputs[0].consumedCostGp = null },
    (s: ProcessingSession) => { s.outputs[0].producedQty++ },
    (s: ProcessingSession) => { s.inputs[0].acquiredQty++ },
    (s: ProcessingSession) => { s.sales[0].unitPriceGp = Number.MAX_SAFE_INTEGER },
    (s: ProcessingSession) => { s.sales[0].soldAt = 3000 },
  ]) { const s = example(); change(s); assert.equal(explainProcessingSession(s, 2000).ok, false) }
})
test('explicit zero and owned historical cost work, including zero duration', () => {
  const s = example(); s.inputs[0].origin = 'already_owned'; s.processingEndedAt = 0
  assert.equal(explainProcessingSession(s, 2000).ok, true)
})
test('incomplete or disagreeing recorder rows suppress explanation', () => {
  for (const mode of ['incomplete', 'mismatch', 'missing']) {
    const s = example(); const recorder = { inputs: structuredClone(s.inputs), outputs: structuredClone(s.outputs) }
    const extended = { ...s, recorder }
    if (mode === 'incomplete') Object.assign(recorder.inputs[0], { consumedQty: null })
    if (mode === 'mismatch') recorder.inputs[0].item.name = 'Different'
    if (mode === 'missing') recorder.outputs = []
    assert.equal(explainProcessingSession(extended, 2000).ok, false)
  }
})
test('coin-only and multiple outputs use one session equation without cost allocation', () => {
  const s = example(); s.outputs.push({ ...s.outputs[0], id: 'second', producedQty: 1 })
  s.sales.push({ ...s.sales[0], id: 'third', outputId: 'second', qty: 1, unitPriceGp: 100, taxGp: 0 })
  const result = explainProcessingSession(s, 2000)
  assert.equal(result.ok && result.finalProfitGp, 87020)
  const coin = example(); coin.inputs = []; coin.outputs = []; coin.sales = []; coin.directCoinReceiptsGp = 14000
  const r = explainProcessingSession(coin, 2000); assert.equal(r.ok && r.finalProfitGp, 1000)
})
test('overflow in gross aggregate is blocked even when net sales remain safe', () => {
  const s = example(); s.inputs = []; s.outputs[0].producedQty = 2
  s.sales = [0, 1].map(n => ({ ...s.sales[0], id: String(n), qty: 1, unitPriceGp: Number.MAX_SAFE_INTEGER, taxGp: Number.MAX_SAFE_INTEGER }))
  assert.equal(explainProcessingSession(s, 2000).ok, false)
})
