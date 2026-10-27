export const prayerItems = [{ id: 2434, dose: 4 }, { id: 139, dose: 3 }, { id: 141, dose: 2 }, { id: 143, dose: 1 }]
export const parseWhole = (s: string): number | null => /^\d+$/.test(s) && Number.isSafeInteger(Number(s)) ? Number(s) : null

/** Mapping is an upper bound, never a declaration of remaining account allowance. */
export function mappingAllowance (mapping: readonly { id: number; name: string; limit?: number | null }[] = []) {
  const limits = prayerItems.flatMap(i => {
    const entries = mapping.filter(m => m.id === i.id)
    const m = entries.length === 1 ? entries[0] : undefined
    return m?.name === `Prayer potion(${i.dose})` && m.limit != null && Number.isSafeInteger(m.limit) && m.limit >= 0 ? [m.limit] : []
  })
  const bound = limits.length ? Math.min(...limits) : null
  return { known: limits.length, bound, verifiedCap: limits.length === 4 && limits.every(n => n === bound) ? bound : null }
}

export function allowanceDeclaration (text: string, bound: number | null) {
  const value = text === '' ? null : parseWhole(text)
  const error = text !== '' && value === null
    ? 'Shared allowance must be a nonnegative safe whole integer.'
    : value !== null && bound !== null && value > bound
      ? `Shared allowance exceeds the known mapping upper bound (${bound}).`
      : null
  return { value, error }
}
