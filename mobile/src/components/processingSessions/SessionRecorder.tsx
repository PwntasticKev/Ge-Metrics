import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { geTax } from '@ge/engine'
import { useTheme } from '../../theme/ThemeProvider'
import { deriveProcessingSession, snapshotProcessingSale } from '../../lib/processingSessions'
import { gpFull } from '../../lib/format'
import { pendingSessions, recoveryDrafts, processingSessionRepository } from './repository'
import { asRecorder, interruptTimer, completeQuantities, confirmActuals, makeId, parseWhole, transition, type Actuals, type RecorderSession, type TimerAction } from './model'

import { canRetryRecovery, chooseRecovery, recoveryFor, recoverySnapshot, type Recovery } from './recovery'

const duration = (ms: number | null) => ms === null ? 'Unconfirmed' : `${(ms / 60_000).toFixed(1)} min`
const gp = (n: number | null) => n === null ? 'Unknown' : `${gpFull(n)} GP`

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { palette: p } = useTheme()
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: p.well, opacity: disabled ? 0.5 : 1 }]}><Text style={{ color: p.brand, fontWeight: '600' }}>{label}</Text></Pressable>
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  const { palette: p } = useTheme()
  return <View style={{ gap: 5 }}><Text style={{ color: p.muted }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType="number-pad" placeholder="Unknown — enter 0 to confirm zero" placeholderTextColor={p.muted} style={[styles.input, { color: p.ink, backgroundColor: p.well }]} /></View>
}
function ActualEditor({ session, save, busy }: { session: RecorderSession; save: (s: RecorderSession) => Promise<boolean>; busy: boolean }) {
  const { palette: p } = useTheme()
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries([
    ...session.recorder.inputs.flatMap(i => ['acquiredQty', 'consumedQty', 'acquisitionCostGp', 'consumedCostGp'].map(k => [`${i.id}:${k}`, String(i[k as keyof typeof i] ?? '')])),
    ...session.recorder.outputs.map(o => [`${o.id}:producedQty`, String(o.producedQty ?? '')]),
    ...(['actionsCompleted', 'processingFeesGp', 'otherExpensesGp', 'directCoinReceiptsGp'] as const).map(k => [k, String(session[k] ?? '')]),
  ]))
  const [origins, setOrigins] = useState<Record<string, 'purchased' | 'already_owned'>>(() => Object.fromEntries(session.recorder.inputs.map(i => [i.id, i.origin])))
  const [section, setSection] = useState('totals')
  const [error, setError] = useState('')
  const field = (key: string, label: string) => <Field key={key} label={label} value={values[key] ?? ''} onChange={v => setValues(old => ({ ...old, [key]: v }))} />
  const submit = () => {
    try {
      const recorder: Actuals = { inputs: session.recorder.inputs.map(i => ({ ...i, origin: origins[i.id], acquiredQty: parseWhole(values[`${i.id}:acquiredQty`]), consumedQty: parseWhole(values[`${i.id}:consumedQty`]), acquisitionCostGp: parseWhole(values[`${i.id}:acquisitionCostGp`]), consumedCostGp: parseWhole(values[`${i.id}:consumedCostGp`]) })), outputs: session.recorder.outputs.map(o => ({ ...o, producedQty: parseWhole(values[`${o.id}:producedQty`]) })) }
      // Validate nullable draft values too; the core API only sees fully confirmed rows.
      for (const i of recorder.inputs) {
        if (i.acquiredQty !== null && i.consumedQty !== null && i.consumedQty > i.acquiredQty) throw new Error('Consumed quantity cannot exceed acquired quantity.')
        if (i.acquisitionCostGp !== null && i.consumedCostGp !== null && i.consumedCostGp > i.acquisitionCostGp) throw new Error('Consumed cost cannot exceed acquisition cost.')
      }
      const totals = Object.fromEntries((['actionsCompleted', 'processingFeesGp', 'otherExpensesGp', 'directCoinReceiptsGp'] as const).map(k => [k, parseWhole(values[k])]))
      void save(confirmActuals({ ...session, ...totals }, recorder))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  return <View style={styles.section}>
    <Text style={{ color: p.muted }}>Edits below are unconfirmed until you tap Confirm and save. Blank means unknown. Confirm actual totals, including zero; quantities may differ from the recipe. Costs are total GP, not per unit. Save confirms entered values only.</Text>
    <View style={styles.wrap}>{['totals', 'inputs', 'outputs'].map(s => <Button key={s} label={s === section ? `✓ ${s}` : s} onPress={() => setSection(s)} />)}</View>
    {section === 'totals' && <>{field('actionsCompleted', 'Actual actions completed')}{field('processingFeesGp', 'Actual processing fees (GP)')}{field('otherExpensesGp', 'Other actual expenses (GP)')}{field('directCoinReceiptsGp', 'Direct coin receipts (GP)')}</>}
    {section === 'inputs' && session.recorder.inputs.map(i => <View key={i.id} style={styles.section}>
      <Text style={{ color: p.ink, fontWeight: '600' }}>{i.item.name}</Text>
      <Button label={origins[i.id] === 'purchased' ? 'Origin: purchased · tap for already owned' : 'Origin: already owned · tap for purchased'} onPress={() => setOrigins(old => ({ ...old, [i.id]: old[i.id] === 'purchased' ? 'already_owned' : 'purchased' }))} />
      {origins[i.id] === 'already_owned' && <Text style={{ color: p.muted }}>Owned stock has unknown historical cost until you enter it; ownership does not mean free.</Text>}
      {field(`${i.id}:acquiredQty`, `${i.item.name}: acquired quantity`)}{field(`${i.id}:consumedQty`, `${i.item.name}: consumed quantity`)}{field(`${i.id}:acquisitionCostGp`, `${i.item.name}: total acquisition / historical cost (GP)`)}{field(`${i.id}:consumedCostGp`, `${i.item.name}: cost assigned to consumed units (GP)`)}
    </View>)}
    {section === 'outputs' && <>{session.recorder.outputs.map(o => field(`${o.id}:producedQty`, `${o.item.name}: actual produced quantity`))}{!session.recorder.outputs.length && <Text style={{ color: p.muted }}>Coin-only recipe: record direct coin receipts under totals.</Text>}</>}
    {!!error && <Text accessibilityRole="alert" style={{ color: p.brand }}>{error}</Text>}
    <Button label="Confirm and save entered actuals" disabled={busy} onPress={submit} />
  </View>
}
function SaleEditor({ session, save, busy }: { session: RecorderSession; save: (s: RecorderSession) => Promise<boolean>; busy: boolean }) {
  const { palette: p } = useTheme()
  const [outputId, setOutputId] = useState(session.outputs[0]?.id ?? '')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const add = async () => {
    try {
      const output = session.outputs.find(o => o.id === outputId)
      const count = parseWhole(qty); const unitPriceGp = parseWhole(price)
      if (!output || count === null || count <= 0 || unitPriceGp === null) throw new Error('Choose a confirmed output, positive quantity and actual unit price (0 allowed).')
      if (session.sales.length >= 100) throw new Error('This recorder supports up to 100 completed sale tranches per session.')
      const sale = snapshotProcessingSale({ id: makeId(), outputId, qty: count, unitPriceGp, soldAt: Date.now(), taxRuleVersion: null }, output.item.itemId, geTax)
      const next = { ...session, status: session.status === 'settled' ? 'processed' as const : session.status, sales: [...session.sales, sale] }
      deriveProcessingSession(next, Date.now())
      if (await save(next)) { setQty(''); setPrice(''); setError('') }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  return <View style={styles.section}>
    <Text style={{ color: p.muted }}>Record each completed price tranche separately. Tax is snapshotted using the shared GE tax engine. Unsold output remains inventory.</Text>
    {session.outputs.map(o => <Button key={o.id} label={`${o.id === outputId ? '✓ ' : ''}${o.item.name}`} onPress={() => setOutputId(o.id)} />)}
    {!!session.outputs.length && <><Field label="Completed sale quantity" value={qty} onChange={setQty} /><Field label="Actual sale price per item (GP)" value={price} onChange={setPrice} /><Button label="Confirm completed sale" disabled={busy} onPress={() => { void add() }} /></>}
    {!session.outputs.length && <Text style={{ color: p.muted }}>Confirm produced quantities first. Coin-only receipts belong in actuals.</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: p.brand }}>{error}</Text>}
    {session.sales.map(s => <View key={s.id} style={styles.section}><Text style={{ color: p.ink }}>{session.outputs.find(o => o.id === s.outputId)?.item.name}: {s.qty} × {gp(s.unitPriceGp)} · saved tax {gp(s.taxGp)}</Text><Button label="Remove incorrect sale" disabled={busy} onPress={() => { void save({ ...session, status: session.status === 'settled' ? 'processed' : session.status, sales: session.sales.filter(x => x.id !== s.id) }) }} /></View>)}
  </View>
}
function WaitEditor({ session, save, busy }: { session: RecorderSession; save: (s: RecorderSession) => Promise<boolean>; busy: boolean }) {
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState('')
  const { palette: p } = useTheme()
  const add = (side: 'buy' | 'sell') => {
    try {
      const mins = parseWhole(minutes)
      if (mins === null || !Number.isSafeInteger(mins * 60_000)) throw new Error('Enter a whole number of minutes.')
      if (session.externalGeWaits.length >= 40) throw new Error('Maximum 40 external waits per session.')
      const anchor = side === 'buy' ? Math.min(session.processingStartedAt ?? Date.now(), ...session.externalGeWaits.filter(w => w.side === 'buy').map(w => w.startedAt)) : Math.max(session.processingEndedAt ?? Date.now(), ...session.externalGeWaits.filter(w => w.side === 'sell').map(w => w.endedAt))
      const startedAt = side === 'buy' ? anchor - mins * 60_000 : anchor
      const endedAt = side === 'buy' ? anchor : anchor + mins * 60_000
      const next = { ...session, externalGeWaits: [...session.externalGeWaits, { id: makeId(), side, startedAt, endedAt }] }
      deriveProcessingSession(next, Date.now()); void save(next)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  return <View style={styles.section}><Text style={{ color: p.muted }}>Manual extra GE wait outside processing. Buy minutes are placed immediately before the start (or earlier buy wait); sell minutes after the end (or later sell wait). These are recorded durations, not inferred fills.</Text><Field label="Extra GE wait minutes" value={minutes} onChange={setMinutes} />
    <Button label="Confirm pre-processing buy wait" disabled={busy || session.status === 'processing'} onPress={() => add('buy')} /><Button label="Confirm post-processing sell wait" disabled={busy || !session.processingEndedAt} onPress={() => add('sell')} />
    {!!error && <Text style={{ color: p.brand }}>{error}</Text>}
    {session.externalGeWaits.map(w => <View key={w.id}><Text style={{ color: p.ink }}>{w.side} wait: {duration(w.endedAt - w.startedAt)}</Text><Button label="Remove incorrect wait" disabled={busy} onPress={() => { void save({ ...session, externalGeWaits: session.externalGeWaits.filter(x => x.id !== w.id) }) }} /></View>)}
  </View>
}

export function SessionRecorder({ initial, committed }: { initial: RecorderSession; committed?: RecorderSession }) {
  const { palette: p } = useTheme()
  const [session, setSession] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [recovery, setRecovery] = useState<Recovery | null>(() => committed && pendingSessions.has(initial.id) ? recoveryFor(initial, committed) : null)
  const [inspectDraft, setInspectDraft] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const lock = useRef(false)
  const recoveryGeneration = useRef(0)
  const current = useRef(session)
  const [unsaved, setUnsaved] = useState(pendingSessions.has(initial.id) || initial.status === 'draft' && !initial.processingStartedAt)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const save = useCallback(async (next: RecorderSession) => {
    if (lock.current || recovery && !canRetryRecovery(recovery)) return false
    const generation = recoveryGeneration.current
    lock.current = true; setNow(Date.now()); current.current = next; setBusy(true); setSession(next); setUnsaved(true); pendingSessions.set(next.id, next); setError('')
    try {
      const result = await processingSessionRepository.upsert(next)
      if (!result.ok) throw result.error
      const saved = result.sessions.find(s => s.id === next.id)
      if (!saved) throw new Error('Saved session could not be verified.')
      if (generation !== recoveryGeneration.current) {
        const recovered = { ...asRecorder(saved), elapsedTimeConfirmed: false }
        current.current = recovered; setSession(recovered); pendingSessions.set(next.id, recovered); setUnsaved(true)
      } else { current.current = asRecorder(saved); setSession(asRecorder(saved)); pendingSessions.delete(next.id); setUnsaved(false) }
      setRecovery(previous => previous?.editing === 'committed' ? { ...previous, committed: asRecorder(saved) } : previous)
      setNotice(result.invalidRecords.length ? `${result.invalidRecords.length} unreadable records retained safely.` : '')
      return true
    } catch (e) { setError(`Unsaved: ${e instanceof Error ? e.message : String(e)}`); return false }
    finally { lock.current = false; setBusy(false) }
  }, [recovery])
  const loadLatest = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true)
    const draft = current.current
    if (!recoveryDrafts.has(initial.id)) recoveryDrafts.set(initial.id, draft)
    try {
      const result = await processingSessionRepository.load()
      if (!result.ok) throw result.error
      const found = result.sessions.find(s => s.id === initial.id)
      if (!found) throw new Error('No readable committed snapshot is available. The unsaved draft is retained.')
      const next = recoveryFor(draft, asRecorder(found))
      setRecovery(next); setInspectDraft(true); setError('')
      setUnsaved(true); pendingSessions.set(draft.id, draft)
      setNotice('Latest committed snapshot loaded. Choose which snapshot to edit; no changes have been saved.')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { lock.current = false; setBusy(false) }
  }
  const chooseSnapshot = (editing: Recovery['editing']) => {
    if (!recovery || lock.current) return
    const next = chooseRecovery(recovery, editing)
    const snapshot = recoverySnapshot(next)
    setRecovery(next); current.current = snapshot; setSession(snapshot)
    if (editing === 'draft') pendingSessions.set(snapshot.id, snapshot)
    else pendingSessions.delete(snapshot.id)
    setUnsaved(editing === 'draft'); setError(''); setPanel(''); setConfirmDiscard(false)
  }
  useEffect(() => {
    if (pendingSessions.has(initial.id) || initial.status === 'draft') pendingSessions.set(initial.id, initial)
    if (committed && pendingSessions.has(initial.id) && !recoveryDrafts.has(initial.id)) recoveryDrafts.set(initial.id, initial)
  }, [initial, committed])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const interrupt = useCallback(() => {
    const s = current.current
    const next = interruptTimer(s)
    if (next === s) return
    recoveryGeneration.current++
    current.current = next; setSession(next); setUnsaved(true); pendingSessions.set(next.id, next)
    setNow(Date.now())
  }, [])
  useFocusEffect(useCallback(() => {
    setNow(Date.now())
    return interrupt
  }, [interrupt]))
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') interrupt()
    })
    return () => subscription.remove()
  }, [interrupt])
  const act = (action: TimerAction) => {
    try { void save(transition(session, action, Date.now())) } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  const d = deriveProcessingSession(session, now)
  const complete = completeQuantities(session)
  const openPause = session.pauses.find(x => x.endedAt === null)
  const staleDraft = !!recovery && !canRetryRecovery(recovery)
  const blocked = busy || staleDraft || !!error && unsaved
  const canFinalize = complete && d.canSettle
  return <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic">
    <Text style={[styles.title, { color: p.ink }]}>{session.recipe.name}</Text>
    <Text style={{ color: p.muted }}>{session.status} · {openPause ? openPause.reason === 'ge_wait' ? 'Paused: GE wait' : 'Paused: break / other' : session.status === 'processing' ? session.elapsedTimeConfirmed ? 'Recording active time' : 'Elapsed activity needs confirmation' : 'Manual actual session'}</Text>
    <Text style={{ color: p.muted }}>Local record only. Record real actions and receipts; recipe ratios are reference information.</Text>
    <View style={[styles.card, { backgroundColor: p.card }]}>
      <Text accessibilityLiveRegion="polite" style={{ color: p.brand }}>{busy ? 'Saving…' : unsaved ? 'Unsaved changes — keep this record open or retry saving.' : 'Saved on this device'}</Text>
      {!!error && <Text accessibilityRole="alert" style={{ color: p.brand }}>{error}</Text>}
      {!!notice && <Text style={{ color: p.muted }}>{notice}</Text>}
      <Text style={{ color: p.muted }}>Editing {recovery?.editing === 'committed' ? 'committed snapshot' : unsaved ? 'unsaved draft' : 'committed snapshot'} · revision {session.revision ?? 0}</Text>
      {(unsaved || recoveryDrafts.has(session.id)) && <Button label="Load / refresh latest committed snapshot" disabled={busy} onPress={() => { void loadLatest() }} />}
      {recovery && <View style={styles.section}>
        <Text style={{ color: p.ink }}>Recovery: draft revision {recovery.draft.revision ?? 0} ({recovery.draft.status}); committed revision {recovery.committed.revision ?? 0} ({recovery.committed.status}). Re-enter chosen changes on the committed snapshot and save explicitly. The draft is never automatically merged.</Text>
        {inspectDraft && <Text selectable style={{ color: p.ink }}>Recovery draft: {JSON.stringify(recovery.draft, null, 2)}</Text>}
        {staleDraft && <Text style={{ color: p.brand }}>This stale draft is inspection only. Choose the committed snapshot to reconcile changes.</Text>}
        <Button label="Edit latest committed snapshot; keep draft backup" disabled={busy || recovery.editing === 'committed' && unsaved} onPress={() => chooseSnapshot('committed')} />
        <Button label="Return to preserved unsaved draft" disabled={busy || recovery.editing === 'committed' && unsaved} onPress={() => chooseSnapshot('draft')} />
      </View>}
      {recoveryDrafts.has(session.id) && <View style={styles.section}>
        <Text style={{ color: p.muted }}>Draft backup retained in memory across navigation, until explicitly discarded or the app restarts.</Text>
        <Button label={inspectDraft ? 'Hide preserved draft details' : 'Inspect preserved draft details'} onPress={() => setInspectDraft(!inspectDraft)} />
        {inspectDraft && <Text selectable style={{ color: p.ink }}>{JSON.stringify(recoveryDrafts.get(session.id), null, 2)}</Text>}
        <Button label="Discard preserved draft…" disabled={busy || recovery?.editing !== 'committed' || unsaved} onPress={() => setConfirmDiscard(true)} />
        {confirmDiscard && <><Text style={{ color: p.ink }}>Permanently discard the preserved draft? Keep it until you have reconciled its values.</Text><Button label="Confirm discard preserved draft" onPress={() => { recoveryDrafts.delete(session.id); setRecovery(null); setInspectDraft(false); setConfirmDiscard(false) }} /><Button label="Keep draft backup" onPress={() => setConfirmDiscard(false)} /></>}
      </View>}
      {unsaved && <Button label="Save / retry unsaved record" disabled={busy || staleDraft} onPress={() => { void save(session) }} />}
      {!session.elapsedTimeConfirmed && <><Text style={{ color: p.ink }}>Timer interrupted. Review the interval from {new Date(session.processingStartedAt!).toLocaleString()} to now ({duration(d.elapsedMs)}). Confirm that its active and paused intervals are accurate before resuming or ending. Nothing was automatically ended.</Text><Button label="I confirm the recorded elapsed activity" disabled={blocked} onPress={() => act('confirm_elapsed')} /></>}
      {session.status === 'draft' && <Button label="Start processing timer" disabled={blocked} onPress={() => act('start')} />}
      {session.status === 'processing' && session.elapsedTimeConfirmed && <><View style={styles.wrap}>{openPause ? <Button label="Resume processing" disabled={blocked} onPress={() => act('resume')} /> : <><Button label="Pause: GE wait" disabled={blocked} onPress={() => act('ge_wait')} /><Button label="Pause: break / other" disabled={blocked} onPress={() => act('break_other')} /></>}</View><Button label="End processing and record actuals" disabled={blocked} onPress={() => { setPanel('actuals'); act('end') }} /></>}
      <Text style={{ color: p.ink }}>Active {duration(d.activeMs)} · paused {duration(d.pausedMs)}{ '\n' }GE wait {duration(d.geWaitMs)} · processing elapsed {duration(d.elapsedMs)}{ '\n' }Total including external waits {duration(d.totalElapsedMs)}</Text>
      <Text style={{ color: p.ink }}>Recorded pace: {d.actionsPerHour === null ? 'Unknown' : `${d.actionsPerHour.toFixed(1)} actions / active hour`}</Text>
      {session.recorder.outputs.map(o => <Text key={o.id} style={{ color: p.muted }}>{o.item.name}: {o.producedQty === null || d.activeMs === null || d.activeMs === 0 ? 'Unknown output pace' : `${(o.producedQty * 3_600_000 / d.activeMs).toFixed(1)} / active hour`}</Text>)}
    </View>
    <View style={[styles.card, { backgroundColor: p.card }]}>
      <Text style={[styles.heading, { color: p.ink }]}>Cash and inventory</Text>
      {!complete && <Text style={{ color: p.muted }}>Input / output quantities are unconfirmed. Confirm them in actuals before inventory, outlay or final profit can be resolved.</Text>}
      <Text style={{ color: p.ink }}>Net sold cash: {gp(d.netSoldCashGp)}{ '\n' }Direct coin receipts: {gp(session.directCoinReceiptsGp)}{ '\n' }Recorded cash outlay: {gp(complete ? d.cashOutlayGp : null)}{ '\n' }Cash movement: {gp(complete ? d.cashMovementGp : null)}{ '\n' }Consumed historical cost: {gp(complete ? d.consumedHistoricalCostGp : null)}</Text>
      {session.recorder.inputs.map(i => <Text key={i.id} style={{ color: p.muted }}>{i.item.name}: unused {i.acquiredQty === null || i.consumedQty === null ? 'unknown' : i.acquiredQty - i.consumedQty}</Text>)}
      {session.recorder.outputs.map(o => <Text key={o.id} style={{ color: p.muted }}>{o.item.name}: unsold {o.producedQty === null ? 'unknown' : o.producedQty - session.sales.filter(s => s.outputId === o.id).reduce((n, s) => n + s.qty, 0)}</Text>)}
      <Text style={{ color: p.brand, fontWeight: '600' }}>Final session profit: {gp(canFinalize ? d.finalProfitGp : null)}</Text>
      <Text style={{ color: p.muted }}>Cash movement includes purchased stock; unused inputs and unsold outputs remain inventory. Final profit needs ended, confirmed timing, all inventory resolved and every cost / receipt confirmed.</Text>
      {canFinalize && session.status !== 'settled' && <Button label="Mark session settled" disabled={blocked} onPress={() => act('settle')} />}
    </View>
    {(['actuals', 'sales', 'waits', 'recipe'] as const).map(key => <View key={key} style={[styles.card, { backgroundColor: p.card }]}>
      <Button label={`${panel === key ? 'Hide' : 'Show'} ${key === 'actuals' ? 'actual quantities and costs' : key === 'sales' ? 'completed sales' : key === 'waits' ? 'extra GE waits' : 'snapshotted recipe'}`} disabled={busy} onPress={() => setPanel(panel === key ? '' : key)} />
      {panel === key && key === 'actuals' && <ActualEditor key={`${recovery?.editing}:${session.revision}`} session={session} busy={blocked} save={async next => { const ok = await save(next); if (ok) setPanel(''); return ok }} />}
      {panel === key && key === 'sales' && <SaleEditor key={`${recovery?.editing}:${session.revision}`} session={session} busy={blocked} save={save} />}
      {panel === key && key === 'waits' && <WaitEditor key={`${recovery?.editing}:${session.revision}`} session={session} busy={blocked} save={save} />}
      {panel === key && key === 'recipe' && <><Text style={{ color: p.muted }}>Reference ratios only — never confirmed actuals. {session.recipe.curatedActionsPerHour ?? 'No trusted'} actions/hour. Source: {session.recipe.source ?? 'Unavailable'}</Text>{session.recipe.inputs.map((i, n) => <Text key={`i${n}`} style={{ color: p.ink }}>Input: {i.qtyPerAction} × {i.name} / action</Text>)}{session.recipe.outputs.map((i, n) => <Text key={`o${n}`} style={{ color: p.ink }}>Output: {i.qtyPerAction} × {i.name} / action</Text>)}<Text style={{ color: p.muted }}>Recipe coin fee {gp(session.recipe.coinCostPerAction)} / action; coin receipt {gp(session.recipe.coinRevenuePerAction)} / action.</Text></>}
    </View>)}
  </ScrollView>
}
const styles = StyleSheet.create({ screen: { padding: 16, paddingBottom: 120, gap: 14 }, title: { fontSize: 25, fontWeight: '700' }, heading: { fontSize: 18, fontWeight: '600' }, card: { borderRadius: 12, padding: 14, gap: 12 }, section: { gap: 12, paddingVertical: 8 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { paddingHorizontal: 14, paddingVertical: 13, borderRadius: 9 }, input: { padding: 12, borderRadius: 8, fontSize: 16 } })
