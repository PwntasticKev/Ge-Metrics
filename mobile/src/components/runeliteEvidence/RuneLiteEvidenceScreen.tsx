import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import { pickEvidence, type PickedEvidence } from './pickEvidence'

const PAGE_SIZE = 25
export default function RuneLiteEvidenceScreen () {
  const { palette: p } = useTheme()
  const insets = useSafeAreaInsets()
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<PickedEvidence | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [gapPage, setGapPage] = useState(0)
  const text = (value: string, muted = false) => <Text selectable style={{ color: muted ? p.muted : p.ink, fontSize: 14, lineHeight: 21 }}>{value}</Text>
  const heading = (value: string) => <Text accessibilityRole="header" style={{ color: p.ink, fontSize: 20, fontWeight: '700' }}>{value}</Text>
  const card = (children: ReactNode) => <View style={{ backgroundColor: p.card, borderColor: p.rule, borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>{children}</View>
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action} style={{ padding: 12, borderRadius: 9, backgroundColor: p.brand, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: p.onBrand, fontWeight: '600' }}>{label}</Text></Pressable>
  const choose = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await pickEvidence()
      if (next) { setSnapshot(next); setPage(0); setGapPage(0) }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read this evidence file. Try another JSON export.')
    } finally { setBusy(false) }
  }
  const evidence = snapshot?.evidence
  const preview = snapshot?.preview
  const reconciliation = preview?.rows.filter(row => row.issues.length > 0 || row.kind === 'DISCONTINUITY').length ?? 0
  const discontinuities = preview?.rows.filter(row => row.kind === 'DISCONTINUITY').length ?? 0
  const gapRows = preview?.rows.filter(row => row.kind === 'GAP').length ?? 0
  return <ScrollView style={{ backgroundColor: p.bg }} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingTop: 16, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right, paddingBottom: 120 + insets.bottom, gap: 16 }}>
    <Text style={{ color: p.brand, fontWeight: '700', letterSpacing: 1 }}>IMPORT PREVIEW</Text>
    {heading('RuneLite evidence')}
    {text('Choose an exported JSON file to inspect historical observations. This is not automatic live mobile sync.', true)}
    {card(<>{text('Preview only · kept on this screen.')} {text('The app removes its temporary cache copy after reading; iOS may retain separate file-provider staging copies. No journal, GE slots, processing sessions, or confirmed capital are changed. Observations are not available cash.', true)}{text('Collection UNKNOWN · actual tax UNKNOWN · actual net proceeds UNKNOWN. Completed, cancelled, or empty offers do not prove collection.', true)}</>)}
    {button(busy ? 'Reading evidence…' : snapshot ? 'Choose another JSON file' : 'Choose JSON file', () => { void choose() }, busy)}
    {text('Maximum 5 MB / 5,000,000 bytes and 10,000 events. Only the supported versioned recorder format is accepted.', true)}
    {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ borderWidth: 1, borderColor: p.brand, padding: 16, borderRadius: 12, gap: 8 }}>{heading('Import failed')}{text(error)}{snapshot ? text('Your previous valid preview remains below.', true) : null}</View> : null}
    {snapshot && evidence && preview ? <>
      {card(<>{heading('Validated snapshot')}{text(snapshot.name)}{text(`Schema ${evidence.schemaVersion} · plugin ${evidence.pluginVersion} · RuneLite ${evidence.runeLiteVersion}`)}{text(`Exported at ${evidence.exportedAt}`)}{text(`${evidence.events.length} unique observations · ${evidence.accountScopes.length} account scopes`)}{text('Account scopes are opaque recorder IDs, not verified account identities.', true)}{evidence.accountScopes.map(scope => <View key={`${scope.accountScopeId}:${scope.profileType}`}>{text(`Scope ${scope.accountScopeId} · ${scope.profileType}`)}</View>)}</>)}
      {card(<>{heading('Continuity & reconciliation')}{text(`${preview.sequenceGaps.length} missing sequence ranges · ${gapRows} gap observations · ${discontinuities} discontinuities · ${reconciliation} observations needing review`)}{text('Missing sequences describe missing observations, not proven missing executions. Baselines and gaps cannot establish individual fills or execution times. Reconcile with existing records before any future use.', true)}{text(`${evidence.sequenceGaps.length} declared gap ranges · ${evidence.retainedSequenceRanges.length} retained ranges`, true)}{preview.sequenceGaps.slice(gapPage * PAGE_SIZE, (gapPage + 1) * PAGE_SIZE).map((gap, i) => <View key={i}>{text(`Source ${gap.sourceId}\nMissing sequences ${gap.fromSeq}–${gap.toSeq}`)}</View>)}{preview.sequenceGaps.length > PAGE_SIZE ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{button('Earlier gaps', () => setGapPage(v => v - 1), gapPage === 0)}{button('Later gaps', () => setGapPage(v => v + 1), (gapPage + 1) * PAGE_SIZE >= preview.sequenceGaps.length)}</View> : null}</>)}
      {heading('Historical observations')}
      {text('GP values below are exact raw decimal strings. “Spent” is the cumulative API counter; sale-side gross/net meaning is unverified. Changes may aggregate multiple executions.', true)}
      {evidence.events.length === 0 ? text('This export contains no observations.') : text(`Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, evidence.events.length)} of ${evidence.events.length}`)}
      {evidence.events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((event, index) => {
        const row = preview.rows[page * PAGE_SIZE + index]
        return <View key={event.eventId}>{card(<>
          {heading(`Slot ${event.slot + 1} · ${event.state}`)}
          {text(`${row.kind} · captured ${event.continuity} · ${event.reason}`)}
          {text(`Observed ${event.observedAt}`)}
          {text(`Source ${event.sourceId}\nSequence ${event.seq}\nScope ${event.accountScopeId} · ${event.profileType}`, true)}
          {text(`Event ${event.eventId}\nPrevious ${event.previousEventId ?? 'none'}\nSession ${event.captureSessionId}`, true)}
          {text(`Offer ${event.offerId ?? 'none'} · item ${event.itemId ?? 'none'}`, true)}
          {text(`Cumulative quantity ${event.quantitySold ?? 'unknown'} / ${event.totalQuantity ?? 'unknown'}`)}
          {text(`Raw limit price: ${event.limitPriceGp ?? 'unknown'} GP\nRaw cumulative spent: ${event.spentGp ?? 'unknown'} GP`)}
          {text(`Observed change: ${row.deltaQuantity ?? 'unknown'} quantity · ${row.deltaSpentGp ?? 'unknown'} raw GP`)}
          {text('Collection UNKNOWN · actual tax UNKNOWN · actual net UNKNOWN', true)}
          {row.issues.map(issue => <View key={issue}>{text(issue)}</View>)}
        </>)}</View>
      })}
      {evidence.events.length > PAGE_SIZE ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{button('Previous observations', () => setPage(v => v - 1), page === 0)}{button('Next observations', () => setPage(v => v + 1), (page + 1) * PAGE_SIZE >= evidence.events.length)}</View> : null}
    </> : !busy ? card(<>{heading('No preview yet')}{text('Export evidence from the RuneLite recorder, transfer the JSON to your phone, then choose it here. A new valid file replaces this screen’s preview; files are never merged.', true)}</>) : null}
  </ScrollView>
}
