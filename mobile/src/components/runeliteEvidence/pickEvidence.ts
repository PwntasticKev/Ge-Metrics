import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { decodeRuneLiteEvidence, EVIDENCE_LIMITS, previewRuneLiteEvidence } from '../../lib/runeliteEvidence'

/** A single validated snapshot; deliberately never merges or persists evidence. */
export async function pickEvidence () {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json', 'text/plain'], copyToCacheDirectory: true, multiple: false, base64: false })
  if (picked.canceled || !picked.assets.length) return null
  const asset = picked.assets[0]
  const temporary = asset.file ? null : new File(asset.uri)
  try {
    const tooLarge = (size: number | undefined) => size !== undefined && size > EVIDENCE_LIMITS.fileBytes
    if (tooLarge(asset.size) || tooLarge(asset.file?.size)) throw new Error('File exceeds the 5 MB evidence limit.')
    const file = asset.file ?? temporary!
    if (tooLarge(file.size)) throw new Error('File exceeds the 5 MB evidence limit.')
    const evidence = decodeRuneLiteEvidence(await file.text())
    return { name: asset.name, evidence, preview: previewRuneLiteEvidence(evidence) }
  } finally {
    // Only the picker-created native cache copy is removed, never the original document.
    if (temporary?.exists) temporary.delete()
  }
}
export type PickedEvidence = NonNullable<Awaited<ReturnType<typeof pickEvidence>>>
