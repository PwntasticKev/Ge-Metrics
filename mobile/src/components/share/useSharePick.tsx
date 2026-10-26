import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { isSharable, shareFileName, type SharePick } from '../../lib/shareCard'
import { ShareCard } from './ShareCard'

/** Capture anyway if the icon hasn't loaded by then (offline, slow wiki). */
const ICON_WAIT_MS = 2_500
/** Where the dev export deep link writes the card (see itemSheet). */
export const EXPORTED_CARD_NAME = 'share-card.png'

type Target = 'share' | 'documents'

export interface SharePickState {
  share: (pick: SharePick) => void
  /** Dev only: writes the PNG to the app's documents dir instead of sharing. */
  exportCard: (pick: SharePick) => Promise<string | null>
  busy: boolean
  error: string | null
  /** Render this somewhere in the screen: the card, off screen, while it's captured. */
  card: ReactNode
}

async function deliver (tmpUri: string, pick: SharePick, target: Target): Promise<string> {
  const dest = target === 'documents' ? new File(Paths.document, EXPORTED_CARD_NAME) : new File(Paths.cache, shareFileName(pick.name))
  await new File(tmpUri).copy(dest, { overwrite: true })
  if (target === 'share') await Sharing.shareAsync(dest.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share pick' })
  return dest.uri
}

// Turns a pick into a PNG card and opens the share sheet. The card renders
// off screen only while it's being captured.
export function useSharePick (): SharePickState {
  const ref = useRef<ComponentRef<typeof View>>(null)
  const settled = useRef<(() => void) | null>(null)
  const [pick, setPick] = useState<SharePick | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const capture = (next: SharePick) => new Promise<string>((resolve, reject) => {
    let done = false
    const go = () => {
      if (done) return
      done = true
      settled.current = null
      clearTimeout(timer)
      // One frame for the icon to paint after it loads.
      requestAnimationFrame(() => {
        captureRef(ref, { format: 'png', result: 'tmpfile' }).then(resolve, reject)
      })
    }
    const timer = setTimeout(go, next.icon ? ICON_WAIT_MS : 0)
    settled.current = go
    setPick(next)
  })

  const run = async (next: SharePick, target: Target): Promise<string | null> => {
    if (busy || !isSharable(next)) return null
    setBusy(true)
    setError(null)
    try {
      if (target === 'share' && !(await Sharing.isAvailableAsync())) throw new Error('Sharing isn\'t available on this device.')
      return await deliver(await capture(next), next, target)
    } catch (e) {
      console.warn('Could not share the pick', e)
      setError(e instanceof Error && e.message.startsWith('Sharing') ? e.message : 'Could not make the share image. Try again.')
      return null
    } finally {
      setPick(null)
      setBusy(false)
    }
  }

  const card = pick ? (
    <View ref={ref} collapsable={false} style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ShareCard pick={pick} onIconSettled={() => settled.current?.()} />
    </View>
  ) : null

  return {
    share: next => { run(next, 'share') },
    exportCard: next => run(next, 'documents'),
    busy,
    error,
    card
  }
}

const styles = StyleSheet.create({
  // Laid out and drawn, just outside the screen.
  offscreen: { position: 'absolute', left: -10_000, top: 0 }
})
