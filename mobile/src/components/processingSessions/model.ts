import { deriveProcessingSession, type ProcessingSession } from '../../lib/processingSessions.ts'

import { validateRecorderExtension } from './validation.ts'

type Input = ProcessingSession['inputs'][number]
type Output = ProcessingSession['outputs'][number]
export type Actuals = {
  inputs: (Omit<Input, 'acquiredQty' | 'consumedQty'> & { acquiredQty: number | null; consumedQty: number | null })[]
  outputs: (Omit<Output, 'producedQty'> & { producedQty: number | null })[]
}
export type RecorderSession = ProcessingSession & { recorder: Actuals; revision?: number }
export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
export function newSession(recipe: ProcessingSession['recipe'], id = makeId()): RecorderSession {
  return { id, recipe, status: 'draft', processingStartedAt: null, processingEndedAt: null, elapsedTimeConfirmed: true,
    pauses: [], externalGeWaits: [], actionsCompleted: null, inputs: [], outputs: [], processingFeesGp: null, otherExpensesGp: null, directCoinReceiptsGp: null, sales: [],
    recorder: { inputs: recipe.inputs.map((item, i) => ({ id: `input-${i}`, item, acquiredQty: null, consumedQty: null, origin: 'purchased', acquisitionCostGp: null, consumedCostGp: null, opportunityValueGp: null })), outputs: recipe.outputs.map((item, i) => ({ id: `output-${i}`, item, producedQty: null })) } }
}
export function asRecorder(s: ProcessingSession): RecorderSession {
  validateRecorderExtension(s)
  const existing = s as RecorderSession
  return existing.recorder ? existing : { ...s, recorder: { inputs: s.inputs.length ? s.inputs : newSession(s.recipe).recorder.inputs, outputs: s.outputs.length ? s.outputs : newSession(s.recipe).recorder.outputs } }
}
export function completeQuantities(s: RecorderSession) {
  validateRecorderExtension(s)
  return s.recorder.inputs.every(i => i.acquiredQty !== null && i.consumedQty !== null) && s.recorder.outputs.every(o => o.producedQty !== null)
}
export function confirmActuals(s: RecorderSession, recorder: Actuals): RecorderSession {
  validateRecorderExtension({ recorder })
  const next = { ...s, status: s.status === 'settled' ? 'processed' as const : s.status, recorder,
    inputs: recorder.inputs.filter(i => i.acquiredQty !== null && i.consumedQty !== null) as Input[],
    outputs: recorder.outputs.filter(o => o.producedQty !== null) as Output[] }
  deriveProcessingSession(next)
  return next
}
export type TimerAction = 'start' | 'ge_wait' | 'break_other' | 'resume' | 'end' | 'confirm_elapsed' | 'settle'
export function transition(s: RecorderSession, action: TimerAction, now: number): RecorderSession {
  validateRecorderExtension(s)
  const next: RecorderSession = { ...s, pauses: s.pauses.map(p => ({ ...p })) }
  const open = next.pauses.find(p => p.endedAt === null)
  const require = (condition: boolean) => { if (!condition) throw new Error('This action is not available in the current session state.') }
  if (action === 'start') { require(s.status === 'draft'); next.status = 'processing'; next.processingStartedAt = now }
  else if (action === 'confirm_elapsed') { require(s.status === 'processing'); next.elapsedTimeConfirmed = true }
  else if (action === 'settle') { require(completeQuantities(s) && deriveProcessingSession(s, now).canSettle); next.status = 'settled' }
  else {
    require(s.status === 'processing' && s.elapsedTimeConfirmed)
    if (action === 'resume') { require(!!open); open!.endedAt = now }
    else if (action === 'end') { if (open) open.endedAt = now; next.status = 'processed'; next.processingEndedAt = now }
    else { require(!open && next.pauses.length < 100); next.pauses.push({ id: makeId(), startedAt: now, endedAt: null, reason: action }) }
  }
  deriveProcessingSession(next, now)
  return next
}
export function parseWhole(value: string): number | null {
  if (value.trim() === '') return null
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) throw new Error('Use whole, non-negative quantities and GP (or leave unknown).')
  return Number(value)
}

/** Leaving the route or returning from background never confirms unattended time. */
export function interruptTimer(s: RecorderSession): RecorderSession {
  return s.processingStartedAt !== null && s.processingEndedAt === null ? { ...s, elapsedTimeConfirmed: false } : s
}
