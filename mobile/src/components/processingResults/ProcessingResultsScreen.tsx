import { useCallback, useState, type ReactNode } from 'react'
import { useFocusEffect } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { gpFull } from '../../lib/format'
import { type ProcessingResultsTotals, type ResultsExclusionReason } from '../../lib/processingResults'
import { useTheme } from '../../theme/ThemeProvider'
import { processingSessionRepository } from '../processingSessions/repository'
import { processingResultsSnapshot } from './adapter'

type Snapshot = ReturnType<typeof processingResultsSnapshot>
const reasons: Record<ResultsExclusionReason, string> = {
  invalid_record: 'Invalid record', unfinished: 'Processing unfinished', elapsed_unconfirmed: 'Elapsed time unconfirmed',
  zero_active_time: 'No positive active time', accounting_unknown: 'Accounting or inventory unresolved',
  outside_window: 'Processing ended outside period', future_timing: 'Timing after snapshot', duplicate: 'Identical duplicate', duplicate_conflict: 'Conflicting duplicate ID',
}
const activeTime = (ms: number) => `${gpFull(ms)} ms (${(ms / 3_600_000).toLocaleString('en-US', { maximumFractionDigits: 6 })} active hours)`

export default function ProcessingResultsScreen () {
  const { palette: p } = useTheme()
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<number | null>(30)
  const [revision, setRevision] = useState(0)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useFocusEffect(useCallback(() => {
    void revision
    let live = true
    setSnapshot(null)
    setError('')
    setLoading(true)
    const load = async () => {
      try {
        const result = await processingSessionRepository.load()
        if (!live) return
        if (!result.ok) throw new Error(`Saved records could not be loaded: ${result.error.message}`)
        // One explicit clock snapshot for this durable read; no pending-edit overlay.
        const now = Date.now()
        let nextSnapshot: Snapshot
        try { nextSnapshot = processingResultsSnapshot(result, { now, lookbackDays: period }) }
        catch { throw new Error('Saved results could not be summarized. The time window or aggregate values are invalid or too large.') }
        if (live) setSnapshot(nextSnapshot)
      } catch (cause) {
        if (live) { setSnapshot(null); setError(cause instanceof Error ? cause.message : 'Saved results could not be loaded.') }
      } finally { if (live) setLoading(false) }
    }
    void load()
    return () => { live = false }
  }, [period, revision]))
  const text = (value: string, muted = false) => <Text selectable style={{ color: muted ? p.muted : p.ink, fontSize: 14, lineHeight: 21 }}>{value}</Text>
  const heading = (value: string) => <Text accessibilityRole="header" style={{ color: p.ink, fontSize: 20, fontWeight: '700' }}>{value}</Text>
  const card = (children: ReactNode) => <View style={{ backgroundColor: p.card, borderColor: p.rule, borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>{children}</View>
  const totals = (value: ProcessingResultsTotals) => <>
    {text(`${value.eligibleCount} eligible recorded results`)}
    <Text selectable style={{ color: value.eligibleCount > 0 && value.totalProfitGp > 0 ? p.profit : p.muted, fontSize: 22, fontWeight: '700' }}>{value.eligibleCount ? `${gpFull(value.totalProfitGp)} GP recorded profit` : 'No eligible recorded results'}</Text>
    {text(`Active time: ${activeTime(value.totalActiveMs)}`)}
    <Text selectable style={{ color: value.profitPerActiveHourGp !== null && value.profitPerActiveHourGp > 0 ? p.profit : p.muted, fontSize: 16, lineHeight: 23 }}>Weighted GP / active hour: {value.profitPerActiveHourGp === null ? 'Unknown' : `${gpFull(value.profitPerActiveHourGp)} GP`}</Text>
  </>
  const summary = snapshot?.summary
  return <ScrollView style={{ backgroundColor: p.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingTop: 16, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right, paddingBottom: 120 + insets.bottom, gap: 16 }}>
    {heading('Recorded processing results')}
    {text('Historical manual records · not a guarantee of future results', true)}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {([7, 30, null] as const).map(days => <Pressable key={days ?? 'all'} accessibilityRole="button" accessibilityLabel={days === null ? 'All history' : `Last ${days} days`} accessibilityState={{ selected: period === days }} onPress={() => setPeriod(days)} style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 22, backgroundColor: period === days ? p.brand : p.well }}><Text style={{ color: period === days ? p.onBrand : p.ink, fontWeight: '600' }}>{days === null ? 'All' : `${days} days`}</Text></Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Refresh recorded processing results" accessibilityState={{ busy: loading }} onPress={() => setRevision(value => value + 1)} style={{ minHeight: 44, padding: 12, borderRadius: 10, backgroundColor: p.well, alignItems: 'center' }}><Text style={{ color: p.brand, fontWeight: '600' }}>{loading ? 'Refresh again' : 'Refresh saved results'}</Text></Pressable>
    {loading ? <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><ActivityIndicator color={p.brand} />{text('Loading saved results…')}</View> : null}
    {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite">{card(<>{heading('Results unavailable')}{text(error)}{text('Profit, active time, and rate are unknown. This is not a zero-result summary. Refresh to try again.', true)}</>)}</View> : null}
    {snapshot && summary ? <>
      {text(`Processing end time: ${summary.windowStartedAt === null ? 'all history' : new Date(summary.windowStartedAt).toLocaleString()} through ${new Date(summary.windowEndedAt).toLocaleString()} (inclusive).`, true)}
      {card(<>{heading('Eligible cohort')}{totals(summary)}{text('Count, profit, time, and weighted rate use the same eligible records. Weighted rate = total recorded profit ÷ total active hours.', true)}</>)}
      {card(<>{heading('Saved record coverage')}{text(`Raw saved rows: ${snapshot.rawCount}\nReadable saved rows: ${snapshot.readableCount}\nUnreadable rows retained in storage: ${snapshot.unreadableRetainedCount}`)}{text(`All raw saved rows are checked, including repeated IDs and unreadable rows. Each excluded row is counted once below; unreadable rows retained in storage are not an additional exclusion count.`, true)}{text(`Excluded raw saved rows: ${summary.excludedCount}`)}{(Object.keys(reasons) as ResultsExclusionReason[]).filter(reason => summary.exclusionCounts[reason] > 0).map(reason => <View key={reason}>{text(`${reasons[reason]}: ${summary.exclusionCounts[reason]}`)}</View>)}{summary.excludedCount === 0 ? text('No raw saved rows excluded.', true) : null}</>)}
      {heading('By exact recipe')}
      {text('Alphabetical groups preserve each saved recipe identity and source.', true)}
      {summary.recipes.length === 0 ? text('No eligible recipe groups in this period.') : [...summary.recipes].sort((a, b) => a.recipe.name.localeCompare(b.recipe.name) || a.recipeKey.localeCompare(b.recipeKey)).map(group => <View key={group.recipeKey}>{card(<>{heading(group.recipe.name)}{text(`Method: ${group.recipe.methodKey} · Recipe ID: ${group.recipe.id}`, true)}{text(`Saved source: ${group.recipe.source ?? 'Unknown'}`, true)}{totals(group)}</>)}</View>)}
    </> : null}
    {card(<>{heading('How to read these results')}{text('Eligibility requires finished processing, confirmed positive active time, and reconciled finances and inventory. A processed session can qualify when financially reconciled; it need not be marked settled. Incomplete or unknown accounting is excluded, never treated as zero.', true)}{text('Active hours are confirmed processing time minus recorded pauses. GE waits and travel outside processing or recorded as pauses are excluded; unrecorded travel during the timer cannot be separated. This is not a total earning rate including those activities.', true)}{text('Profit uses saved sale tax, not tax recomputed from current rules. Records are user entered, may include test data, and are not verified in game. These historical manual results do not guarantee future profit or pace.', true)}</>)}
  </ScrollView>
}
