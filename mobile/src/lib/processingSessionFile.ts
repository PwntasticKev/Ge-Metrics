import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { createProcessingSessionExport } from './processingSessionExport'
import type { ProcessingExportSnapshotResult } from './processingSessionStorage'

/** Expo SDK 58 File/Sharing APIs, following journalFile's native share-sheet pattern. */
export function createNativeProcessingSessionExport(readSnapshot: () => Promise<ProcessingExportSnapshotResult>) {
  return createProcessingSessionExport({
    readSnapshot,
    isSharingAvailable: async () => Platform.OS !== 'web' && await Sharing.isAvailableAsync(),
    now: () => new Date(),
    random: Math.random,
    createFile: async name => {
      const file = new File(Paths.cache, name)
      // A collision must not overwrite or subsequently delete someone else's file.
      file.create({ overwrite: false })
      return {
        uri: file.uri,
        write: async raw => { await file.write(raw, { encoding: 'utf8', append: false }) },
        remove: async () => { file.delete() },
      }
    },
    share: async uri => {
      await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export saved processing JSON' })
      // SDK 58 documents Promise<void>, with no recipient-consumption guarantee.
      // Retain this owned cache file (also on rejection) rather than race a recipient.
      // The OS may reclaim cache; never sweep unrelated files or claim a saved copy.
      return { consumed: false }
    },
  })
}
