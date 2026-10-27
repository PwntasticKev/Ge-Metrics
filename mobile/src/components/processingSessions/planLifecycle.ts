import type { PlanRead } from '../../lib/processingPlan.ts'
import type { RecorderSession } from './model.ts'
export function isInitiallyUnsaved(initial: RecorderSession, committed: RecorderSession | null | undefined, pending: boolean) {
  return pending || !committed || JSON.stringify(initial) !== JSON.stringify(committed)
}
export function initialPlanMessage(read: PlanRead): string {
  switch (read.status) {
    case 'missing': return 'Original quote plan was not saved for this session. These are saved actual receipts and costs.'
    case 'valid': return 'Initial quote plan was captured. Plan comparison is not available; these are saved actual receipts and costs.'
    case 'unsupported': return 'Initial quote plan uses an unsupported version and is unavailable here. These are saved actual receipts and costs; no plan comparison is available.'
    case 'invalid': return 'Initial quote plan is unavailable because its saved evidence could not be validated. These are saved actual receipts and costs; no plan comparison is available.'
  }
}
