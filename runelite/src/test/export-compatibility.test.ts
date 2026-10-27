import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { decodeRuneLiteEvidence, previewRuneLiteEvidence, mergeRuneLiteEvidence } from '../../../mobile/src/lib/runeliteEvidence.ts';

const root = new URL('../../', import.meta.url);
test('real Java Journal export matches shared picker fixture and TypeScript contract', () => {
  const actual = execFileSync('java', ['-cp', 'target/test-classes:target/classes:.deps/*', 'com.gemetrics.recorder.ExportFixture'], { cwd: root, encoding: 'utf8' });
  assert.equal(actual, readFileSync(new URL('fixtures/account-evidence-v1.json', root), 'utf8'));
  const decoded = decodeRuneLiteEvidence(actual);
  assert.deepEqual(decoded.events.map(e => e.seq), ['1', '2', '4', '5', '6']);
  assert.deepEqual(decoded.events.map(e => e.continuity), ['BASELINE', 'CONTIGUOUS', 'CONTIGUOUS', 'GAP', 'DISCONTINUITY']);
  assert.deepEqual(decoded.accountScopes, [{ accountScopeId: '22222222-2222-4222-8222-222222222222', profileType: 'STANDARD' }]);
  assert.deepEqual(decoded.sequenceGaps, [{ sourceId: decoded.events[0].sourceId, fromSeq: '3', toSeq: '3' }]);
  assert.equal(decoded.retainedSequenceRanges.length, 5);
  const preview = previewRuneLiteEvidence(decoded);
  assert.deepEqual(preview.rows.map(r => r.kind), ['BASELINE', 'CONTIGUOUS', 'GAP', 'DISCONTINUITY', 'DISCONTINUITY']);
  assert.equal(preview.rows[1].deltaSpentGp, '3000000001');
  assert.equal(preview.rows[2].deltaSpentGp, '3000000001');
  assert.equal(preview.rows[3].deltaSpentGp, null); // reconnect starts a fresh inferred lifecycle
  assert.equal(preview.rows[4].deltaSpentGp, null);
  assert.ok(preview.rows.every(r => !r.legacyAppSupported && r.collection === 'UNKNOWN' && r.actualTaxGp === null && r.actualNetGp === null));
  const merged = mergeRuneLiteEvidence([], decoded);
  assert.equal(mergeRuneLiteEvidence(merged, decoded).duplicates, 5);
  assert.deepEqual(merged.preview.sequenceGaps, decoded.sequenceGaps);
});
