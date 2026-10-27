import type { ProcessingSession } from '../../lib/processingSessions.ts'
import { recordedPaceRecipeKey, summarizeRecordedPace } from '../../lib/recordedPace.ts'

type Recipe = ProcessingSession['recipe']

/** One history generation per saved-session/time-window change. Planning controls are
 * deliberately absent. Each exact snapshot is summarized at most once, on demand.
 * Exclusions describe that snapshot's group, not unrelated recipes in the repository.
 */
export function createRecordedPaceHistory(
  sessions: readonly ProcessingSession[],
  options: { now: number; lookbackDays: number },
  summarize = summarizeRecordedPace,
) {
  const groups = new Map<string, ProcessingSession[]>()
  const summaries = new Map<string, ReturnType<typeof summarizeRecordedPace>>()
  for (const session of sessions) {
    try {
      const key = recordedPaceRecipeKey(session.recipe)
      const group = groups.get(key)
      if (group) group.push(session)
      else groups.set(key, [session])
    } catch {
      // Unreadable snapshots cannot match any catalog recipe. Do not retry them
      // for every recipe or planning render; other invalid records are excluded
      // once by the canonical summarizer for their group.
    }
  }
  return {
    summary(recipe: Recipe) {
      const key = recordedPaceRecipeKey(recipe)
      let result = summaries.get(key)
      if (!result) {
        result = summarize(groups.get(key) ?? [], recipe, options)
        summaries.set(key, result)
      }
      return result
    },
  }
}
