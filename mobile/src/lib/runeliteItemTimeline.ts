import { previewRuneLiteEvidence, type EvidenceInbox, type EvidencePreviewRow, type RuneLiteEvidenceEvent } from './runeliteEvidence.ts';

export interface RuneLiteItemSelection {
  sourceId: string;
  accountScopeId: string;
  profileType: string;
  itemId: number;
}
export interface RuneLiteTimelineObservation {
  role: 'OBSERVATION' | 'CONTEXT';
  event: RuneLiteEvidenceEvent;
  preview: EvidencePreviewRow;
}
export interface RuneLiteItemTimelineGroup {
  key: string;
  offerId: string;
  observations: RuneLiteTimelineObservation[];
  /** Direct referenced predecessors outside this group, never additional fills. */
  context: RuneLiteTimelineObservation[];
}
/** Read-only projection of a validated snapshot. All accounting/classification stays in the full preview. */
export function selectRuneLiteItemTimeline(evidence: EvidenceInbox, selection: RuneLiteItemSelection): RuneLiteItemTimelineGroup[] {
  // Must precede filtering: excluded observations can establish gaps or incompatibility.
  const preview = previewRuneLiteEvidence(evidence);
  const events = new Map(evidence.events.map(event => [event.eventId, event]));
  const rows = new Map(preview.rows.map(row => [row.eventId, row]));
  const groups: RuneLiteItemTimelineGroup[] = [];
  const latest = new Map<string, RuneLiteItemTimelineGroup>();
  for (const row of preview.rows) {
    const event = events.get(row.eventId)!;
    if (event.sourceId !== selection.sourceId || event.accountScopeId !== selection.accountScopeId || event.profileType !== selection.profileType || event.itemId !== selection.itemId || event.offerId === null) continue;
    const identity = JSON.stringify([event.sourceId, event.accountScopeId, event.profileType, event.slot, event.offerId]);
    let group = latest.get(identity);
    const prior = group?.observations.at(-1)?.event;
    if (!group || prior?.captureSessionId !== event.captureSessionId || event.reason === 'RECONNECT') {
      group = { key: JSON.stringify([identity, event.eventId]), offerId: event.offerId, observations: [], context: [] };
      groups.push(group);
      latest.set(identity, group);
    }
    group.observations.push({ role: 'OBSERVATION', event, preview: row });
  }
  for (const group of groups) {
    const own = new Set(group.observations.map(value => value.event.eventId));
    const context = new Set<string>();
    for (const value of group.observations) {
      const id = value.event.previousEventId;
      if (id && !own.has(id) && events.has(id)) context.add(id);
    }
    group.context = [...context].map(id => ({ role: 'CONTEXT' as const, event: events.get(id)!, preview: rows.get(id)! })).sort((a, b) => BigInt(a.event.seq) < BigInt(b.event.seq) ? -1 : 1);
  }
  return groups;
}
