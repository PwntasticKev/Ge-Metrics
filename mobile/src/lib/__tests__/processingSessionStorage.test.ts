import assert from 'node:assert/strict'
import type { DisplayedPlanInput } from '../processingPlan.ts'
import { test } from 'node:test'
import { createProcessingSessionRepository, decodeProcessingSessions, PROCESSING_SESSIONS_KEY } from '../processingSessionStorage.ts'
import { deriveProcessingSession, type ProcessingSession } from '../processingSessions.ts'

function session(id = 's'): ProcessingSession {
  return { id, status: 'processing', recipe: { id: 'r', methodKey: 'm', name: 'Recipe', source: null, inputs: [], outputs: [], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }, processingStartedAt: 0, processingEndedAt: null, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: 10, inputs: [], outputs: [], sales: [], processingFeesGp: 0, otherExpensesGp: 0, directCoinReceiptsGp: 10 }
}
function storage(initial: string | null = null) {
  let value = initial
  let fail = false
  let writes = 0
  return { get writes() { return writes }, get value() { return value }, set fail(value: boolean) { fail = value }, async getItem(key: string) { assert.equal(key, PROCESSING_SESSIONS_KEY); return value }, async setItem(key: string, next: string) { assert.equal(key, PROCESSING_SESSIONS_KEY); writes++; if (fail) throw new Error('disk full'); value = next } }
}
test('recovery disables elapsed confirmation without ending timers or writing on load', async () => {
  const raw = JSON.stringify({ version: 1, sessions: [session()] })
  const store = storage(raw); const repo = createProcessingSessionRepository(store)
  const loaded = await repo.load(); assert.equal(loaded.ok, true)
  if (!loaded.ok) return
  assert.equal(loaded.sessions[0].processingEndedAt, null)
  assert.equal(loaded.sessions[0].elapsedTimeConfirmed, false)
  assert.equal(deriveProcessingSession(loaded.sessions[0], 1000).actionsPerHour, null)
  assert.equal(store.value, raw)
  assert.equal((await repo.upsert(session('next'))).ok, true)
  assert.equal(JSON.parse(store.value!).sessions[0].elapsedTimeConfirmed, false)
})
test('partial documents retain invalid records and unknown fields through an explicit upsert', async () => {
  const invalid = { id: 'broken', future: 42 }
  const store = storage(JSON.stringify({ version: 1, future: true, sessions: [invalid, { ...session(), extra: 'keep' }] }))
  const repo = createProcessingSessionRepository(store); const loaded = await repo.load()
  assert.equal(loaded.ok, true)
  if (!loaded.ok) return
  assert.equal(loaded.sessions.length, 1); assert.equal(loaded.invalidRecords.length, 1)
  assert.equal((await repo.upsert(session('new'))).ok, true)
  const saved = JSON.parse(store.value!)
  assert.deepEqual(saved.sessions[0], invalid); assert.equal(saved.future, true); assert.equal(saved.sessions[1].extra, 'keep')
})
test('corrupt and unsupported documents are explicit errors and never overwritten', async () => {
  for (const raw of ['{', 'null', '{"version":2,"sessions":[]}', '{"version":1,"sessions":{}}']) {
    const store = storage(raw); const repo = createProcessingSessionRepository(store)
    assert.equal(decodeProcessingSessions(raw).ok, false)
    assert.equal((await repo.load()).ok, false); assert.equal((await repo.upsert(session())).ok, false)
    assert.equal(store.value, raw)
  }
})
test('failed writes preserve successful state and queue recovers; read failures surface', async () => {
  const store = storage(); const repo = createProcessingSessionRepository(store)
  assert.equal((await repo.upsert(session())).ok, true); const before = store.value
  store.fail = true; const failed = await repo.upsert(session('failed'))
  assert.equal(failed.ok, false); assert.equal(store.value, before)
  store.fail = false; assert.equal((await repo.upsert(session('after'))).ok, true)
  const loaded = await repo.load(); if (loaded.ok) assert.deepEqual(loaded.sessions.map(s => s.id), ['s', 'after'])
  const broken = createProcessingSessionRepository({ async getItem() { throw new Error('read failed') }, async setItem() {} })
  assert.equal((await broken.load()).ok, false); assert.equal((await broken.upsert(session())).ok, false)
})
test('overlapping upserts serialize and duplicate IDs replace receipts', async () => {
  const store = storage(JSON.stringify({ version: 1, sessions: [session(), session()] }))
  const repo = createProcessingSessionRepository(store)
  const results = await Promise.all([repo.upsert({ ...session(), directCoinReceiptsGp: 20 }), repo.upsert(session('b')), repo.upsert(session('c'))])
  assert.ok(results.every(r => r.ok))
  const loaded = await repo.load(); assert.equal(loaded.ok, true)
  if (loaded.ok) { assert.deepEqual(loaded.sessions.map(s => s.id), ['s', 'b', 'c']); assert.equal(loaded.sessions[0].directCoinReceiptsGp, 20) }
  assert.equal(JSON.parse(store.value!).sessions.length, 3)
})
test('invalid edits leave storage untouched and explicit confirmation survives saving', async () => {
  const store = storage(); const repo = createProcessingSessionRepository(store)
  const pending = session()
  const saving = repo.upsert(pending)
  pending.directCoinReceiptsGp = 999
  const saved = await saving
  assert.equal(saved.ok, true)
  if (saved.ok) {
    assert.equal(saved.sessions[0].elapsedTimeConfirmed, true)
    assert.equal(saved.sessions[0].directCoinReceiptsGp, 10)
  }
  assert.equal(JSON.parse(store.value!).sessions[0].elapsedTimeConfirmed, true)
  const before = store.value
  assert.equal((await repo.upsert({ ...session(), actionsCompleted: -1 })).ok, false)
  assert.equal(store.value, before)
  const loaded = await repo.load()
  if (loaded.ok) assert.equal(loaded.sessions[0].elapsedTimeConfirmed, false)
})
test('same-ID edits retain nested future fields, honor nulls and replace array membership', async () => {
  const item = { itemId: 1, name: 'Item', icon: 'old' }
  const input = { id: 'in', item, acquiredQty: 2, consumedQty: 1, origin: 'purchased' as const, acquisitionCostGp: 10, consumedCostGp: 5, opportunityValueGp: 5 }
  const output = { id: 'out', item, producedQty: 10 }
  const sale = { id: 'sale', outputId: 'out', qty: 1, unitPriceGp: 10, soldAt: 1, taxGp: 0, taxBasis: 'engine' as const, taxRuleVersion: 'old' }
  const recipeRow = { ...item, qtyPerAction: 1 }
  const future = { nested: { keep: true, changed: 'old' } }
  const original = { ...session(), recipe: { ...session().recipe, future, inputs: [{ ...recipeRow, future }, { ...recipeRow, itemId: 2, future }], outputs: [{ ...recipeRow, future }] }, inputs: [{ ...input, future, item: { ...item, future } }, { ...input, id: 'removed', future }], outputs: [{ ...output, future, item: { ...item, future } }], sales: [{ ...sale, future }, { ...sale, id: 'deleted', future }] }
  const invalid = { id: 'unrelated', future: true }
  const store = storage(JSON.stringify({ version: 1, sessions: [invalid, original] }))
  const repo = createProcessingSessionRepository(store)
  const edited = { ...session(), recipe: { ...session().recipe, future: { nested: { changed: null } }, inputs: [{ ...recipeRow, icon: null, qtyPerAction: 2 }, { ...recipeRow, itemId: 3 }], outputs: [recipeRow] }, inputs: [{ ...input, consumedCostGp: null, item: { ...item, icon: null } }, { ...input, id: 'new' }], outputs: [{ ...output, producedQty: 20 }], sales: [{ ...sale, unitPriceGp: 20, taxRuleVersion: null }, { ...sale, id: 'new-sale' }] }
  const result = await repo.upsert(edited)
  assert.equal(result.ok, true)
  const saved = JSON.parse(store.value!).sessions[1]
  assert.deepEqual(JSON.parse(store.value!).sessions[0], invalid)
  assert.deepEqual(saved.recipe.future, { nested: { keep: true, changed: null } })
  assert.deepEqual(saved.recipe.inputs.map((r: { itemId: number }) => r.itemId), [1, 3])
  assert.deepEqual(saved.recipe.inputs[0].future, future)
  assert.equal(saved.recipe.inputs[0].icon, null); assert.equal(saved.recipe.inputs[0].qtyPerAction, 2)
  assert.equal(saved.recipe.inputs[1].future, undefined)
  assert.deepEqual(saved.recipe.outputs[0].future, future)
  assert.deepEqual(saved.inputs.map((r: { id: string }) => r.id), ['in', 'new'])
  assert.deepEqual(saved.inputs[0].future, future); assert.deepEqual(saved.inputs[0].item.future, future)
  assert.equal(saved.inputs[0].item.icon, null); assert.equal(saved.inputs[0].consumedCostGp, null)
  assert.equal(saved.inputs[1].future, undefined)
  assert.deepEqual(saved.outputs[0].future, future); assert.deepEqual(saved.outputs[0].item.future, future)
  assert.equal(saved.outputs[0].producedQty, 20)
  assert.deepEqual(saved.sales.map((r: { id: string }) => r.id), ['sale', 'new-sale'])
  assert.deepEqual(saved.sales[0].future, future); assert.equal(saved.sales[0].unitPriceGp, 20)
  assert.equal(saved.sales[0].taxRuleVersion, null); assert.equal(saved.sales[1].future, undefined)
  if (result.ok) { assert.deepEqual(result.sessions[0], saved); assert.equal(result.sessions[0].elapsedTimeConfirmed, true) }
  assert.equal((await repo.upsert({ ...edited, revision: result.ok ? result.sessions[0].revision : undefined, sales: [] })).ok, true)
  assert.deepEqual(JSON.parse(store.value!).sessions[1].sales, [])
})
test('recursive merges retain prototype keys as data without polluting prototypes', async () => {
  const original = { ...session(), recipe: { ...session().recipe, future: JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}') } }
  const edited = { ...session(), recipe: { ...session().recipe, future: JSON.parse('{"__proto__":{"edited":true},"constructor":{"prototype":{"edited":true}}}') } }
  const store = storage(JSON.stringify({ version: 1, sessions: [original] }))
  assert.equal((await createProcessingSessionRepository(store).upsert(edited)).ok, true)
  const future = JSON.parse(store.value!).sessions[0].recipe.future
  assert.deepEqual(future.__proto__, { polluted: true, edited: true })
  assert.deepEqual(future.constructor.prototype, { polluted: true, edited: true })
  assert.equal(Object.hasOwn(Object.prototype, 'polluted'), false)
  assert.equal(Object.hasOwn(Object.prototype, 'edited'), false)
})

test('ended save rejects an older processing snapshot without changing durable data', async () => {
  const store = storage(JSON.stringify({ version: 1, sessions: [session()] }))
  const repo = createProcessingSessionRepository(store)
  const loaded = await repo.load(); assert.ok(loaded.ok)
  if (!loaded.ok) return
  const old = loaded.sessions[0]
  const ended = await repo.upsert({ ...old, status: 'processed', processingEndedAt: 100, elapsedTimeConfirmed: true })
  assert.ok(ended.ok)
  if (!ended.ok) return
  assert.equal(ended.sessions[0].revision, 1)
  const raw = store.value
  const stale = await repo.upsert({ ...old, directCoinReceiptsGp: 20 })
  assert.equal(stale.ok, false)
  if (!stale.ok) assert.match(stale.error.message, /Conflict.*unsaved/)
  assert.equal(store.value, raw)
  const updated = await repo.upsert({ ...ended.sessions[0], directCoinReceiptsGp: 30 })
  assert.ok(updated.ok)
  if (updated.ok) assert.equal(updated.sessions[0].revision, 2)
})
test('concurrent edits from the same revision allow exactly one save', async () => {
  const store = storage(); const repo = createProcessingSessionRepository(store)
  const initial = await repo.upsert(session()); assert.ok(initial.ok)
  if (!initial.ok) return
  const old = initial.sessions[0]
  const results = await Promise.all([repo.upsert({ ...old, directCoinReceiptsGp: 20 }), repo.upsert({ ...old, directCoinReceiptsGp: 30 })])
  assert.equal(results.filter(r => r.ok).length, 1)
  assert.equal(JSON.parse(store.value!).sessions[0].directCoinReceiptsGp, 20)
})
test('malformed recorder extensions remain unreadable and retained alongside valid records', async () => {
  const item = { itemId: 1, name: 'Item', icon: null }
  const input = { id: 'i', item, acquiredQty: null, consumedQty: null, origin: 'purchased', acquisitionCostGp: null, consumedCostGp: null, opportunityValueGp: null }
  const output = { id: 'o', item, producedQty: null }
  const malformedFields = ['acquiredQty', 'consumedQty', 'acquisitionCostGp', 'consumedCostGp', 'opportunityValueGp'].flatMap(field => [undefined, '0', false, -1, 1.5, {}].map(value => ({ inputs: [{ ...input, [field]: value }], outputs: [] })))
  for (const recorder of [...malformedFields, { inputs: [input, input], outputs: [] }, { inputs: [], outputs: [output, output] }, { inputs: [], outputs: [{ ...output, item: { ...item, icon: 1 } }] }, {}, null, [], 'bad', { inputs: {}, outputs: [] }, { inputs: [], outputs: null }, { inputs: [null], outputs: [] }, { inputs: [input], outputs: [{}] }, { inputs: [{ ...input, item: [] }], outputs: [] }, { inputs: [{ ...input, consumedQty: '1' }], outputs: [] }, { inputs: [{ ...input, origin: 'bad' }], outputs: [] }, { inputs: [{ ...input, acquisitionCostGp: undefined }], outputs: [] }, { inputs: [], outputs: [{ ...output, producedQty: -1 }] }]) {
    const invalid = { ...session('bad'), recorder }
    const store = storage(JSON.stringify({ version: 1, sessions: [invalid, session('good')] }))
    const repo = createProcessingSessionRepository(store)
    const loaded = await repo.load(); assert.ok(loaded.ok)
    if (!loaded.ok) continue
    assert.equal(loaded.invalidRecords.length, 1)
    assert.deepEqual(loaded.sessions.map(s => s.id), ['good'])
    assert.equal((await repo.upsert(session('bad'))).ok, false)
    assert.equal((await repo.upsert({ ...loaded.sessions[0], directCoinReceiptsGp: 20 })).ok, true)
    assert.deepEqual(JSON.parse(store.value!).sessions[0], JSON.parse(JSON.stringify(invalid)))
  }
})

test('ambiguous raw same-ID records reject edits without attempting a write', async () => {
  const pairs = [
    [{ ...session(), revision: 9 }, { ...session(), revision: 1 }],
    [{ ...session(), future: { nested: [1, 2] } }, { ...session(), future: { nested: [2, 1] } }],
    [{ ...session(), elapsedTimeConfirmed: true }, { ...session(), elapsedTimeConfirmed: false }],
    [{ id: 's', future: true }, session()],
    [{ id: 's', future: true }],
    [{ ...session(), future: { nested: { value: 1 } } }, { ...session(), future: { nested: { value: 2 } } }],
  ]
  for (const pair of pairs) for (const records of [pair, [...pair].reverse()]) {
    const raw = JSON.stringify({ version: 1, sessions: records })
    const store = storage(raw); const repo = createProcessingSessionRepository(store)
    const loaded = await repo.load(); assert.ok(loaded.ok)
    if (!loaded.ok) continue
    const result = await repo.upsert({ ...(loaded.sessions[0] ?? session()), directCoinReceiptsGp: 20 })
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.error.message, /unsaved/)
    assert.equal(store.writes, 0)
    assert.equal(store.value, raw)
  }
})

test('key-reordered identical valid copies collapse while retaining unrelated corrupt rows', async () => {
  const original = { ...session(), revision: 3, future: { nested: { a: 1, b: [2, 3] } } }
  const reordered = { ...Object.fromEntries(Object.entries(original).reverse()), future: { nested: { b: [2, 3], a: 1 } } }
  const corrupt = { id: 'other', future: { keep: true } }
  for (const records of [[original, corrupt, reordered], [reordered, corrupt, original]]) {
    const store = storage(JSON.stringify({ version: 1, future: true, sessions: records }))
    const repo = createProcessingSessionRepository(store)
    const loaded = await repo.load(); assert.ok(loaded.ok)
    if (!loaded.ok) continue
    const edit = { ...loaded.sessions[0], directCoinReceiptsGp: 20 }
    const before = store.value
    store.fail = true
    assert.equal((await repo.upsert(edit)).ok, false)
    assert.equal(store.value, before)
    store.fail = false
    const result = await repo.upsert(edit); assert.ok(result.ok)
    const saved = JSON.parse(store.value!)
    assert.equal(saved.sessions.length, 2)
    assert.equal(saved.sessions[0].revision, 4)
    assert.equal(saved.sessions[0].directCoinReceiptsGp, 20)
    assert.deepEqual(saved.sessions[0].future, original.future)
    assert.deepEqual(saved.sessions[1], corrupt)
    assert.equal(saved.future, true)
  }
})

test('existing plan presence and opaque value are immutable; actuals remain editable', async () => {
  for (const plan of [undefined, null, { version: 2, future: { a: 1, b: [2] } }, { version: 1, broken: true }]) {
    const original = plan === undefined ? session() : { ...session(), initialPlan: plan }
    const store = storage(JSON.stringify({ version: 1, sessions: [original] })); const repo = createProcessingSessionRepository(store)
    const loaded = await repo.load(); assert.ok(loaded.ok); if (!loaded.ok) continue
    const edited = { ...loaded.sessions[0], directCoinReceiptsGp: 99 }
    assert.ok((await repo.upsert(edited)).ok)
    const current = await repo.load(); if (!current.ok) continue
    for (const changed of [{ ...current.sessions[0], initialPlan: { version: 9 } }, Object.fromEntries(Object.entries(current.sessions[0]).filter(([k]) => k !== 'initialPlan'))]) {
      if (plan === undefined && !Object.hasOwn(changed, 'initialPlan')) continue
      assert.equal((await repo.upsert(changed as ProcessingSession)).ok, false)
    }
    if (plan !== undefined) assert.equal((await repo.upsert({ ...current.sessions[0], recipe: { ...current.sessions[0].recipe, coinCostPerAction: 1 } })).ok, false)
    assert.deepEqual(JSON.parse(store.value!).sessions[0].initialPlan, plan)
  }
})

test('new plan creation roundtrips, never affects actual derivation, and rejects mismatches', async () => {
  const { captureInitialPlan } = await import('../processingPlan.ts')
  const selected = {
    recipe: { ...session().recipe, inputs: [{ itemId: 100, name: 'I', icon: null, qtyPerAction: 1 }], outputs: [{ itemId: 101, name: 'O', icon: null, qtyPerAction: 1 }] },
    quotes: [
      { itemId: 100, qtyPerAction: 1, mode: 'instant' as const, source: 'latest-high' as const, unitPriceGp: 10, quoteTradeAtMs: null, sourceDataUpdatedAtMs: null, averagePeriod: null, averageSideVolume: null },
      { itemId: 101, qtyPerAction: 1, mode: 'instant' as const, source: 'latest-low' as const, unitPriceGp: 20, quoteTradeAtMs: null, sourceDataUpdatedAtMs: null, averagePeriod: null, averageSideVolume: null },
    ],
    sizing: { cashBudgetGp: 100, activeMinutes: 10, actions: null, rate: null, mappingLimitActions: null, hasUnknownInputLimit: true },
    amounts: { cost: 10, revenue: 20, tax: 0, profit: 10 },
  }; const capture = captureInitialPlan(selected, 100); assert.ok(capture.ok); if (!capture.ok) return
  const draft = { ...session(), recipe: selected.recipe, initialPlan: capture.plan }
  assert.deepEqual(deriveProcessingSession(draft), deriveProcessingSession({ ...draft, initialPlan: { version: 99 } }))
  const store = storage(); const repo = createProcessingSessionRepository(store)
  const saved = await repo.upsert(draft); assert.ok(saved.ok); if (!saved.ok) return
  assert.deepEqual(saved.sessions[0].initialPlan, capture.plan)
  const raw = store.value
  const reordered = JSON.parse(JSON.stringify(capture.plan)); reordered.amounts = Object.fromEntries(Object.entries(reordered.amounts).reverse())
  assert.ok((await repo.upsert({ ...saved.sessions[0], initialPlan: reordered, directCoinReceiptsGp: 20 })).ok)
  const mismatch = { ...draft, id: 'mismatch', recipe: { ...draft.recipe, coinCostPerAction: 4 } }
  assert.equal((await repo.upsert(mismatch)).ok, false)
  assert.equal((await repo.upsert({ ...draft, id: 'unsupported', initialPlan: { version: 2 } })).ok, false)
  assert.notEqual(store.value, raw)
})
test('queued immutable plan snapshot survives caller mutation and stale concurrent saves', async () => {
  const original = { ...session(), initialPlan: { version: 2, nested: { value: 1 } } }
  const store = storage(JSON.stringify({ version: 1, sessions: [original] })); const repo = createProcessingSessionRepository(store)
  const loaded = await repo.load(); assert.ok(loaded.ok); if (!loaded.ok) return
  const edit = { ...loaded.sessions[0], directCoinReceiptsGp: 20 }
  const pending = repo.upsert(edit)
  ;(edit.initialPlan as typeof original.initialPlan).nested.value = 99
  assert.ok((await pending).ok)
  assert.equal((await repo.upsert({ ...loaded.sessions[0], directCoinReceiptsGp: 30 })).ok, false)
  assert.deepEqual(JSON.parse(store.value!).sessions[0].initialPlan, original.initialPlan)
})

test('oversized opaque existing evidence remains editable without normalization', async () => {
  const original = { ...session(), initialPlan: { version: 88, payload: 'x'.repeat(70000), unknown: { rows: [1, null, false] } } }
  const store = storage(JSON.stringify({ version: 1, sessions: [original] })); const repo = createProcessingSessionRepository(store)
  const loaded = await repo.load(); assert.ok(loaded.ok); if (!loaded.ok) return
  assert.ok((await repo.upsert({ ...loaded.sessions[0], directCoinReceiptsGp: 21 })).ok)
  assert.deepEqual(JSON.parse(store.value!).sessions[0].initialPlan, original.initialPlan)
})

const planRecipe: ProcessingSession['recipe'] = { id: 'r', methodKey: 'm', name: 'R', source: null, inputs: [{ itemId: 100, name: 'I', icon: null, qtyPerAction: 2 }], outputs: [{ itemId: 101, name: 'O', icon: null, qtyPerAction: 1 }], coinCostPerAction: 3, coinRevenuePerAction: 1, curatedActionsPerHour: 60 }
function planInput(): DisplayedPlanInput {
  return { recipe: planRecipe, quotes: [
    { itemId: 100, qtyPerAction: 2, mode: 'instant', source: 'latest-high', unitPriceGp: 10.5, quoteTradeAtMs: 10, sourceDataUpdatedAtMs: 20, averagePeriod: null, averageSideVolume: null },
    { itemId: 101, qtyPerAction: 1, mode: 'instant', source: 'latest-low', unitPriceGp: 100.5, quoteTradeAtMs: null, sourceDataUpdatedAtMs: 20, averagePeriod: null, averageSideVolume: null },
  ], sizing: { cashBudgetGp: 1000, activeMinutes: 10, actions: 10, rate: { source: 'curated', actionsPerHour: 60, recordedEvidence: null }, mappingLimitActions: null, hasUnknownInputLimit: true }, amounts: { cost: 24, revenue: 101.5, tax: 2, profit: 75.5 } }
}

test('new plans reject future captures and foreign identities without writing', async () => {
  const { captureInitialPlan } = await import('../processingPlan.ts')
  const selected = planInput()
  for (const capturedAt of [101, Number.MAX_SAFE_INTEGER]) {
    const captured = captureInitialPlan(selected, capturedAt); assert.ok(captured.ok); if (!captured.ok) continue
    const store = storage(); const repo = createProcessingSessionRepository(store, () => 100)
    assert.equal((await repo.upsert({ ...session(), recipe: selected.recipe, initialPlan: captured.plan })).ok, false)
    assert.equal(store.writes, 0)
  }
  const captured = captureInitialPlan(selected, 100); assert.ok(captured.ok); if (!captured.ok) return
  for (const recipe of [{ ...selected.recipe, id: 'other' }, { ...selected.recipe, methodKey: 'other-method' }]) {
    const store = storage(); const repo = createProcessingSessionRepository(store, () => 100)
    assert.equal((await repo.upsert({ ...session(), recipe, initialPlan: captured.plan })).ok, false)
    assert.equal(store.writes, 0)
  }
  for (const now of [100, 101]) {
    const store = storage(); const repo = createProcessingSessionRepository(store, () => now)
    const saved = await repo.upsert({ ...session(), recipe: selected.recipe, initialPlan: captured.plan })
    assert.ok(saved.ok); if (!saved.ok) continue
    assert.ok((await repo.upsert({ ...saved.sessions[0], directCoinReceiptsGp: 20 })).ok)
    assert.deepEqual(JSON.parse(store.value!).sessions[0].initialPlan, captured.plan)
  }
})

test('creation clock is sampled after queued storage reads complete', async () => {
  const { captureInitialPlan } = await import('../processingPlan.ts')
  const selected = planInput(); const captured = captureInitialPlan(selected, 100)
  assert.ok(captured.ok); if (!captured.ok) return
  let now = 99; let calls = 0
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  const store = storage()
  const repo = createProcessingSessionRepository({ ...store, async getItem(key) { await blocked; return store.getItem(key) }, setItem: store.setItem }, () => { calls++; return now })
  const loading = repo.load()
  const saving = repo.upsert({ ...session(), recipe: selected.recipe, initialPlan: captured.plan })
  assert.equal(calls, 0)
  now = 100; release(); await loading
  assert.ok((await saving).ok)
  assert.equal(calls, 1); assert.equal(store.writes, 1)
})

test('creation rejects a clock bound that moves behind capture while queued', async () => {
  const { captureInitialPlan } = await import('../processingPlan.ts')
  const selected = planInput(); const captured = captureInitialPlan(selected, 100)
  assert.ok(captured.ok); if (!captured.ok) return
  let now = 100
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  const store = storage()
  const repo = createProcessingSessionRepository({ async getItem(key) { await blocked; return store.getItem(key) }, setItem: store.setItem }, () => now)
  const saving = repo.upsert({ ...session(), recipe: selected.recipe, initialPlan: captured.plan })
  now = 99; release()
  assert.equal((await saving).ok, false)
  assert.equal(store.writes, 0)
})
