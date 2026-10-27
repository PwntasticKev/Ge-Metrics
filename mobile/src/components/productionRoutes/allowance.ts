/** Mapping caps describe a full window, never the account's remaining allowance. */
export function mappingCap (value: number | null | undefined): number | null {
  return value != null && Number.isSafeInteger(value) && value > 0 ? value : null
}

export function remainingAllowance (text: string | undefined, cap: number | null | undefined): { value: number | null, valid: boolean } {
  if (text === undefined || text === '') return { value: null, valid: true }
  const digits = text.replace(/,/g, '')
  const value = /^\d+$/.test(digits) ? Number(digits) : NaN
  const knownCap = mappingCap(cap)
  const valid = Number.isSafeInteger(value) && value >= 0 && (knownCap === null || value <= knownCap)
  return { value: valid ? value : null, valid }
}

/** Explicit hypothetical scenario; omit stale IDs and leave unknown caps blank. */
export function unusedWindowAllowances (ids: readonly number[], capFor: (id: number) => number | null | undefined): Record<number, string> {
  return Object.fromEntries(ids.map(id => {
    const cap = mappingCap(capFor(id))
    return [id, cap === null ? '' : String(cap)]
  }))
}
