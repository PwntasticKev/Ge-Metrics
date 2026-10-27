import { useCallback, useReducer, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Link, useFocusEffect } from 'expo-router'
import { createNativeProcessingSessionExport } from '../../lib/processingSessionFile'
import type { ProcessingSession } from '../../lib/processingSessions'
import { useTheme } from '../../theme/ThemeProvider'
import { historyNavigation, mergeSessionHistory, sessionHistoryPage } from './sessionHistory'
import { pendingSessions, processingSessionRepository } from './repository'

export function RecentSessions() {
  const { palette: p } = useTheme()
  const [sessions, setSessions] = useState<ProcessingSession[]>([])
  const [navigation, navigate] = useReducer(historyNavigation, { query: '', page: 0 })
  const [counts, setCounts] = useState<{ durable: number | null; pending: number }>({ durable: null, pending: 0 })
  const history = sessionHistoryPage(sessions, navigation.query, navigation.page)
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
      navigate({ type: 'load' })
      setCounts({ durable: result.ok ? result.sessions.length : null, pending: pendingSessions.size })
      if (!result.ok) { setSessions(mergeSessionHistory([], [...pendingSessions.values()])); setMessage(`Sessions could not load: ${result.error.message}`); return }
      setSessions(mergeSessionHistory(result.sessions, [...pendingSessions.values()]))
      setMessage(result.invalidRecords.length ? `${result.invalidRecords.length} unreadable records retained safely.` : result.sessions.length || pendingSessions.size ? '' : 'No actual sessions yet. Expand a recipe below to record one.')
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
    <Text style={{ color: p.muted }}>{sessions.length} sessions available · {counts.durable === null ? 'Saved record count unavailable' : `${counts.durable} saved records`} · {counts.pending} unsaved edits (may overlap saved records)</Text>
    <Text style={{ color: p.ink }}>Search label, recipe, or session ID · all statuses</Text>
    <TextInput accessibilityLabel="Search sessions by label, recipe, or session ID" value={navigation.query} onChangeText={query => navigate({ type: 'query', query })} autoCapitalize="none" autoCorrect={false} placeholder="Label, recipe, or session ID" placeholderTextColor={p.muted} style={{ color: p.ink, borderColor: p.muted, borderWidth: 1, borderRadius: 8, padding: 10 }} />
    {!!navigation.query && <Pressable accessibilityRole="button" onPress={() => navigate({ type: 'query', query: '' })} style={{ paddingVertical: 10 }}><Text style={{ color: p.brand }}>Clear search</Text></Pressable>}
    {!!navigation.query.trim() && history.total === 0 && <Text style={{ color: p.muted }}>No sessions match your search. Clear search to see all available sessions.</Text>}
    {history.rows.map(s => <Link key={s.id} href={{ pathname: './processing-session', params: { sessionid: s.id } }} style={{ color: p.brand, paddingVertical: 8 }}>{s.label ? `${s.label} · ` : ''}{s.recipe.name} · {s.status}{pendingSessions.has(s.id) ? ' · unsaved' : ''}{s.processingStartedAt ? ` · ${new Date(s.processingStartedAt).toLocaleDateString()}` : ''}</Link>)}
    <Text accessibilityLiveRegion="polite" style={{ color: p.muted }}>Showing {history.total ? history.page * 8 + 1 : 0}–{Math.min((history.page + 1) * 8, history.total)} of {history.total}{navigation.query.trim() ? ' matching' : ''} sessions · Page {history.page + 1} of {history.pages}</Text>
    <View style={{ flexDirection: 'row', gap: 24 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: history.page === 0 }} disabled={history.page === 0} onPress={() => navigate({ type: 'page', page: history.page - 1 })} style={{ paddingVertical: 10 }}><Text style={{ color: history.page === 0 ? p.muted : p.brand }}>Previous</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: history.page + 1 >= history.pages }} disabled={history.page + 1 >= history.pages} onPress={() => navigate({ type: 'page', page: history.page + 1 })} style={{ paddingVertical: 10 }}><Text style={{ color: history.page + 1 >= history.pages ? p.muted : p.brand }}>Next</Text></Pressable>
    </View>
  </View>
}
