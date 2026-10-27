import { assertPlanJson, processingRecipeExecutionKey, validateNewInitialPlan } from './processingPlan.ts'
import { deriveProcessingSession, type ProcessingSession } from './processingSessions.ts'

import { validateRecorderExtension } from '../components/processingSessions/validation.ts'

/** Missing revision means legacy/new revision 0. Pass the returned saved snapshot to every later upsert. */
export type RevisionedProcessingSession = ProcessingSession & { revision?: number }
export class ProcessingSessionConflictError extends Error {
  constructor(reason?: string) { super(reason ? `Conflict: ${reason}; your edit remains unsaved.` : 'Conflict: this session changed since it was loaded. Your edit is unsaved. Reopen the saved record and reconcile your changes.'); this.name = 'ProcessingSessionConflictError' }
}
const revisionOf = (session: RevisionedProcessingSession) => session.revision ?? 0
function validateRevision(session: RevisionedProcessingSession) {
  if (Object.hasOwn(session, 'revision') && (!Number.isSafeInteger(session.revision) || session.revision! < 0)) throw new Error('Invalid session revision')
}

export const PROCESSING_SESSIONS_KEY = 'gem.processingSessions.v1'
export interface AsyncStringStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}
export type StorageFailure = { ok: false; error: Error }
export interface DecodedProcessingSessions {
  ok: true
  sessions: RevisionedProcessingSession[]
  /** Retained verbatim on subsequent saves, including records from a newer schema. */
  invalidRecords: { index: number; record: unknown; error: Error }[]
  /** Untouched parsed records, before timer-recovery normalization. Used only for save guards. */
  sourceRecords: unknown[]
  document: { version: 1; sessions: unknown[]; [key: string]: unknown }
}
export type ProcessingSessionsResult = DecodedProcessingSessions | StorageFailure
const failure = (error: unknown): StorageFailure => ({ ok: false, error: error instanceof Error ? error : new Error(String(error)) })

/** Decode records independently. Never repair or rewrite storage as a side effect. */
export function decodeProcessingSessions(raw: string | null): ProcessingSessionsResult {
  try {
    const document = raw === null ? { version: 1, sessions: [] } : JSON.parse(raw)
    if (!document || document.version !== 1 || !Array.isArray(document.sessions)) {
      throw new Error('Unsupported or malformed processing sessions document')
    }
    const sessions = new Map<string, RevisionedProcessingSession>()
    const invalidRecords: DecodedProcessingSessions['invalidRecords'] = []
    const records = document.sessions.map((record: unknown, index: number) => {
      try {
        // Runtime validation deliberately goes through the same domain derivation as edits.
        const candidate = record as RevisionedProcessingSession
        deriveProcessingSession(candidate)
        validateRevision(candidate)
        validateRecorderExtension(candidate)
        const recovered = candidate.processingStartedAt !== null && candidate.processingEndedAt === null
          ? { ...candidate, elapsedTimeConfirmed: false } : candidate
        sessions.set(recovered.id, recovered)
        return recovered
      } catch (error) {
        invalidRecords.push({ index, record, error: failure(error).error })
        return record
      }
    })
    return { ok: true, sessions: [...sessions.values()], invalidRecords, sourceRecords: document.sessions, document: { ...document, sessions: records } }
  } catch (error) { return failure(error) }
}

/** Full parsed-JSON equality: object key order is irrelevant; array order is significant.
 * Refuse excessively deep duplicate comparisons rather than risking a lossy save.
 */
function sameRawRecord(left: unknown, right: unknown, depth = 0): boolean {
  if (left === right) return true
  if (depth >= 100 || left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => sameRawRecord(value, right[index], depth + 1))
  }
  const a = left as Record<string, unknown>; const b = right as Record<string, unknown>
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length
    && keys.every(key => Object.hasOwn(b, key) && sameRawRecord(a[key], b[key], depth + 1))
}

/** Edited arrays are authoritative; only rows with the same stable identity inherit fields. */
function mergeRetainedFields(previous: unknown, edited: unknown): unknown {
  const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
  const identity = (row: unknown) => {
    if (!isObject(row)) return undefined
    if (Object.hasOwn(row, 'id') && typeof row.id === 'string') return `id:${row.id}`
    if (Object.hasOwn(row, 'itemId') && typeof row.itemId === 'number') return `itemId:${row.itemId}`
    return undefined
  }
  if (Array.isArray(edited)) {
    if (!Array.isArray(previous)) return edited
    const retained = new Map(previous.map(row => [identity(row), row]))
    return edited.map(row => {
      const key = identity(row)
      return key === undefined ? row : mergeRetainedFields(retained.get(key), row)
    })
  }
  if (!isObject(previous) || !isObject(edited)) return edited
  // fromEntries creates own data properties, even for keys such as __proto__.
  return Object.fromEntries([...new Set([...Object.keys(previous), ...Object.keys(edited)])].map(key => [
    key,
    Object.hasOwn(edited, key)
      ? mergeRetainedFields(Object.hasOwn(previous, key) ? previous[key] : undefined, edited[key])
      : previous[key],
  ]))
}

/** Share one repository per storage key. All reads and read/modify/writes are serialized.
 * A failed write never advances local state; the next operation reads durable storage again.
 */
export function createProcessingSessionRepository(storage: AsyncStringStorage, now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve()
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation)
    queue = result.catch(() => undefined)
    return result
  }
  async function read(): Promise<ProcessingSessionsResult> {
    try { return decodeProcessingSessions(await storage.getItem(PROCESSING_SESSIONS_KEY)) }
    catch (error) { return failure(error) }
  }
  return {
    load: (): Promise<ProcessingSessionsResult> => serialize(read),
    /** Compare expected snapshot revision inside the queue; conflicts never write or rebase. */
    upsert(session: RevisionedProcessingSession): Promise<ProcessingSessionsResult> {
      // Snapshot before queueing so later caller mutations cannot change a pending save.
      let snapshot: RevisionedProcessingSession
      try {
        if (Object.hasOwn(session, 'initialPlan')) {
          const property = Object.getOwnPropertyDescriptor(session, 'initialPlan')!
          if (!('value' in property) || !property.enumerable) throw new Error('Plan accessors are forbidden')
          assertPlanJson(property.value, false)
        }
        snapshot = JSON.parse(JSON.stringify(session))
        deriveProcessingSession(snapshot)
        validateRevision(snapshot)
        validateRecorderExtension(snapshot)
      } catch (error) { return Promise.resolve(failure(error)) }
      return serialize(async () => {
        const loaded = await read()
        if (!loaded.ok) return loaded
        // Inspect the untouched snapshot inside the queue: recovery can hide raw differences.
        const invalidIndexes = new Set(loaded.invalidRecords.map(record => record.index))
        const matches = loaded.sourceRecords.flatMap((record, index) =>
          record !== null && typeof record === 'object' && 'id' in record && record.id === snapshot.id
            ? [{ record, index }] : [])
        if (matches.some(({ index }) => invalidIndexes.has(index))) return failure(new ProcessingSessionConflictError('unreadable saved session with this ID'))
        if (matches.some(({ record }) => !sameRawRecord(matches[0].record, record))) return failure(new ProcessingSessionConflictError('saved copies with this ID differ'))
        const existing = loaded.sessions.find(s => s.id === snapshot.id)
        if (existing && revisionOf(existing) !== revisionOf(snapshot) || !existing && revisionOf(snapshot) !== 0) return failure(new ProcessingSessionConflictError())
        // Guard raw committed evidence before retained-field projection can hide deletion.
        const previous = matches[0]?.record as RevisionedProcessingSession | undefined
        if (previous) {
          if (Object.hasOwn(previous, 'initialPlan') !== Object.hasOwn(snapshot, 'initialPlan')
            || !sameRawRecord(previous.initialPlan, snapshot.initialPlan)) return failure(new ProcessingSessionConflictError('initial plan is immutable'))
          if (Object.hasOwn(previous, 'initialPlan') && processingRecipeExecutionKey(previous.recipe) !== processingRecipeExecutionKey(snapshot.recipe)) return failure(new ProcessingSessionConflictError('planned recipe is immutable'))
        } else if (Object.hasOwn(snapshot, 'initialPlan')) {
          try { validateNewInitialPlan(snapshot.initialPlan, snapshot.recipe, now()) }
          catch (error) { return failure(error) }
        }
        const nextRevision = revisionOf(existing ?? snapshot) + 1
        if (!Number.isSafeInteger(nextRevision)) return failure(new Error('Session revision exhausted'))
        let replaced = false
        let committed = { ...snapshot, revision: nextRevision }
        const records: unknown[] = []
        loaded.document.sessions.forEach((record, index) => {
          if (!invalidIndexes.has(index) && (record as RevisionedProcessingSession).id === snapshot.id) {
            if (!replaced) {
              committed = { ...mergeRetainedFields(record, snapshot) as RevisionedProcessingSession, revision: nextRevision }
              // Never recursively merge evidence, including unknown nested versions/keys.
              if (Object.hasOwn(record as object, 'initialPlan')) committed.initialPlan = (record as RevisionedProcessingSession).initialPlan
              records.push(committed)
            }
            replaced = true
          } else records.push(record)
        })
        if (!replaced) records.push(committed)
        try {
          deriveProcessingSession(committed)
          validateRevision(committed)
          validateRecorderExtension(committed)
        } catch (error) { return failure(error) }
        const raw = JSON.stringify({ ...loaded.document, sessions: records })
        try {
          await storage.setItem(PROCESSING_SESSIONS_KEY, raw)
          // Return the committed edit without treating it as a fresh timer recovery.
          const result = decodeProcessingSessions(raw)
          if (result.ok) {
            result.sessions = result.sessions.map(s => s.id === snapshot.id ? committed : s)
            result.document.sessions = records
          }
          return result
        } catch (error) { return failure(error) }
      })
    }
  }
}
