import { summarizeProcessingResults } from '../../lib/processingResults.ts'
import type { ProcessingSession } from '../../lib/processingSessions.ts'
import type { DecodedProcessingSessions } from '../../lib/processingSessionStorage.ts'

/** Keep every durable row, including malformed same-ID copies, for core validation.
 * The core accepts a narrower static type but validates unknown JSON rows at runtime
 * before deriving results. This localized boundary must not filter or deduplicate.
 */
export function summarizeDurableRows(rows: readonly unknown[], options: Parameters<typeof summarizeProcessingResults>[1]) {
  return summarizeProcessingResults(rows as readonly ProcessingSession[], options)
}

export function processingResultsSnapshot(result: DecodedProcessingSessions, options: Parameters<typeof summarizeProcessingResults>[1]) {
  const rows = result.document.sessions
  return {
    summary: summarizeDurableRows(rows, options),
    rawCount: rows.length,
    readableCount: rows.length - result.invalidRecords.length,
    unreadableRetainedCount: result.invalidRecords.length,
  }
}
