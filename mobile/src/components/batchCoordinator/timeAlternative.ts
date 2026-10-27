import { processingTimeAlternative } from '../../lib/processingTimeAlternative.ts'

export const parseTimeInput = (text: string): number | null => {
  const raw = text.trim()
  const value = Number(raw)
  return /^\d+$/.test(raw) && Number.isSafeInteger(value) ? value : null
}

/** Fractional estimates are visibly approximate; tiny nonzero values never become zero. */
export const approximate = (value: number): string => {
  if (Number.isInteger(value)) return value.toLocaleString('en-US')
  if (Math.abs(value) < 0.01) return value > 0 ? '> 0 and < 0.01' : '> -0.01 and < 0'
  return `≈ ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function timeAlternativePresentation (goal: number | null, delta: number | null, rateText: string, minutesText: string) {
  const empty = (message: string) => ({ message, threshold: '', positive: false })
  if (goal === 0) return empty('No batches selected')
  const rate = parseTimeInput(rateText)
  const minutes = parseTimeInput(minutesText)
  if (rate === null) return empty('Enter your alternative GP/hour as a safe whole nonnegative number; blank is unknown.')
  if (minutesText.trim() !== '' && minutes === null) return empty('Enter extra active minutes as a safe whole nonnegative number, or leave blank.')
  try {
    const result = processingTimeAlternative(delta, rate, minutes)
    if (result.kind === 'unknown') return empty('Unknown — incremental processing value is unavailable.')
    const threshold = result.kind === 'loss' ? 'No nonnegative break-even time: processing starts below selling now.'
      : result.breakEvenMinutes === null ? 'No finite break-even threshold at 0 GP/hour.'
        : `Break-even extra active time: ${approximate(result.breakEvenMinutes)} minutes.`
    return {
      threshold,
      message: result.surplus === null ? 'Enter optional extra active minutes to estimate surplus against your alternative.' : `Estimated surplus against alternative: ${approximate(result.surplus)} GP.`,
      positive: result.surplus !== null && result.surplus > 0
    }
  } catch {
    return empty('Unknown — this comparison exceeds safe arithmetic limits. Use smaller values.')
  }
}
