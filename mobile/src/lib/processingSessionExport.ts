import type { ProcessingExportSnapshotResult } from './processingSessionStorage.ts'

export interface ProcessingExportFile {
  uri: string
  write(raw: string): Promise<void>
  remove(): Promise<void>
}
export interface ProcessingExportIO {
  readSnapshot(): Promise<ProcessingExportSnapshotResult>
  isSharingAvailable(): Promise<boolean>
  now(): Date
  random(): number
  /** Must create exclusively: never overwrite an existing file. */
  createFile(name: string): Promise<ProcessingExportFile>
  /** consumed may only be true when the recipient has finished reading. */
  share(uri: string): Promise<{ consumed: boolean }>
}
export type ProcessingExportOutcome = { status: 'closed' | 'error' | 'busy'; message: string }
const errors = {
  absent: 'No saved processing sessions document is available to export.',
  'read-error': 'Could not read saved processing sessions. Try again.',
  'too-large': 'Saved processing JSON exceeds the 10 MiB export limit. Nothing was exported.',
  unsupported: 'This saved processing JSON version is not supported for export.',
  malformed: 'Saved processing JSON is malformed. Nothing was exported.',
}

/** Captures durable storage on action, independently of decoded Recents and pending edits. */
export function createProcessingSessionExport(io: ProcessingExportIO) {
  let busy = false
  return {
    get busy() { return busy },
    async run(): Promise<ProcessingExportOutcome> {
      if (busy) return { status: 'busy', message: 'Export already in progress.' }
      busy = true
      let file: ProcessingExportFile | undefined
      let sharingStarted = false
      let stage: 'read' | 'availability' | 'file' | 'share' = 'read'
      try {
        const snapshot = await io.readSnapshot()
        if (snapshot.status !== 'snapshot') return { status: 'error', message: errors[snapshot.status] }
        stage = 'availability'
        if (!await io.isSharingAvailable()) return { status: 'error', message: 'File sharing is not available on this device.' }
        stage = 'file'
        const utc = io.now().toISOString().replace(/[:.]/g, '-')
        const suffix = Math.floor(io.random() * 0x100000000).toString(16).padStart(8, '0')
        file = await io.createFile(`processing-sessions-${utc}-${suffix}.json`)
        await file.write(snapshot.raw)
        stage = 'share'
        sharingStarted = true
        const result = await io.share(file.uri)
        if (result.consumed) {
          try { await file.remove() } catch { /* An owned cache file may remain. */ }
        }
        return { status: 'closed', message: 'Share sheet closed. A saved copy is not confirmed.' }
      } catch {
        if (file && !sharingStarted) {
          try { await file.remove() } catch { /* Never sweep other cache files. */ }
        }
        return { status: 'error', message: stage === 'read' ? errors['read-error']
          : stage === 'availability' ? 'Could not check file sharing availability. Try again.'
            : stage === 'file' ? 'Could not prepare the processing JSON file. Try again.'
              : 'Sharing did not complete. A saved copy is not confirmed.' }
      } finally { busy = false }
    },
  }
}
