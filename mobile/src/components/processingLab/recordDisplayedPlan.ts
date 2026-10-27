import { captureInitialPlan, type DisplayedPlanInput } from '../../lib/processingPlan.ts'
import type { ProcessingSessionsResult } from '../../lib/processingSessionStorage.ts'
import { committedExplanationSnapshot } from '../processingSessions/explanationSelection.ts'
import { makeId, newSession, type RecorderSession } from '../processingSessions/model.ts'

type Repository = { load(): Promise<ProcessingSessionsResult>; upsert(session: RecorderSession): Promise<ProcessingSessionsResult> }
type Result = { status: 'busy' } | { status: 'unavailable' | 'failed'; reason: string } | { status: 'saved'; session: RecorderSession }
// Canonical JSON equality includes all retained fields, not just the readable projection.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(value)
}
/** One instance per intentional action. Capture/reservation happens before the first await.
 * Failed/uncertain writes and failed navigation always reuse this exact ID and payload.
 */
export function createPlanRecording(repository: Repository, id = makeId, now = Date.now) {
  let draft: RecorderSession | null = null
  let saved: RecorderSession | null = null
  let busy = false
  let attempted = false
  function verify(result: ProcessingSessionsResult): RecorderSession | null {
    const candidate = committedExplanationSnapshot(result, draft!.id)
    return candidate && candidate.revision === 1 && canonical(candidate) === canonical({ ...draft, revision: 1 }) ? candidate : null
  }
  return {
    /** Release only the in-memory reservation; a possibly committed draft is never changed. */
    abandon(): boolean {
      if (busy) return false
      draft = null
      saved = null
      attempted = false
      return true
    },
    async run(displayed: () => DisplayedPlanInput): Promise<Result> {
      if (busy) return { status: 'busy' }
      busy = true
      try {
        if (saved) return { status: 'saved', session: saved }
        if (!draft) {
          try {
            const input = displayed()
            const captured = captureInitialPlan(input, now())
            if (!captured.ok) return { status: 'unavailable', reason: captured.reason }
            draft = { ...newSession(JSON.parse(JSON.stringify(input.recipe)), id()), initialPlan: captured.plan }
          } catch (error) { return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) } }
        }
        {
          const loaded = await repository.load()
          if (!loaded.ok) throw loaded.error
          const existing = loaded.sourceRecords.some(r => r !== null && typeof r === 'object' && 'id' in r && r.id === draft!.id)
          if (existing) {
            if (!attempted) throw new Error('Reserved session ID already exists. No existing session was changed.')
            saved = verify(loaded)
            if (!saved) throw new Error('Reserved draft has conflicting saved evidence. Open Recent sessions to review; no replacement was created.')
            return { status: 'saved', session: saved }
          }
        }
        attempted = true
        const result = await repository.upsert(draft)
        if (!result.ok) throw result.error
        saved = verify(result)
        if (!saved) throw new Error('Saved draft could not be uniquely verified. Retry verification or open Recent sessions.')
        return { status: 'saved', session: saved }
      } catch (error) { return { status: 'failed', reason: error instanceof Error ? error.message : String(error) } }
      finally { busy = false }
    }
  }
}

/** Copy the selected row's observations; this never recalculates a quote or a rate. */
export function displayedQuotes(recipe: DisplayedPlanInput['recipe'], original: import('@ge/engine').Market, quoted: import('@ge/engine').Market, modes: { inputs: 'instant' | 'patient'; outputs: 'instant' | 'patient' }, day: import('../../lib/processingLab.ts').Averages, latestUpdatedAt: number | null, h24UpdatedAt: number | null): DisplayedPlanInput['quotes'] {
  return [...recipe.inputs, ...recipe.outputs].map((row, index) => {
    const input = index < recipe.inputs.length
    const mode = input ? modes.inputs : modes.outputs
    const item = original.get(row.itemId)
    const unitPriceGp = quoted.get(row.itemId)?.[input ? 'low' : 'high']
    if (unitPriceGp == null) throw new Error('Selected displayed quote is unavailable.')
    const trade = item?.[input ? 'highTime' : 'lowTime']
    return { itemId: row.itemId, qtyPerAction: row.qtyPerAction, mode,
      source: mode === 'instant' ? input ? 'latest-high' : 'latest-low' : input ? '24h-avg-low' : '24h-avg-high', unitPriceGp,
      quoteTradeAtMs: mode === 'instant' && trade != null ? trade * 1000 : null,
      sourceDataUpdatedAtMs: mode === 'instant' ? latestUpdatedAt : h24UpdatedAt,
      averagePeriod: mode === 'patient' ? { windowSeconds: 86400, startAtMs: null, endAtMs: null } : null,
      averageSideVolume: mode === 'patient' ? day?.[row.itemId]?.[input ? 'lowPriceVolume' : 'highPriceVolume'] ?? null : null }
  })
}
