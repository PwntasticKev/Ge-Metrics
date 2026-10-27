import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeRuneLiteEvidence, EVIDENCE_LIMITS, mergeRuneLiteEvidence, previewRuneLiteEvidence, RUNELITE_EVIDENCE_FORMAT, type RuneLiteEvidenceEvent } from '../runeliteEvidence.ts';
const source = '11111111-1111-4111-8111-111111111111';
const account = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const offer = '44444444-4444-4444-8444-444444444444';
function e(seq: string, overrides: Partial<RuneLiteEvidenceEvent> = {}): RuneLiteEvidenceEvent {
  return { schemaVersion: 1, sourceId: source, seq, eventId: `${source}:${seq}`, accountScopeId: account, profileType: 'STANDARD', captureSessionId: session, observedAt: '2026-10-26T12:00:00Z', clientTick: 1, reason: 'LOGIN', continuity: 'BASELINE', previousEventId: null, slot: 0, offerId: offer, state: 'BUYING', itemId: 4151, totalQuantity: 10, quantitySold: 3, limitPriceGp: '100', spentGp: '290', collection: 'UNKNOWN', ...overrides };
}
function envelope(events: RuneLiteEvidenceEvent[]) {
  return { format: RUNELITE_EVIDENCE_FORMAT, schemaVersion: 1, pluginVersion: '1.0', runeLiteVersion: '1.12', exportedAt: '2026-10-26T12:00:00Z', accountScopes: [...new Map(events.map(v => [JSON.stringify([v.accountScopeId, v.profileType]), { accountScopeId: v.accountScopeId, profileType: v.profileType }])).values()], retainedSequenceRanges: [{ sourceId: source, fromSeq: '0', toSeq: '9223372036854775807' }], sequenceGaps: [], events };
}
const decode = (events: RuneLiteEvidenceEvent[]) => decodeRuneLiteEvidence(JSON.stringify(envelope(events)));
const linked = (seq: string, previous: string, overrides: Partial<RuneLiteEvidenceEvent> = {}) => e(seq, { continuity: 'CONTIGUOUS', previousEventId: `${source}:${previous}`, reason: 'LIVE', ...overrides });
test('login empty burst and existing completed offers establish no invented fills', () => {
  const empty = e('1', { state: 'EMPTY', offerId: null, itemId: null, totalQuantity: null, quantitySold: null, limitPriceGp: null, spentGp: null });
  const populated = e('2', { state: 'BOUGHT', quantitySold: 10, spentGp: '990', previousEventId: empty.eventId });
  const preview = previewRuneLiteEvidence(decode([populated, empty]).events);
  assert.deepEqual(preview.rows.map(r => [r.kind, r.deltaQuantity]), [['EMPTY', null], ['BASELINE', null]]);
  assert.ok(preview.rows.every(r => r.collection === 'UNKNOWN' && r.actualTaxGp === null && r.actualNetGp === null));
});
test('aggregates raw cumulative changes including fractional average without individual fills', () => {
  const preview = previewRuneLiteEvidence([linked('2', '1', { quantitySold: 6, spentGp: '581' }), e('1')]);
  assert.equal(preview.rows[1].deltaQuantity, 3);
  assert.equal(preview.rows[1].deltaSpentGp, '291');
  assert.equal(preview.rows[1].kind, 'CONTIGUOUS');
});
test('reconnect and missing source sequence produce explicit gaps; regression never negative fills', () => {
  const next = linked('4', '1', { captureSessionId: offer, quantitySold: 5, spentGp: '480', reason: 'RECONNECT' });
  const preview = previewRuneLiteEvidence([e('1'), next, linked('5', '4', { quantitySold: 1, spentGp: '90' })]);
  assert.deepEqual(preview.sequenceGaps, [{ sourceId: source, fromSeq: '2', toSeq: '3' }]);
  assert.equal(preview.rows[1].kind, 'GAP');
  assert.equal(preview.rows[1].deltaSpentGp, '190');
  assert.equal(preview.rows[2].kind, 'DISCONTINUITY');
  assert.equal(preview.rows[2].deltaQuantity, null);
  assert.equal(previewRuneLiteEvidence([next]).rows[0].kind, 'BASELINE');
});
test('cancellation, empty, identical relist are separate baselines with unknown collection', () => {
  const cancelled = linked('2', '1', { state: 'CANCELLED_BUY' });
  const empty = e('3', { previousEventId: cancelled.eventId, state: 'EMPTY', offerId: null, itemId: null, totalQuantity: null, quantitySold: null, limitPriceGp: null, spentGp: null });
  const relist = e('4', { previousEventId: empty.eventId, offerId: session });
  const rows = previewRuneLiteEvidence([e('1'), cancelled, empty, relist]).rows;
  assert.equal(rows[1].deltaQuantity, 0);
  assert.equal(rows[3].deltaQuantity, null);
  assert.ok(rows.every(r => r.collection === 'UNKNOWN'));
  assert.equal(previewRuneLiteEvidence([e('1'), linked('2', '1', { offerId: session })]).rows[1].kind, 'DISCONTINUITY');
});
test('overlapping imports sort exact large sequences and deduplicate independent of JSON key order', () => {
  const first = e('9007199254740993'), second = linked('9007199254740994', first.seq);
  const existing = [first]; const before = JSON.stringify(existing);
  const result = mergeRuneLiteEvidence(existing, decode([second, first]));
  assert.equal(result.added, 1); assert.equal(result.duplicates, 1);
  assert.deepEqual(result.events.map(v => v.seq), [first.seq, second.seq]);
  assert.equal(JSON.stringify(existing), before);
  assert.equal(mergeRuneLiteEvidence(result.events, decode([first, second])).added, 0);
  assert.throws(() => mergeRuneLiteEvidence(existing, decode([e(first.seq, { spentGp: '291' })])), /conflicting/);
  assert.throws(() => decode([first, e(first.seq, { clientTick: 2 })]), /conflicting/);
});
test('scope/profile separation and previous-link correctness', () => {
  assert.throws(() => decode([e('1'), linked('2', '1', { profileType: 'LEAGUE' })]), /scope or slot/);
  assert.throws(() => decode([e('1'), linked('2', '1', { slot: 1 })]), /scope or slot/);
  assert.throws(() => decode([e('1'), linked('2', '1'), linked('3', '1')]), /skips/);
  assert.throws(() => decode([linked('2', '2')]), /earlier/);
  const independent = e('2', { profileType: 'LEAGUE', offerId: session });
  assert.ok(previewRuneLiteEvidence(decode([e('1'), independent]).events).rows.every(r => r.deltaQuantity === null));
});
test('Java long GP remains exact and explicitly unsupported by legacy monetary contracts', () => {
  const first = e('1', { limitPriceGp: '9223372036854775807', spentGp: '9007199254740993' });
  const second = linked('2', '1', { limitPriceGp: first.limitPriceGp, spentGp: '9007199254740994' });
  const rows = previewRuneLiteEvidence(decode([first, second]).events).rows;
  assert.equal(rows[1].deltaSpentGp, '1');
  assert.equal(rows[0].legacyAppSupported, false);
  assert.match(rows[0].issues.join(), /Unsupported/);
});
test('malformed values, null semantics, private fields, versions and size limits reject', () => {
  for (const overrides of [{ seq: '01' }, { spentGp: '9223372036854775808' }, { spentGp: 123 }, { quantitySold: 11 }, { itemId: null }, { collection: 'COLLECTED' }, { state: 'EMPTY' }, { observedAt: '2026-02-30T12:00:00Z' }, { continuity: 'CONTIGUOUS' }]) {
    assert.throws(() => decode([{ ...e('1'), ...overrides } as RuneLiteEvidenceEvent]));
  }
  assert.throws(() => decodeRuneLiteEvidence('{'));
  assert.throws(() => decodeRuneLiteEvidence(JSON.stringify({ ...envelope([e('1')]), schemaVersion: 2 })));
  assert.throws(() => decodeRuneLiteEvidence(JSON.stringify({ ...envelope([e('1')]), username: 'private' })));
  assert.throws(() => decodeRuneLiteEvidence(JSON.stringify({ ...envelope([e('1')]), pluginVersion: 'a'.repeat(257) })));
  assert.throws(() => decodeRuneLiteEvidence(' '.repeat(EVIDENCE_LIMITS.fileBytes + 1)), /limit/);
  assert.throws(() => decodeRuneLiteEvidence(JSON.stringify({ ...envelope([]), events: Array(EVIDENCE_LIMITS.events + 1).fill(null) })), /oversized/);
  const bad = envelope([e('1')]); bad.sequenceGaps = [{ sourceId: source, fromSeq: '1', toSeq: '1' }] as never[];
  assert.throws(() => decodeRuneLiteEvidence(JSON.stringify(bad)), /declared sequence gap/);
});
test('envelope boundary gaps survive merge, preview and repeated overlapping exports', () => {
  const range = (fromSeq: string, toSeq: string) => ({ sourceId: source, fromSeq, toSeq });
  const first = decodeRuneLiteEvidence(JSON.stringify({ ...envelope([e('10')]), retainedSequenceRanges: [range('10', '12')], sequenceGaps: [range('1', '9')] }));
  const merged = mergeRuneLiteEvidence([], first);
  assert.deepEqual(merged.preview.sequenceGaps, [range('1', '9'), range('11', '12')]);
  assert.deepEqual(previewRuneLiteEvidence(first), merged.preview);
  assert.equal(merged.preview.rows.length, 1);
  assert.equal(merged.preview.rows[0].deltaQuantity, null);
  const overlap = decodeRuneLiteEvidence(JSON.stringify({ ...envelope([e('9'), e('10')]), retainedSequenceRanges: [range('9', '12')], sequenceGaps: [range('1', '8')] }));
  const filled = mergeRuneLiteEvidence(merged, overlap);
  assert.deepEqual(filled.preview.sequenceGaps, [range('1', '8'), range('11', '12')]);
  const repeated = mergeRuneLiteEvidence(filled, first);
  assert.equal(repeated.added, 0);
  assert.deepEqual(repeated.preview, filled.preview);
  assert.deepEqual(repeated.retainedSequenceRanges, filled.retainedSequenceRanges);
});
test('same-offer counter regressions require reconciliation under every continuity label', () => {
  for (const continuity of ['BASELINE', 'CONTIGUOUS', 'GAP', 'DISCONTINUITY'] as const) {
    for (const counters of [{ quantitySold: 1, spentGp: '90' }, { quantitySold: 3, spentGp: '90' }, { quantitySold: 1, spentGp: '290' }]) {
      const row = previewRuneLiteEvidence([e('1'), linked('2', '1', { continuity, ...counters })]).rows[1];
      assert.equal(row.kind, 'DISCONTINUITY');
      assert.match(row.issues.join(), /regression.*reconciliation/);
      assert.equal(row.deltaQuantity, null);
      assert.equal(row.deltaSpentGp, null);
    }
  }
});
test('baseline and unavailable gap predecessors never produce cumulative deltas', () => {
  for (const events of [[e('1'), linked('2', '1', { continuity: 'BASELINE', quantitySold: 5, spentGp: '480' })], [linked('10', '1', { continuity: 'GAP', quantitySold: 5, spentGp: '480' })]]) {
    const row = previewRuneLiteEvidence(events).rows.at(-1)!;
    assert.equal(row.kind, 'BASELINE');
    assert.equal(row.deltaQuantity, null);
    assert.equal(row.deltaSpentGp, null);
  }
});
