import { geTax } from '@ge/engine'
import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { csvToJournal, journalToCsv, MAX_CSV_CHARS, type CsvImport } from './pnl/csv'
import type { Journal } from './pnl/journal'

// Moves the flip journal in and out of the phone as CSV: export through the
// share sheet (Files, Mail, AirDrop...), restore by picking a file.

const pad2 = (n: number) => String(n).padStart(2, '0')
const fileName = (now: Date) => `ge-metrics-flips-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.csv`

/** Throws with a readable message when sharing isn't possible. */
export async function shareJournalCsv (journal: Journal): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn\'t available on this device.')
  const file = new File(Paths.cache, fileName(new Date()))
  file.create({ overwrite: true })
  await file.write(journalToCsv(journal))
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export flips' })
}

export type PickedImport = CsvImport | { error: string } | null

/** Lets you pick a CSV and reads it. Null when the picker was cancelled. */
export async function pickJournalCsv (): Promise<PickedImport> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
    copyToCacheDirectory: true
  })
  if (picked.canceled || !picked.assets.length) return null
  const asset = picked.assets[0]
  if (asset.size && asset.size > MAX_CSV_CHARS) return { error: 'That file is too big to be a GE Metrics export.' }
  const text = await new File(asset.uri).text()
  return csvToJournal(text, geTax, Date.now())
}
