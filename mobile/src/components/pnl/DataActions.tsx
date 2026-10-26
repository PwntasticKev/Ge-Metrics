import { geTax } from '@ge/engine'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useMarket } from '../../api/useMarket'
import { pickJournalCsv, shareJournalCsv } from '../../lib/journalFile'
import type { Journal } from '../../lib/pnl/journal'
import { sampleJournal } from '../../lib/pnl/sample'
import { useFlips } from '../../state/flips'
import { useTheme } from '../../theme/ThemeProvider'
import { pnlStyles } from './styles'

// Only in builds made with EXPO_PUBLIC_SAMPLE_FLIPS=1 (screenshots, demos).
const SAMPLES_ENABLED = process.env.EXPO_PUBLIC_SAMPLE_FLIPS === '1'

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.')
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// Export the journal as CSV through the share sheet, or restore one.
export function DataActions ({ journal }: { journal: Journal }) {
  const { palette } = useTheme()
  const { importJournal } = useFlips()
  const { market } = useMarket()
  const [busy, setBusy] = useState(false)
  const empty = !journal.flips.length && !journal.lots.length

  const run = (task: () => Promise<void>) => async () => {
    if (busy) return
    setBusy(true)
    try {
      await task()
    } catch (error) {
      console.warn('[journal] file action failed', error)
      Alert.alert('Couldn\'t finish that', message(error))
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = run(() => shareJournalCsv(journal))
  const importCsv = run(async () => {
    const picked = await pickJournalCsv()
    if (!picked) return
    if ('error' in picked) {
      Alert.alert('Couldn\'t read that file', picked.error)
      return
    }
    const result = importJournal(picked.journal)
    const lines = [
      `Added ${plural(result.addedFlips, 'flip')} and ${plural(result.addedLots, 'open lot')}.`,
      result.skipped ? `${plural(result.skipped, 'record')} already here, skipped.` : '',
      picked.badRows ? `${plural(picked.badRows, 'row')} couldn't be read:\n${picked.errors.join('\n')}` : ''
    ]
    Alert.alert('Restore finished', lines.filter(Boolean).join('\n\n'))
  })
  const loadSamples = () => {
    const sample = sampleJournal(Date.now(), geTax, id => market?.get(id)?.low ?? null)
    // Icons from the live mapping when it's loaded, so they always resolve.
    const iconOf = (id: number, fallback: string | null) => market?.get(id)?.icon ?? fallback
    const result = importJournal({
      lots: sample.lots.map(l => ({ ...l, icon: iconOf(l.itemId, l.icon) })),
      flips: sample.flips.map(f => ({ ...f, icon: iconOf(f.itemId, f.icon) }))
    })
    Alert.alert('Sample flips added', `${plural(result.addedFlips, 'flip')}, ${plural(result.addedLots, 'open lot')}.`)
  }

  return (
    <View style={{ gap: 6, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 28, paddingVertical: 6 }}>
        <Pressable onPress={exportCsv} disabled={busy || empty} hitSlop={10} accessibilityRole="button">
          <Text style={[pnlStyles.link, { color: palette.brand, opacity: busy || empty ? 0.4 : 1 }]}>Export CSV</Text>
        </Pressable>
        <Pressable onPress={importCsv} disabled={busy} hitSlop={10} accessibilityRole="button">
          <Text style={[pnlStyles.link, { color: palette.brand, opacity: busy ? 0.4 : 1 }]}>Restore from CSV</Text>
        </Pressable>
        {SAMPLES_ENABLED ? (
          <Pressable onPress={loadSamples} hitSlop={10} accessibilityRole="button">
            <Text style={[pnlStyles.link, { color: palette.muted }]}>Sample flips</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[pnlStyles.note, { color: palette.muted, textAlign: 'center' }]}>
        Your flips stay on this phone. Export to keep a copy or move them; restoring adds what&apos;s missing and never duplicates.
      </Text>
    </View>
  )
}
