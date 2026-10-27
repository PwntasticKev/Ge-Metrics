import type { ProcessingSessionsResult } from '../../lib/processingSessionStorage.ts'
import { recordedPaceSnapshot } from '../recordedPace/adapter.ts'
import { asRecorder, type RecorderSession } from './model.ts'

/** Reuse the existing bounded raw identity guard, including malformed same-ID copies. */
export function committedExplanationSnapshot(result: ProcessingSessionsResult, id: string): RecorderSession | null {
  if (!result.ok) return null
  const saved = recordedPaceSnapshot(result).sessions.find(s => s.id === id)
  return saved ? asRecorder(saved) : null
}
export function canExplainCommitted(current: RecorderSession, committed: RecorderSession | null, state: { busy: boolean; unsaved: boolean; recovery: boolean; error: boolean; editing: boolean }) {
  return !!committed && !Object.values(state).some(Boolean) && JSON.stringify(current) === JSON.stringify(committed)
}
