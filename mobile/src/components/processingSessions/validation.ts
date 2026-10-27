import { validateProcessingSessionLabel } from '../../lib/processingSessionLabel.ts'

/** Validate the optional recorder extension without interpreting unknown values as zero. */
export function validateRecorderExtension(session: object): void {
  validateProcessingSessionLabel(session)
  if (!Object.hasOwn(session, 'recorder')) return // Legacy core-only record.
  const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
  const require = (ok: boolean) => { if (!ok) throw new Error('Unreadable recorder extension; saved record has been retained.') }
  const nullableWhole = (v: unknown) => v === null || typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
  const recorder = (session as { recorder: unknown }).recorder
  require(object(recorder))
  if (!object(recorder)) return
  for (const key of ['inputs', 'outputs']) {
    const rows = recorder[key]
    require(Array.isArray(rows))
    if (!Array.isArray(rows)) continue
    const ids = new Set<string>()
    for (const row of rows) {
      require(object(row))
      if (!object(row)) continue
      require(typeof row.id === 'string' && row.id.length > 0 && !ids.has(row.id))
      ids.add(row.id as string)
      const item = row.item
      require(object(item) && typeof item.itemId === 'number' && Number.isSafeInteger(item.itemId) && item.itemId > 0 && typeof item.name === 'string' && (item.icon === null || typeof item.icon === 'string'))
      const fields = key === 'inputs' ? ['acquiredQty', 'consumedQty', 'acquisitionCostGp', 'consumedCostGp', 'opportunityValueGp'] : ['producedQty']
      for (const field of fields) require(nullableWhole(row[field]))
      if (key === 'inputs') {
        require(row.origin === 'purchased' || row.origin === 'already_owned')
        for (const [total, used] of [['acquiredQty', 'consumedQty'], ['acquisitionCostGp', 'consumedCostGp']]) {
          require(row[total] === null || row[used] === null || Number(row[used]) <= Number(row[total]))
        }
      }
    }
  }
}
