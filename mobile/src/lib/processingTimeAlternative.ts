export type ProcessingTimeAlternative = {
  kind: 'unknown' | 'loss' | 'zero' | 'positive' | 'zero-rate'
  breakEvenMinutes: number | null
  surplus: number | null
}
const safe = (value: number) => {
  if (!Number.isSafeInteger(value)) throw new RangeError('Unsafe whole-number arithmetic')
  return value
}

/** Incremental GP versus selling now; no market, persistence or execution assumptions. */
export function processingTimeAlternative (
  incrementalValue: number | null,
  alternativeGpPerHour: number,
  extraActiveMinutes: number | null
): ProcessingTimeAlternative {
  safe(alternativeGpPerHour)
  if (alternativeGpPerHour < 0) throw new RangeError('Rate must be nonnegative')
  if (extraActiveMinutes !== null && safe(extraActiveMinutes) < 0) throw new RangeError('Minutes must be nonnegative')
  if (incrementalValue === null) return { kind: 'unknown', breakEvenMinutes: null, surplus: null }
  safe(incrementalValue)
  const kind = incrementalValue < 0 ? 'loss' : incrementalValue === 0 ? 'zero' : alternativeGpPerHour === 0 ? 'zero-rate' : 'positive'
  const breakEvenMinutes = incrementalValue === 0 ? 0 : incrementalValue > 0 && alternativeGpPerHour > 0 ? safe(60 * incrementalValue) / alternativeGpPerHour : null
  // Keep integer numerators exact before division; reject overflow even if later terms cancel it.
  const surplus = extraActiveMinutes === null ? null : alternativeGpPerHour === 0 ? incrementalValue
    : safe(safe(60 * incrementalValue) - safe(alternativeGpPerHour * extraActiveMinutes)) / 60
  return { kind, breakEvenMinutes, surplus }
}
