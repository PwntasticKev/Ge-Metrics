/** Read-only recorder evidence. No monetary values are converted to JS numbers. */
export const RUNELITE_EVIDENCE_FORMAT = 'ge-metrics-runelite-evidence';
export const EVIDENCE_LIMITS = { fileBytes: 5_000_000, events: 10_000, stringLength: 256, scopes: 128, ranges: 10_000 } as const;
type Continuity = 'BASELINE' | 'CONTIGUOUS' | 'GAP' | 'DISCONTINUITY';
type State = 'EMPTY' | 'BUYING' | 'BOUGHT' | 'SELLING' | 'SOLD' | 'CANCELLED_BUY' | 'CANCELLED_SELL';
export interface RuneLiteEvidenceEvent {
  schemaVersion: 1; sourceId: string; seq: string; eventId: string;
  accountScopeId: string; profileType: string; captureSessionId: string;
  observedAt: string; clientTick: number; reason: 'LOGIN' | 'RECONNECT' | 'LIVE' | 'STARTUP';
  continuity: Continuity; previousEventId: string | null; slot: number; offerId: string | null;
  state: State; itemId: number | null; totalQuantity: number | null; quantitySold: number | null;
  limitPriceGp: string | null; spentGp: string | null; collection: 'UNKNOWN';
}
export interface EvidenceScope { accountScopeId: string; profileType: string }
export interface EvidenceRange { sourceId: string; fromSeq: string; toSeq: string }
/** Ranges are inclusive. Gaps declare missing source sequences, never missing executions. */
export interface RuneLiteEvidenceExport {
  format: typeof RUNELITE_EVIDENCE_FORMAT; schemaVersion: 1; pluginVersion: string;
  runeLiteVersion: string; exportedAt: string; accountScopes: EvidenceScope[];
  retainedSequenceRanges: EvidenceRange[]; sequenceGaps: EvidenceRange[]; events: RuneLiteEvidenceEvent[];
}
export class EvidenceError extends Error {
  constructor(message: string) { super(message); this.name = 'EvidenceError'; }
}
const fail = (message: string): never => { throw new EvidenceError(message); };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path}: expected object`);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).length !== keys.length || keys.some(k => !Object.hasOwn(result, k))) fail(`${path}: unexpected or missing fields`);
  return result;
}
function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > EVIDENCE_LIMITS.stringLength) fail(`${path}: invalid string`);
  return value as string;
}
function uuid(value: unknown, path: string): string {
  const s = str(value, path); if (!uuidPattern.test(s)) fail(`${path}: expected UUID`); return s;
}
function decimal(value: unknown, path: string): string {
  const s = str(value, path);
  if (!/^(0|[1-9][0-9]{0,18})$/.test(s) || BigInt(s) > BigInt('9223372036854775807')) fail(`${path}: expected nonnegative Java long decimal string`);
  return s;
}
function integer(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(`${path}: invalid integer`);
  return value as number;
}
function timestamp(value: unknown, path: string): string {
  const s = str(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(s) || !Number.isFinite(Date.parse(s))) fail(`${path}: expected UTC timestamp`);
  const date = s.slice(0, 10);
  if (new Date(s).toISOString().slice(0, 10) !== date) fail(`${path}: invalid date`);
  return s;
}
function oneOf<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (!choices.includes(value as T)) fail(`${path}: unsupported value`); return value as T;
}
function array(value: unknown, max: number, path: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`${path}: invalid or oversized array`); return value as unknown[];
}
const eventKeys = ['schemaVersion', 'sourceId', 'seq', 'eventId', 'accountScopeId', 'profileType', 'captureSessionId', 'observedAt', 'clientTick', 'reason', 'continuity', 'previousEventId', 'slot', 'offerId', 'state', 'itemId', 'totalQuantity', 'quantitySold', 'limitPriceGp', 'spentGp', 'collection'];
function event(value: unknown): RuneLiteEvidenceEvent {
  const r = record(value, eventKeys, 'event');
  if (r.schemaVersion !== 1) fail('event: unsupported schemaVersion');
  const sourceId = uuid(r.sourceId, 'sourceId'), seq = decimal(r.seq, 'seq');
  if (r.eventId !== `${sourceId}:${seq}`) fail('eventId: must equal sourceId:seq');
  const state = oneOf(r.state, ['EMPTY', 'BUYING', 'BOUGHT', 'SELLING', 'SOLD', 'CANCELLED_BUY', 'CANCELLED_SELL'] as const, 'state');
  const nullableInteger = (key: string, min: number) => r[key] === null ? null : integer(r[key], min, 2147483647, key);
  const result: RuneLiteEvidenceEvent = {
    schemaVersion: 1, sourceId, seq, eventId: r.eventId as string,
    accountScopeId: uuid(r.accountScopeId, 'accountScopeId'), profileType: str(r.profileType, 'profileType'),
    captureSessionId: uuid(r.captureSessionId, 'captureSessionId'), observedAt: timestamp(r.observedAt, 'observedAt'),
    clientTick: integer(r.clientTick, 0, 2147483647, 'clientTick'),
    reason: oneOf(r.reason, ['LOGIN', 'RECONNECT', 'LIVE', 'STARTUP'] as const, 'reason'),
    continuity: oneOf(r.continuity, ['BASELINE', 'CONTIGUOUS', 'GAP', 'DISCONTINUITY'] as const, 'continuity'),
    previousEventId: r.previousEventId === null ? null : str(r.previousEventId, 'previousEventId'),
    slot: integer(r.slot, 0, 7, 'slot'), offerId: r.offerId === null ? null : uuid(r.offerId, 'offerId'), state,
    itemId: nullableInteger('itemId', 1), totalQuantity: nullableInteger('totalQuantity', 1), quantitySold: nullableInteger('quantitySold', 0),
    limitPriceGp: r.limitPriceGp === null ? null : decimal(r.limitPriceGp, 'limitPriceGp'),
    spentGp: r.spentGp === null ? null : decimal(r.spentGp, 'spentGp'), collection: oneOf(r.collection, ['UNKNOWN'], 'collection'),
  };
  const fields = [result.offerId, result.itemId, result.totalQuantity, result.quantitySold, result.limitPriceGp, result.spentGp];
  if (state === 'EMPTY' ? fields.some(v => v !== null) : fields.some(v => v === null)) fail('event: invalid empty/populated null semantics');
  if (result.quantitySold !== null && result.quantitySold > result.totalQuantity!) fail('quantitySold exceeds totalQuantity');
  if (result.previousEventId !== null) {
    const prefix = `${sourceId}:`;
    if (!result.previousEventId.startsWith(prefix) || BigInt(decimal(result.previousEventId.slice(prefix.length), 'previousEventId')) >= BigInt(seq)) fail('previousEventId: must reference earlier event in source');
  }
  if ((result.continuity === 'CONTIGUOUS' || result.continuity === 'GAP') && result.previousEventId === null) fail('continuity requires previousEventId');
  return result;
}
const scopeKey = (e: EvidenceScope) => JSON.stringify([e.accountScopeId, e.profileType]);
const slotKey = (e: RuneLiteEvidenceEvent) => JSON.stringify([e.sourceId, e.accountScopeId, e.profileType, e.slot]);
const compare = (a: RuneLiteEvidenceEvent, b: RuneLiteEvidenceEvent) => a.sourceId.localeCompare(b.sourceId) || (BigInt(a.seq) < BigInt(b.seq) ? -1 : BigInt(a.seq) > BigInt(b.seq) ? 1 : 0);
function canonical(e: RuneLiteEvidenceEvent): string { return JSON.stringify(event(e)); }
function uniqueEvents(events: readonly RuneLiteEvidenceEvent[]): RuneLiteEvidenceEvent[] {
  if (!Array.isArray(events) || events.length > EVIDENCE_LIMITS.events * 2) fail('evidence exceeds event limit');
  const map = new Map<string, RuneLiteEvidenceEvent>();
  for (const raw of events) {
    const e = event(raw), old = map.get(e.eventId);
    if (old && canonical(old) !== canonical(e)) fail(`conflicting eventId: ${e.eventId}`);
    map.set(e.eventId, e);
  }
  const sorted = [...map.values()].sort(compare), latest = new Map<string, RuneLiteEvidenceEvent>();
  for (const e of sorted) {
    const previous = e.previousEventId === null ? undefined : map.get(e.previousEventId);
    if (previous && slotKey(previous) !== slotKey(e)) fail('previousEventId: scope or slot mismatch');
    const last = latest.get(slotKey(e));
    if (previous && last?.eventId !== previous.eventId) fail('previousEventId: skips a retained slot observation');
    if (!previous && last && e.previousEventId !== null && BigInt(e.previousEventId.slice(e.sourceId.length + 1)) < BigInt(last.seq)) fail('previousEventId: skips a retained slot observation');
    latest.set(slotKey(e), e);
  }
  const offers = new Map<string, string>();
  for (const e of sorted) if (e.offerId !== null) {
    const key = `${e.sourceId}:${e.offerId}`, owner = offers.get(key);
    if (owner && owner !== slotKey(e)) fail('offerId reused across scope or slot');
    offers.set(key, slotKey(e));
  }
  return sorted;
}
function ranges(value: unknown, path: string): EvidenceRange[] {
  return array(value, EVIDENCE_LIMITS.ranges, path).map(v => {
    const r = record(v, ['sourceId', 'fromSeq', 'toSeq'], path);
    const result = { sourceId: uuid(r.sourceId, path), fromSeq: decimal(r.fromSeq, path), toSeq: decimal(r.toSeq, path) };
    if (BigInt(result.fromSeq) > BigInt(result.toSeq)) fail(`${path}: reversed range`);
    return result;
  });
}
/** Throws EvidenceError. Exact fields reject accidental private identity exports. */
export function decodeRuneLiteEvidence(json: string): RuneLiteEvidenceExport {
  if (typeof json !== 'string' || json.length > EVIDENCE_LIMITS.fileBytes || new TextEncoder().encode(json).length > EVIDENCE_LIMITS.fileBytes) fail('file exceeds byte limit');
  let parsed: unknown; try { parsed = JSON.parse(json); } catch { return fail('invalid JSON'); }
  const r = record(parsed, ['format', 'schemaVersion', 'pluginVersion', 'runeLiteVersion', 'exportedAt', 'accountScopes', 'retainedSequenceRanges', 'sequenceGaps', 'events'], 'export');
  if (r.format !== RUNELITE_EVIDENCE_FORMAT || r.schemaVersion !== 1) fail('unsupported evidence format/version');
  const accountScopes = array(r.accountScopes, EVIDENCE_LIMITS.scopes, 'accountScopes').map(v => {
    const s = record(v, ['accountScopeId', 'profileType'], 'scope');
    return { accountScopeId: uuid(s.accountScopeId, 'accountScopeId'), profileType: str(s.profileType, 'profileType') };
  });
  const scopes = new Set(accountScopes.map(scopeKey));
  if (scopes.size !== accountScopes.length) fail('duplicate account scope');
  const retainedSequenceRanges = ranges(r.retainedSequenceRanges, 'retainedSequenceRanges'), sequenceGaps = ranges(r.sequenceGaps, 'sequenceGaps');
  const events = uniqueEvents(array(r.events, EVIDENCE_LIMITS.events, 'events').map(event));
  const contains = (range: EvidenceRange, e: RuneLiteEvidenceEvent) => range.sourceId === e.sourceId && BigInt(range.fromSeq) <= BigInt(e.seq) && BigInt(range.toSeq) >= BigInt(e.seq);
  for (const e of events) {
    if (!scopes.has(scopeKey(e))) fail('event has undeclared account scope');
    if (!retainedSequenceRanges.some(range => contains(range, e))) fail('event outside retained sequence ranges');
    if (sequenceGaps.some(range => contains(range, e))) fail('event inside declared sequence gap');
  }
  return { format: RUNELITE_EVIDENCE_FORMAT, schemaVersion: 1, pluginVersion: str(r.pluginVersion, 'pluginVersion'), runeLiteVersion: str(r.runeLiteVersion, 'runeLiteVersion'), exportedAt: timestamp(r.exportedAt, 'exportedAt'), accountScopes, retainedSequenceRanges, sequenceGaps, events };
}
export interface EvidencePreviewRow {
  eventId: string; previousEventId: string | null; kind: 'EMPTY' | 'BASELINE' | 'CONTIGUOUS' | 'GAP' | 'DISCONTINUITY';
  deltaQuantity: number | null; deltaSpentGp: string | null;
  actualTaxGp: null; actualNetGp: null; collection: 'UNKNOWN';
  legacyAppSupported: boolean; issues: string[];
}
export interface EvidencePreview { rows: EvidencePreviewRow[]; sequenceGaps: EvidenceRange[] }
function compatible(a: RuneLiteEvidenceEvent, b: RuneLiteEvidenceEvent): boolean {
  const side = (s: State) => s === 'BUYING' || s === 'BOUGHT' || s === 'CANCELLED_BUY' ? 'BUY' : 'SELL';
  return a.state !== 'EMPTY' && b.state !== 'EMPTY' && a.offerId === b.offerId && a.itemId === b.itemId && a.totalQuantity === b.totalQuantity && a.limitPriceGp === b.limitPriceGp && side(a.state) === side(b.state);
}
/** Preserve these fields with inbox events across overlapping imports. */
export interface EvidenceInbox {
  events: readonly RuneLiteEvidenceEvent[];
  retainedSequenceRanges: EvidenceRange[];
  sequenceGaps: EvidenceRange[];
}
type EvidenceInput = readonly RuneLiteEvidenceEvent[] | EvidenceInbox;
function inbox(input: EvidenceInput): EvidenceInbox {
  if (Array.isArray(input)) return { events: input, retainedSequenceRanges: [], sequenceGaps: [] };
  const value = input as EvidenceInbox;
  return { events: value.events, retainedSequenceRanges: ranges(value.retainedSequenceRanges, 'retainedSequenceRanges'), sequenceGaps: ranges(value.sequenceGaps, 'sequenceGaps') };
}
function unionRanges(input: EvidenceRange[]): EvidenceRange[] {
  const sorted = [...input].sort((a, b) => a.sourceId.localeCompare(b.sourceId) || (BigInt(a.fromSeq) < BigInt(b.fromSeq) ? -1 : BigInt(a.fromSeq) > BigInt(b.fromSeq) ? 1 : 0));
  const result: EvidenceRange[] = [];
  for (const range of sorted) {
    const last = result[result.length - 1];
    if (last?.sourceId === range.sourceId && BigInt(range.fromSeq) <= BigInt(last.toSeq) + BigInt(1)) {
      if (BigInt(range.toSeq) > BigInt(last.toSeq)) last.toSeq = range.toSeq;
    } else result.push({ ...range });
  }
  return result;
}
/** Retained observations from overlapping exports fill declared missing observations. */
function missingRanges(input: EvidenceRange[], events: RuneLiteEvidenceEvent[]): EvidenceRange[] {
  const result: EvidenceRange[] = [];
  for (const range of unionRanges(input)) {
    let next = BigInt(range.fromSeq);
    const end = BigInt(range.toSeq);
    for (const e of events) {
      if (e.sourceId !== range.sourceId || BigInt(e.seq) < next || BigInt(e.seq) > end) continue;
      const seq = BigInt(e.seq);
      if (seq > next) result.push({ sourceId: range.sourceId, fromSeq: next.toString(), toSeq: (seq - BigInt(1)).toString() });
      next = seq + BigInt(1);
    }
    if (next <= end) result.push({ sourceId: range.sourceId, fromSeq: next.toString(), toSeq: end.toString() });
  }
  return result;
}
/** Raw cumulative changes only: never execution rows, tax estimates, or collection claims. */
export function previewRuneLiteEvidence(input: EvidenceInput): EvidencePreview {
  const metadata = inbox(input);
  const events = uniqueEvents(metadata.events), byId = new Map(events.map(e => [e.eventId, e]));
  const sequenceGaps: EvidenceRange[] = [];
  let last: RuneLiteEvidenceEvent | undefined;
  for (const e of events) {
    if (last?.sourceId === e.sourceId && BigInt(e.seq) > BigInt(last.seq) + BigInt(1)) sequenceGaps.push({ sourceId: e.sourceId, fromSeq: (BigInt(last.seq) + BigInt(1)).toString(), toSeq: (BigInt(e.seq) - BigInt(1)).toString() });
    last = e;
  }
  const gaps = missingRanges([...sequenceGaps, ...metadata.sequenceGaps, ...metadata.retainedSequenceRanges], events);
  const rows = events.map(e => {
    const issues: string[] = [], previous = e.previousEventId === null ? undefined : byId.get(e.previousEventId);
    let kind: EvidencePreviewRow['kind'] = e.state === 'EMPTY' ? 'EMPTY' : e.continuity;
    let deltaQuantity: number | null = null, deltaSpentGp: string | null = null;
    if (e.previousEventId && !previous) issues.push('Previous observation unavailable; continuity unverified');
    const legacyAppSupported = [e.limitPriceGp, e.spentGp].every(v => v === null || BigInt(v) <= BigInt(2147483647));
    if (!legacyAppSupported) issues.push('Unsupported by legacy app monetary bounds; raw decimal evidence retained');
    const regression = previous && e.offerId !== null && e.offerId === previous.offerId && previous.quantitySold !== null && previous.spentGp !== null && (e.quantitySold! < previous.quantitySold || BigInt(e.spentGp!) < BigInt(previous.spentGp));
    if (regression) {
      kind = 'DISCONTINUITY'; issues.push('Cumulative counter regression; reconciliation required');
    } else if (e.state !== 'EMPTY' && (e.continuity === 'CONTIGUOUS' || e.continuity === 'GAP')) {
      if (!previous) kind = 'BASELINE';
      else if (!compatible(previous, e) || e.quantitySold! < previous.quantitySold! || BigInt(e.spentGp!) < BigInt(previous.spentGp!)) {
        kind = 'DISCONTINUITY'; issues.push('Incompatible lifecycle or cumulative counter regression; reconciliation required');
      } else {
        const sourceGap = gaps.some(g => g.sourceId === e.sourceId && BigInt(g.fromSeq) > BigInt(previous.seq) && BigInt(g.toSeq) < BigInt(e.seq));
        kind = e.continuity === 'GAP' || sourceGap || previous.captureSessionId !== e.captureSessionId ? 'GAP' : 'CONTIGUOUS';
        deltaQuantity = e.quantitySold! - previous.quantitySold!;
        deltaSpentGp = (BigInt(e.spentGp!) - BigInt(previous.spentGp!)).toString();
      }
    }
    return { eventId: e.eventId, previousEventId: e.previousEventId, kind, deltaQuantity, deltaSpentGp, actualTaxGp: null, actualNetGp: null, collection: 'UNKNOWN' as const, legacyAppSupported, issues };
  });
  return { rows, sequenceGaps: gaps };
}
/** Pure inbox merge. Pass the returned inbox to retain metadata on later imports. */
export function mergeRuneLiteEvidence(existing: EvidenceInput, incoming: RuneLiteEvidenceExport): EvidenceInbox & { events: RuneLiteEvidenceEvent[]; added: number; duplicates: number; preview: EvidencePreview } {
  const prior = inbox(existing), validated = decodeRuneLiteEvidence(JSON.stringify(incoming));
  if (prior.events.length + validated.events.length > EVIDENCE_LIMITS.events * 2) fail('merge exceeds event limit');
  const before = uniqueEvents(prior.events), events = uniqueEvents([...before, ...validated.events]);
  if (events.length > EVIDENCE_LIMITS.events) fail('merged evidence exceeds event limit');
  const retainedSequenceRanges = unionRanges([...prior.retainedSequenceRanges, ...validated.retainedSequenceRanges]);
  const sequenceGaps = missingRanges([...prior.sequenceGaps, ...validated.sequenceGaps], events);
  const merged = { events, retainedSequenceRanges, sequenceGaps };
  return { ...merged, added: events.length - before.length, duplicates: validated.events.length - (events.length - before.length), preview: previewRuneLiteEvidence(merged) };
}
