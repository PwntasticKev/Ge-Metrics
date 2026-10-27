import { normalizeProcessingSessionLabel } from '../../lib/processingSessionLabel.ts'
import type { RecorderSession } from './model.ts'

type LabelAction = { type: 'open'; label?: string | null } | { type: 'change'; text: string } | { type: 'close' }
/** Unsubmitted text is separate from the whole snapshot retained for save/retry. */
export function labelEditor(text: string | null, action: LabelAction): string | null {
  if (action.type === 'open') return action.label ?? ''
  if (action.type === 'close') return null
  return text === null ? null : action.text
}
/** Use the current snapshot so timer interruptions during typing are preserved. */
export function labelSnapshot(current: RecorderSession, text: string): RecorderSession {
  return { ...current, label: normalizeProcessingSessionLabel(text) }
}
