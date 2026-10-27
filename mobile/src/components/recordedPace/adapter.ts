import type { DecodedProcessingSessions } from '../../lib/processingSessionStorage.ts'
import { deriveProcessingSession, type ProcessingSession } from '../../lib/processingSessions.ts'
import { validateRecorderExtension } from '../processingSessions/validation.ts'

// Exact JSON identity includes retained fields and revisions, ignoring object key order.
// The depth bound also rejects cyclic/deep records independently of their neighbours.
function fingerprint(value: unknown, depth = 0): string {
  if (depth > 100) throw new RangeError('Saved record is too deep')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(row => fingerprint(row, depth + 1)).join(',')}]`
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${fingerprint((value as Record<string, unknown>)[key], depth + 1)}`).join(',')}}`
  }
  throw new RangeError('Invalid saved record')
}

/** Inspect raw durable rows before storage's last-wins projection loses conflicts.
 * This validates records only; ended/confirmed pace eligibility stays in the pace core,
 * independently of sales settlement and financial completeness. No storage effects.
 */
export function recordedPaceSnapshot(result: DecodedProcessingSessions) {
  const unreadable = new Set(result.invalidRecords.map(row => row.index))
  const rows = result.document.sessions.map((row, index) => {
    const id = row !== null && typeof row === 'object' && 'id' in row && typeof row.id === 'string' ? row.id : null
    let key: string | null = null
    let valid = false
    try {
      key = fingerprint(row)
      const candidate = row as ProcessingSession & { revision?: number }
      deriveProcessingSession(candidate)
      validateRecorderExtension(candidate)
      if (Object.hasOwn(candidate, 'revision') && (!Number.isSafeInteger(candidate.revision) || candidate.revision! < 0)) throw new RangeError('Invalid revision')
      valid = !unreadable.has(index)
    } catch { /* Retain identity even when this copy cannot be validated. */ }
    return { row, id, key, valid }
  })
  const identities = new Map<string, typeof rows>()
  for (const row of rows) {
    if (row.id) {
      const copies = identities.get(row.id) ?? []
      copies.push(row)
      identities.set(row.id, copies)
    }
  }
  const sessions: ProcessingSession[] = []
  let excludedCount = 0
  for (const row of rows) {
    const copies = row.id ? identities.get(row.id)! : [row]
    const conflict = copies.length > 1 && copies.some(copy => !copy.valid || copy.key === null || copy.key !== copies[0].key)
    if (conflict || !row.valid) { excludedCount++; continue }
    if (copies[0] === row) sessions.push(row.row as ProcessingSession)
  }
  return { sessions, excludedCount }
}
