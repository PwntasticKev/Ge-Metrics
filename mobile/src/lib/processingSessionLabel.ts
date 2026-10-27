/** Maximum normalized label length in Unicode code points. */
export const PROCESSING_SESSION_LABEL_LIMIT = 80

/** Normalize player input only; never repair durable records on read. */
export function normalizeProcessingSessionLabel(input: string): string | null {
  const label = input.normalize('NFC').trim().replace(/\s+/gu, ' ')
  // Preserve international text and emoji joiners, rejecting remaining controls,
  // bidi controls and unpaired UTF-16 surrogates.
  if (/[\p{Cc}\p{Cs}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u.test(label)) throw new RangeError('Label contains unsupported control characters')
  if ([...label].length > PROCESSING_SESSION_LABEL_LIMIT) throw new RangeError('Label must be at most 80 characters')
  return label || null
}

/** Absent/null are supported; stored strings must already be canonical. */
export function validateProcessingSessionLabel(session: object): void {
  if (!Object.hasOwn(session, 'label')) return
  const label = (session as { label: unknown }).label
  if (label === null) return
  if (typeof label !== 'string' || normalizeProcessingSessionLabel(label) !== label) throw new RangeError('Invalid saved session label')
}
