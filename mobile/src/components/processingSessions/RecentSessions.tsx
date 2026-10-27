import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link, useFocusEffect } from 'expo-router'
import { createNativeProcessingSessionExport } from '../../lib/processingSessionFile'
import type { ProcessingSession } from '../../lib/processingSessions'
import { useTheme } from '../../theme/ThemeProvider'
import { pendingSessions, processingSessionRepository } from './repository'

export function RecentSessions() {
  const { palette: p } = useTheme()
  const [sessions, setSessions] = useState<ProcessingSession[]>([])
  const [message, setMessage] = useState('Loading saved sessions…')
  const [exporter] = useState(() => createNativeProcessingSessionExport(() => processingSessionRepository.readExportSnapshot()))
  const [exportBusy, setExportBusy] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const exportSaved = async () => {
    if (exporter.busy) return
    setExportBusy(true)
    setExportMessage('')
    try { setExportMessage((await exporter.run()).message) }
    finally { setExportBusy(false) }
  }
  useFocusEffect(useCallback(() => {
    let live = true
    processingSessionRepository.load().then(result => {
      if (!live) return
      if (!result.ok) { setSessions([...pendingSessions.values()]); setMessage(`Sessions could not load: ${result.error.message}`); return }
      setSessions([...new Map([...result.sessions, ...pendingSessions.values()].map(s => [s.id, s])).values()].sort((a, b) => Number(b.status === 'processing') - Number(a.status === 'processing') || (b.processingStartedAt ?? 0) - (a.processingStartedAt ?? 0)))
      setMessage(result.invalidRecords.length ? `${result.invalidRecords.length} unreadable records retained safely.` : result.sessions.length ? '' : 'No actual sessions yet. Expand a recipe below to record one.')
    })
    return () => { live = false }
  }, []))
  return <View style={{ gap: 10, padding: 14, backgroundColor: p.card, borderRadius: 12 }}>
    <Text style={{ color: p.ink, fontSize: 18, fontWeight: '600' }}>In progress / Recent sessions</Text>
    <Text style={{ color: p.muted }}>Exports saved data only, including saved drafts. Unsaved edits are excluded. Labels, plans, and all retained fields may contain opaque identifiers. Restore is not available.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: exportBusy, busy: exportBusy }} disabled={exportBusy} onPress={exportSaved} style={{ paddingVertical: 10 }}>
      <Text style={{ color: p.brand }}>{exportBusy ? 'Preparing export…' : 'Export saved processing JSON'}</Text>
    </Pressable>
    {!!exportMessage && <Text accessibilityLiveRegion="polite" style={{ color: p.muted }}>{exportMessage}</Text>}
    {!!message && <Text style={{ color: p.muted }}>{message}</Text>}
    {sessions.slice(0, 8).map(s => <Link key={s.id} href={{ pathname: './processing-session', params: { sessionid: s.id } }} style={{ color: p.brand, paddingVertical: 8 }}>{s.label ? `${s.label} · ` : ''}{s.recipe.name} · {s.status}{pendingSessions.has(s.id) ? ' · unsaved' : ''}{s.processingStartedAt ? ` · ${new Date(s.processingStartedAt).toLocaleDateString()}` : ''}</Link>)}
    {sessions.length > 8 && <Text style={{ color: p.muted }}>Showing 8 of {sessions.length} saved sessions.</Text>}
  </View>
}
