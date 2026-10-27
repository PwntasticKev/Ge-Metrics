import assert from 'node:assert/strict';
import { test } from 'node:test';
import { previewRuneLiteEvidence, type RuneLiteEvidenceEvent } from '../runeliteEvidence.ts';
import { selectRuneLiteItemTimeline } from '../runeliteItemTimeline.ts';

// Synthetic recorder observations only; these fixtures make no game QA claims.
const source = '11111111-1111-4111-8111-111111111111';
const account = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const offer = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const selection = { sourceId: source, accountScopeId: account, profileType: 'STANDARD', itemId: 4151 };
function e(seq: string, overrides: Partial<RuneLiteEvidenceEvent> = {}): RuneLiteEvidenceEvent {
  return { schemaVersion: 1, sourceId: source, seq, eventId: `${source}:${seq}`, accountScopeId: account, profileType: 'STANDARD', captureSessionId: session, observedAt: '2026-10-26T12:00:00Z', clientTick: 1, reason: 'LIVE', continuity: 'BASELINE', previousEventId: null, slot: 0, offerId: offer, state: 'BUYING', itemId: 4151, totalQuantity: 10, quantitySold: 3, limitPriceGp: '9223372036854775807', spentGp: '9007199254740993', collection: 'UNKNOWN', ...overrides };
}
const linked = (seq: string, previous: string, overrides: Partial<RuneLiteEvidenceEvent> = {}) => e(seq, { previousEventId: `${source}:${previous}`, continuity: 'CONTIGUOUS', ...overrides });
const inbox = (events: RuneLiteEvidenceEvent[]) => ({ events, retainedSequenceRanges: [], sequenceGaps: [] });
test('joins full preview classifications, including other-item and EMPTY predecessor context', () => {
  const empty = e('1', { state: 'EMPTY', itemId: null, offerId: null, totalQuantity: null, quantitySold: null, limitPriceGp: null, spentGp: null });
  const first = linked('2', '1');
  const different = e('3', { itemId: 2, offerId: other, previousEventId: first.eventId });
  const last = linked('4', '3', { offerId: session });
  const evidence = inbox([last, different, first, empty]);
  const groups = selectRuneLiteItemTimeline(evidence, selection);
  assert.deepEqual(groups.flatMap(g => g.observations.map(v => v.preview)), previewRuneLiteEvidence(evidence).rows.filter(r => [first.eventId, last.eventId].includes(r.eventId)));
  assert.deepEqual(groups.flatMap(g => g.context.map(v => [v.role, v.event.state, v.event.itemId])), [['CONTEXT', 'EMPTY', null], ['CONTEXT', 'BUYING', 2]]);
  assert.ok(groups.every(g => g.observations.every(v => v.role === 'OBSERVATION')));
});
test('duplicate/replayed input yields identical groups and exact sequence/GP strings', () => {
  const first = e('9007199254740993');
  const last = linked('9007199254740994', first.seq, { spentGp: '9007199254740994' });
  const evidence = inbox([last, first]);
  const before = JSON.stringify(evidence);
  const groups = selectRuneLiteItemTimeline(evidence, selection);
  assert.deepEqual(selectRuneLiteItemTimeline(inbox([first, last, first, last]), selection), groups);
  assert.deepEqual(groups[0].observations.map(v => v.event.seq), [first.seq, last.seq]);
  assert.equal(groups[0].observations[0].event.spentGp, '9007199254740993');
  assert.equal(groups[0].observations[1].preview.deltaSpentGp, '1');
  assert.equal(JSON.stringify(evidence), before);
});
test('source, account and profile selection excludes other evidence', () => {
  const events = [e('1'), e('2', { accountScopeId: other, offerId: other }), e('3', { profileType: 'LEAGUE', offerId: session }), e('1', { sourceId: other, eventId: `${other}:1` })];
  assert.equal(selectRuneLiteItemTimeline(inbox(events), selection).flatMap(g => g.observations).length, 1);
  for (const event of events) assert.equal(selectRuneLiteItemTimeline(inbox(events), { ...selection, sourceId: event.sourceId, accountScopeId: event.accountScopeId, profileType: event.profileType }).flatMap(g => g.observations).length, 1);
});
test('relist and reconnect boundaries never combine offers into trades', () => {
  const events = [e('1'), linked('2', '1', { state: 'CANCELLED_BUY' }), e('3', { offerId: other }), linked('4', '3', { offerId: other, reason: 'RECONNECT', captureSessionId: other }), linked('5', '4', { offerId: other, captureSessionId: other, state: 'BOUGHT' })];
  const groups = selectRuneLiteItemTimeline(inbox(events), selection);
  assert.deepEqual(groups.map(g => g.observations.map(v => v.event.seq)), [['1', '2'], ['3'], ['4', '5']]);
  assert.equal(groups[2].observations[0].preview.kind, 'GAP');
});
test('missing predecessors, declared gaps and regressions retain all uncertainty', () => {
  const evidence = { ...inbox([linked('10', '1', { continuity: 'GAP' }), linked('12', '10', { quantitySold: 5, spentGp: '9007199254740995' }), linked('13', '12', { quantitySold: 1 })]), sequenceGaps: [{ sourceId: source, fromSeq: '11', toSeq: '11' }] };
  const observations = selectRuneLiteItemTimeline(evidence, selection).flatMap(g => g.observations);
  assert.deepEqual(observations.map(v => v.preview), previewRuneLiteEvidence(evidence).rows);
  assert.deepEqual(observations.map(v => v.preview.kind), ['BASELINE', 'GAP', 'DISCONTINUITY']);
  assert.match(observations[0].preview.issues.join(), /unavailable/);
  assert.match(observations[2].preview.issues.join(), /regression/);
  assert.equal(observations[2].preview.deltaSpentGp, null);
});
test('invalid unrelated evidence is checked before selection', () => {
  assert.throws(() => selectRuneLiteItemTimeline(inbox([e('1'), e('2', { itemId: 2, spentGp: '-1' })]), selection));
});
test('excluded slot observations do not turn a contiguous selected offer into a source gap', () => {
  const first = e('1');
  const unrelated = e('2', { slot: 1, offerId: other, itemId: 2 });
  const last = linked('3', '1', { state: 'BOUGHT', quantitySold: 10, spentGp: '9007199254740999' });
  const evidence = inbox([last, unrelated, first]);
  const selected = selectRuneLiteItemTimeline(evidence, selection)[0].observations[1];
  assert.equal(selected.preview.kind, 'CONTIGUOUS');
  assert.equal(previewRuneLiteEvidence([first, last]).rows[1].kind, 'GAP');
  assert.deepEqual(selected.preview, previewRuneLiteEvidence(evidence).rows[2]);
});
