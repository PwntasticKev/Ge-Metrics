import { interruptTimer, type RecorderSession } from './model.ts'

export type Recovery = { draft: RecorderSession; committed: RecorderSession; editing: 'draft' | 'committed' }
/** Loading never rebases the draft or changes either snapshot's revision. */
export function recoveryFor(draft: RecorderSession, committed: RecorderSession): Recovery {
  if (draft.id !== committed.id) throw new Error('Recovery snapshots must belong to the same session.')
  return { draft, committed: interruptTimer(committed), editing: 'draft' }
}
export function chooseRecovery(recovery: Recovery, editing: Recovery['editing']): Recovery {
  return { ...recovery, editing }
}
export function recoverySnapshot(recovery: Recovery): RecorderSession {
  return recovery[recovery.editing]
}
export function canRetryRecovery(recovery: Recovery): boolean {
  return recovery.editing === 'committed' || (recovery.draft.revision ?? 0) === (recovery.committed.revision ?? 0)
}
