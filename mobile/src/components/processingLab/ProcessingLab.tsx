import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { computeProcessFlip, type Market, type ProcessRecipe } from '@ge/engine'
import { Link, router, useFocusEffect } from 'expo-router'
import { useMarket } from '../../api/useMarket'
import { useAverages } from '../../api/useAverages'
import { NumberField } from '../NumberField'
import { ErrorState, LoadingState } from '../ListStates'
import { Pills } from '../Tabs'
import { BLUE_SCALE_RECIPES, blueScaleQuoteAgeSec, isBlueScale } from '../../lib/blueScale'
import { UNICORN_GRINDING_RECIPES, isUnicornGrinding } from '../../lib/unicornGrinding'
import { PROCESSING_METHODS, type MethodDef } from '../../lib/methods'
import { batchWait, labMarket, labSourceFreshness, labSourceDisclosure, showLabSource, recipeLimit, sizeProcessingBatch, type PriceMode } from '../../lib/processingLab'
import { processingPriceCeilings, type PriceCeilingReason } from '../../lib/processingPriceCeilings'
import { processingPriceFloors, type PriceFloorReason } from '../../lib/processingPriceFloors'
import { processingOutputThreshold, supportsOutputThreshold } from '../../lib/processingOutputThreshold'
import { processingStress } from '../../lib/processingStress'
import { gpFull, gpShort, minutesAgo } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { useSettings } from '../../state/settings'
import { RecentSessions } from '../processingSessions/RecentSessions'
import { recordedPaceRecipeKey } from '../../lib/recordedPace'
import { createRecordedPaceHistory } from '../recordedPace/history'
import { useRecordedPace } from '../recordedPace/useRecordedPace'
import { recorderUnavailableReason, snapshotRecipe } from '../processingSessions/recipe'

import { createPlanRecording, displayedQuotes } from './recordDisplayedPlan'
import { processingSessionRepository } from '../processingSessions/repository'
import type { DisplayedPlanInput, PlanSizing } from '../../lib/processingPlan'

const isLabOnlyConversion = (recipe: ProcessRecipe) => isBlueScale(recipe) || isUnicornGrinding(recipe)

// Keep these per-action conversions out of shared tools and rankings.
const LAB_METHODS: readonly MethodDef[] = [...PROCESSING_METHODS, {
  key: 'blue-scale', title: 'Blue dragon scale grinding · manual / Wesley',
  blurb: 'One blue dragon scale becomes one dragon scale dust.',
  requirements: 'Members; manual: owned, retained pestle and mortar; Wesley: access to Nardah, no diary gate. Tool acquisition, access and travel costs/time excluded.',
  source: 'https://oldschool.runescape.wiki/w/Blue_dragon_scale',
  group: 'processing', sorts: [{ value: 'profit', label: 'GP/action' }], defaultSort: 'profit',
  recipes: () => BLUE_SCALE_RECIPES
}, {
  key: 'unicorn-grinding', title: 'Unicorn horn grinding · manual / Wesley',
  blurb: 'One unicorn horn becomes one unicorn horn dust.',
  requirements: 'Members; manual: owned, retained pestle and mortar; Wesley: Nardah, noted items accepted, no diary gate. Tool acquisition and travel costs/time excluded.',
  source: 'https://oldschool.runescape.wiki/w/Wesley',
  group: 'processing', sorts: [{ value: 'profit', label: 'GP/action' }], defaultSort: 'profit',
  recipes: () => UNICORN_GRINDING_RECIPES
}]

const MODES = [{ value: 'instant', label: 'Instant' }, { value: 'patient', label: 'Patient' }] as const
const STRESS_OPTIONS = [{ value: '0', label: '0%' }, { value: '1', label: '1%' }, { value: '5', label: '5%' }, { value: '10', label: '10%' }] as const
const SCENARIOS = [ ['instant', 'instant'], ['instant', 'patient'], ['patient', 'instant'], ['patient', 'patient'] ] as const

const CEILING_REASONS: Record<PriceCeilingReason, string> = {
  'missing-quote': 'An input or output quote is missing.',
  'invalid-value': 'A quote, quantity, coin amount, or calculation is invalid or outside the safe range.',
  'no-nonnegative-price': 'Other fixed costs exceed after-tax revenue, even with this ingredient at 0 GP.',
  'unsupported-circular-item': 'This ingredient is also an output; an independent buy-price ceiling is unsupported.'
}
const FLOOR_REASONS: Record<PriceFloorReason, string> = {
  'missing-quote': 'Unknown: an input or output quote is missing.',
  'invalid-value': 'Unsafe: a quote, quantity, coin amount, or calculation is invalid or outside the safe range.',
  'no-feasible-safe-price': 'No feasible break-even quote within the safe arithmetic bound.',
  'unsupported-circular-item': 'This output is also an input; an independent sell-price floor is unsupported.'
}
const quoteGp = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 20 })

export function ProcessingLab () {
  const { palette: p } = useTheme()
  const market = useMarket()
  const pace = useRecordedPace()
  const averages = useAverages()
  const { settings } = useSettings()
  const [rateEvidence, setRateEvidence] = useState<Record<string, NonNullable<PlanSizing['rate']>>>({})
  const recordings = useRef(new Map<string, ReturnType<typeof createPlanRecording>>())
  const recordingLock = useRef(false)
  const [recording, setRecording] = useState<string | null>(null)
  const [recordMessage, setRecordMessage] = useState<{ id: string; text: string; unavailable: boolean } | null>(null)
  const [cash, setCash] = useState(String(settings.budget ?? 1_000_000))
  const [minutes, setMinutes] = useState('60')
  const [inputs, setInputs] = useState<PriceMode>('instant')
  const [outputs, setOutputs] = useState<PriceMode>('instant')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [untimed, setUntimed] = useState(false)
  const [assumptions, setAssumptions] = useState(false)
  const [inputStress, setInputStress] = useState('0')
  const [outputStress, setOutputStress] = useState('0')
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  useFocusEffect(useCallback(() => {
    const updateNow = () => setNowSec(Math.floor(Date.now() / 1000))
    updateNow()
    const timer = setInterval(updateNow, 30_000)
    return () => clearInterval(timer)
  }, []))
  const cashValue = Number(cash.replace(/,/g, ''))
  const minutesValue = Number(minutes)
  const valid = Number.isFinite(cashValue) && cashValue >= 0 && Number.isFinite(minutesValue) && minutesValue >= 0
  const history = useMemo(() => createRecordedPaceHistory(pace.sessions, { now: pace.now, lookbackDays: 30 }), [pace.sessions, pace.now])
  const catalog = useMemo(() => {
    const source = market.market
    if (!source) return []
    return LAB_METHODS.flatMap(method => method.recipes(source).map(recipe => {
      if (isLabOnlyConversion(recipe)) return { method, recipe, paceKey: '', paceReason: '', summary: null }
      try {
        const snapshot = snapshotRecipe(recipe, method.key, source)
        return { method, recipe, paceKey: recordedPaceRecipeKey(snapshot), paceReason: '', summary: history.summary(snapshot) }
      } catch (error) {
        return { method, recipe, paceKey: '', paceReason: error instanceof Error ? error.message : 'Snapshot unavailable.', summary: null }
      }
    }))
  }, [market.market, history])
  const rows = useMemo(() => {
    const source = market.market
    if (!source || !valid) return []
    const quoted = labMarket(source, inputs, outputs, averages.h24)
    return catalog.flatMap(({ method, recipe, paceKey, paceReason, summary }) => {
      if (!settings.membersItems && (recipe.members || [...recipe.inputs, ...recipe.outputs].some(e => source.get(e.id)?.members))) return []
      const flip = computeProcessFlip(recipe, quoted)
      const freshness = labSourceFreshness(recipe, source, inputs, outputs)
      if (!flip || !showLabSource(freshness, settings.hideStale) || (settings.hideFlukes && flip.suspicious)) return []
      const recorded = recipe.actionsPerHour != null && summary?.actionsPerHour != null ? pace.choices[paceKey] : undefined
      const rate = recorded ?? recipe.actionsPerHour ?? null
      const rateSource = recorded !== undefined ? 'Recorded (explicit choice)' : rate !== null ? 'Curated' : 'No curated rate'
      const limit = isLabOnlyConversion(recipe) ? null : recipeLimit(recipe, source)
      const batch = sizeProcessingBatch({ cost: flip.cost, profit: flip.profit, tax: flip.tax, cash: cashValue, minutes: minutesValue, actionsPerHour: rate, limitActions: limit })
      const unknownLimit = recipe.inputs.some(e => !source.get(e.id)?.limit)
      let displayed: DisplayedPlanInput | null = null
      let captureReason = ''
      if (!isLabOnlyConversion(recipe)) try {
        const snapshot = snapshotRecipe(recipe, method.key, source)
        const selectedRate = recorded !== undefined ? rateEvidence[paceKey] : rate === null ? null : { source: 'curated' as const, actionsPerHour: rate, recordedEvidence: null }
        if (recorded !== undefined && (!selectedRate || selectedRate.actionsPerHour !== recorded)) throw new Error('Selected recorded-rate evidence is unavailable. Choose the rate again before capturing.')
        displayed = { recipe: snapshot, quotes: displayedQuotes(snapshot, source, quoted, { inputs, outputs }, averages.h24, market.updatedAt, averages.h24UpdatedAt),
          sizing: { cashBudgetGp: cashValue, activeMinutes: minutesValue, actions: batch.actions, rate: selectedRate ?? null, mappingLimitActions: limit, hasUnknownInputLimit: unknownLimit },
          amounts: { cost: flip.cost, revenue: flip.revenue, tax: flip.tax, profit: flip.profit } }
      } catch (error) { captureReason = error instanceof Error ? error.message : String(error) }
      return [{ method, recipe, flip, freshness, batch, limit, unknownLimit, paceKey, paceReason, summary, rate, rateSource, displayed, captureReason }]
    }).filter(r => Boolean(r.batch.actions === null) === untimed)
      .filter(r => `${r.method.title} ${r.flip.name} ${isBlueScale(r.recipe) ? 'blue scale pestle mortar Nardah' : isUnicornGrinding(r.recipe) ? 'unicorn horn dust Wesley pestle mortar Nardah' : ''}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.batch.earnings ?? b.flip.profit) - (a.batch.earnings ?? a.flip.profit))
  }, [catalog, market.market, valid, inputs, outputs, averages.h24, settings, cashValue, minutesValue, untimed, query, pace.choices, rateEvidence, market.updatedAt, averages.h24UpdatedAt])
  const record = async (row: typeof rows[number]) => {
    if (recordingLock.current) return
    recordingLock.current = true; setRecording(row.recipe.id); setRecordMessage(null)
    let action = recordings.current.get(row.recipe.id)
    if (!action) { action = createPlanRecording(processingSessionRepository); recordings.current.set(row.recipe.id, action) }
    try {
      const result = await action.run(() => {
        if (!row.displayed) throw new Error(row.captureReason || 'Displayed plan unavailable.')
        return row.displayed
      })
      if (result.status === 'saved') {
        try { router.push({ pathname: './processing-session', params: { sessionid: result.session.id } }) }
        catch { setRecordMessage({ id: row.recipe.id, unavailable: false, text: 'Draft saved. Retry opening this same draft, or open it from Recent sessions.' }) }
      } else if (result.status !== 'busy') {
        if (result.status === 'unavailable') recordings.current.delete(row.recipe.id)
        setRecordMessage({ id: row.recipe.id, unavailable: result.status === 'unavailable', text: `${result.status === 'unavailable' ? 'Initial plan unavailable' : 'Draft save not verified — retry keeps the same captured plan'}: ${result.reason}` })
      }
    } finally { recordingLock.current = false; setRecording(null) }
  }
  const abandonRecording = (recipeId: string) => {
    if (recordingLock.current) return
    const action = recordings.current.get(recipeId)
    if (!action?.abandon()) return
    recordings.current.delete(recipeId)
    setRecordMessage({ id: recipeId, unavailable: false, text: 'Pending capture abandoned. A saved draft may still exist in Recent sessions; it has not been deleted or changed. Record actual session will create a new draft from the current display.' })
  }
  const refresh = () => { pace.refresh(); market.refresh(); averages.refresh() }
  const text = { color: p.ink }
  const muted = { color: p.muted }
  const scenario = (recipe: ProcessRecipe, buy: PriceMode, sell: PriceMode, rate: number | null) => {
    if (!market.market) return 'Unavailable'
    const quoted = labMarket(market.market, buy, sell, averages.h24)
    const f = computeProcessFlip(recipe, quoted)
    if (!f) return 'Missing traded prices'
    const b = sizeProcessingBatch({ cost: f.cost, profit: f.profit, tax: f.tax, cash: cashValue, minutes: minutesValue, actionsPerHour: rate, limitActions: isLabOnlyConversion(recipe) ? null : recipeLimit(recipe, market.market) })
    const disclosure = labSourceDisclosure(labSourceFreshness(recipe, market.market, buy, sell))
    return `${b.earnings === null ? `${gpFull(f.profit)} GP/action · no rate` : `${gpFull(b.earnings)} GP · ${b.actions} actions`} · ${disclosure}`
  }
  return <FlatList
    style={{ backgroundColor: p.bg }} contentContainerStyle={styles.list}
    keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
    data={rows} keyExtractor={r => r.recipe.id} extraData={{ open, nowSec }}
    refreshControl={<RefreshControl refreshing={market.isRefreshing || averages.isRefreshing} onRefresh={refresh} tintColor={p.brand} />}
    ListHeaderComponent={<View style={styles.header}>
      <RecentSessions />
      {!!pace.message && <Text style={muted}>{pace.message}</Text>}
      <Text style={muted}>Curated rates by default. Choose recorded pace per recipe to rerank this comparison only. Returning or manually refreshing resets choices. Automatic quote updates keep your choices.</Text>
      <Pressable accessibilityRole="button" onPress={refresh}><Text style={{ color: p.brand }}>Refresh quotes and reset pace</Text></Pressable>
      {Object.keys(pace.choices).length > 0 && <Pressable accessibilityRole="button" onPress={() => pace.setChoices({})}><Text style={{ color: p.brand }}>Reset all rates to curated</Text></Pressable>}
      <Text style={[styles.title, text]}>What can this session earn?</Text>
      <Text style={muted}>Compare one upfront batch across the existing processing recipes. Each row uses the whole cash stack independently.</Text>
      <NumberField label="Cash (GP)" value={cash} onChange={setCash} />
      <NumberField label="Active mins" value={minutes} onChange={setMinutes} />
      {!valid && <Text style={muted}>Enter finite, non-negative cash and minutes.</Text>}
      <Text style={[styles.label, text]}>Buy inputs</Text><Pills options={MODES} value={inputs} onChange={setInputs} />
      <Text style={[styles.label, text]}>Sell outputs</Text><Pills options={MODES} value={outputs} onChange={setOutputs} />
      <Text style={muted}>Modeled batch earnings, not confirmed fills. GE waits are extra.</Text>
      <Text style={muted}>Hide stale {settings.hideStale ? 'ON' : 'OFF'}: when ON, hides prices older than 6h and prices with unknown ages. Patient averages have unknown ages. Download times do not establish price ages.</Text>
      <Text style={muted}>Downloads: quotes {minutesAgo(market.updatedAt) || 'unknown'} · daily averages {minutesAgo(averages.h24UpdatedAt) || 'unknown'}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: assumptions }} onPress={() => setAssumptions(value => !value)}><Text style={{ color: p.brand }}>{assumptions ? 'Hide' : 'Show'} pricing and batch assumptions</Text></Pressable>
      {assumptions && <>
        <Text style={muted}>Instant uses observed buy-high / sell-low quotes, not confirmed fills. Patient uses traded 24h averages and adds modeled GE wait outside active time. Prices and rates are estimates, not measured earnings.</Text>
        <Text style={muted}>Assumes unused buy limits, no resets or reinvestment. Shared limits and previous purchases can reduce the batch. Equipment and travel costs beyond the recipe are excluded.</Text>
      </>}
      {(market.error || averages.refreshError) && <Text style={muted}>Refresh failed for some data. Cached prices remain available with Hide stale OFF; missing prices are excluded.</Text>}
      <TextInput accessibilityLabel="Search processing recipes" placeholder="Search method or recipe" placeholderTextColor={p.muted} value={query} onChangeText={setQuery} style={[styles.search, text, { backgroundColor: p.well }]} />
      <Pills options={[{ value: 'timed', label: 'Session earnings' }, { value: 'untimed', label: 'No trusted rate' }]} value={untimed ? 'untimed' : 'timed'} onChange={v => setUntimed(v === 'untimed')} />
      <Text style={muted}>Blue scale and unicorn horn manual / Wesley comparisons: select No trusted rate, then search scale, horn, dust or Wesley. Per-action only.</Text>
      <Text style={muted}>{rows.length} recipes · {untimed ? 'ranked by GP/action' : 'ranked by modeled batch earnings'} · tap to compare all four assumptions</Text>
    </View>}
    ListEmptyComponent={market.isLoading ? <LoadingState /> : !market.market && market.error ? <ErrorState message="Prices unavailable" onRetry={refresh} /> : <Text style={[muted, styles.empty]}>No recipes match with the available prices and current stale/fluke/member settings. Patient pricing needs traded daily averages. Hide stale ON also excludes unknown ages, including all patient pricing; turn it OFF to compare cached averages with unknown source age.</Text>}
    renderItem={({ item: r }) => {
      const expanded = open === r.recipe.id
      const ceilings = expanded && market.market
        ? processingPriceCeilings(r.recipe, labMarket(market.market, inputs, outputs, averages.h24))
        : null
      const floors = expanded && market.market
        ? processingPriceFloors(r.recipe, labMarket(market.market, inputs, outputs, averages.h24))
        : null
      const stress = expanded && market.market
        ? processingStress(r.recipe, labMarket(market.market, inputs, outputs, averages.h24), {
          inputCostIncreaseBps: Number(inputStress) * 100,
          outputPriceCutBps: Number(outputStress) * 100,
          actions: r.batch.actions
        })
        : null
      const wait = market.market && r.batch.actions !== null ? batchWait(r.recipe, labMarket(market.market, inputs, outputs, averages.h24), r.batch.actions, inputs, outputs, averages.h1, averages.h24) : null
      return <View style={[styles.card, { backgroundColor: p.card }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? null : r.recipe.id)} style={styles.row}>
          <Text style={[styles.label, text]}>{r.flip.name}</Text>
          <Text style={muted}>{labSourceDisclosure(r.freshness)}</Text>
          <Text style={muted}>{r.method.title} · Rate source: {r.rateSource}{r.rate !== null ? ` · ${r.rate.toLocaleString()} actions/h` : ""}</Text>
          <Text style={[styles.earning, { color: r.flip.profit >= 0 ? p.profit : p.muted }]}>{r.batch.earnings === null ? `${gpFull(r.flip.profit)} GP/action` : `${gpFull(r.batch.earnings)} GP after tax`}</Text>
          <Text style={muted}>{r.batch.actions === null ? 'No trusted rate: no session or hourly estimate' : `${r.batch.actions.toLocaleString()} actions · ${gpShort(r.batch.capital)} GP upfront · ${r.batch.bottlenecks.join(' + ')} capped`}</Text>
        </Pressable>
        {expanded && <View style={styles.detail}>
          {!isLabOnlyConversion(r.recipe) && <>
          <Text style={text}>Recorded pace · exact recipe snapshot · past 30 days</Text>
          {r.summary && <>
            <Text style={muted}>{new Date(r.summary.windowStartedAt).toLocaleDateString()} – {new Date(r.summary.windowEndedAt).toLocaleDateString()} · {r.summary.sampleCount} samples · {r.summary.totalActions.toLocaleString()} total actions · {(r.summary.totalActiveMs / 60_000).toFixed(1)} active minutes.</Text>
            <Text style={muted}>Observed: {r.summary.actionsPerHour === null ? 'unavailable' : `${r.summary.actionsPerHour.toLocaleString()} actions/hour`}. Only ended sessions with confirmed elapsed time and known actual actions qualify. Historical pace does not guarantee future pace or earnings.</Text>
          </>}
          {!!r.paceReason && <Text style={muted}>{r.paceReason} Curated rate retained.</Text>}
          {!r.summary?.sampleCount && <Text style={muted}>No eligible saved samples for this exact snapshot in the last 30 days. Curated rate retained; unfinished, unconfirmed, and unknown-action sessions do not qualify.</Text>}
          {r.recipe.actionsPerHour == null && <Text style={muted}>No curated rate: recorded pace is informational; session sizing remains unavailable.</Text>}
          {r.recipe.actionsPerHour != null && r.summary?.actionsPerHour != null && <Pressable accessibilityRole="button" onPress={() => {
            const selected = pace.choices[r.paceKey] !== undefined
            if (!selected) setRateEvidence(previous => ({ ...previous, [r.paceKey]: { source: 'recorded-explicit', actionsPerHour: r.summary!.actionsPerHour!, recordedEvidence: { recipeKey: r.paceKey, computedAtMs: pace.now, lookbackDays: 30, sampleCount: r.summary!.sampleCount, totalActions: r.summary!.totalActions, totalActiveMs: r.summary!.totalActiveMs } } }))
            pace.setChoices(previous => {
              const next = { ...previous }
              if (selected) delete next[r.paceKey]
              else next[r.paceKey] = r.summary!.actionsPerHour!
              return next
            })
          }}><Text style={{ color: p.brand }}>{pace.choices[r.paceKey] !== undefined ? 'Use curated rate' : 'Use recorded pace for this recipe'} · reranks current comparison</Text></Pressable>}
          {recorderUnavailableReason(r.recipe) ? <Text style={muted}>{recorderUnavailableReason(r.recipe)}</Text> : <>
            <Text style={muted}>{recordings.current.has(r.recipe.id) ? 'Retry keeps the originally captured plan and reserved draft, even if the displayed quotes or choices have changed. Abandon pending capture to record the current display instead. A saved draft may already exist in Recent sessions; abandoning does not delete or change it.' : 'Creates an unstarted draft with this displayed quote plan. Quotes are estimates, not fills; enter all actual quantities and costs yourself.'}</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: recording !== null }} disabled={recording !== null} onPress={() => { void record(r) }} style={{ paddingVertical: 12 }}><Text style={{ color: p.brand, fontWeight: '600' }}>{recording === r.recipe.id ? 'Saving draft…' : recordings.current.has(r.recipe.id) ? 'Retry save / open captured draft' : 'Record actual session'}</Text></Pressable>
            {recordings.current.has(r.recipe.id) && <Pressable accessibilityRole="button" accessibilityState={{ disabled: recording !== null }} disabled={recording !== null} onPress={() => abandonRecording(r.recipe.id)} style={{ paddingVertical: 12 }}><Text style={{ color: p.brand }}>Abandon pending capture</Text></Pressable>}
            {recordMessage?.id === r.recipe.id && <>
              <Text accessibilityRole="alert" style={muted}>{recordMessage.text}</Text>
              {recordMessage.unavailable && <Link href={{ pathname: './processing-session', params: { recipeid: r.recipe.id, method: r.method.key } }} style={{ color: p.brand, paddingVertical: 12 }}>Record manually without an initial plan</Link>}
            </>}
          </>}
          </>}
          {isLabOnlyConversion(r.recipe) && <>
            {isBlueScale(r.recipe) && <Text style={muted}>Each action consumes 1 blue dragon scale (243) and produces 1 dragon scale dust (241). Fee: {r.recipe.coinCost} GP per scale. Manual uses an owned, retained pestle and mortar; Wesley is in Nardah with no diary gate. Members only; tool acquisition, access and travel costs/time excluded.</Text>}
            {isUnicornGrinding(r.recipe) && <>
              <Text style={muted}>Each action consumes 1 unicorn horn (237) and produces 1 unicorn horn dust (235). Fee: {r.recipe.coinCost} GP per horn. Members only. Manual uses an owned, retained pestle and mortar; Wesley in Nardah accepts noted items with no diary gate. Tool acquisition and travel costs/time excluded.</Text>
              <Text style={muted}>At identical quotes, Wesley costs exactly 50 GP/action more than manual. This comparison does not recommend either route or establish attainable earnings.</Text>
            </>}
            <Text style={muted}>Unknown processing rate: no GP/hour or batch estimate. No service capacity, available inventory or remaining purchase allowance is inferred.</Text>
            {[...r.recipe.inputs, ...r.recipe.outputs].map(entry => {
              const item = market.market?.get(entry.id)
              const age = (time: number | null | undefined) => {
                const seconds = blueScaleQuoteAgeSec(nowSec, time)
                return seconds === null ? 'unknown' : `${seconds}s old`
              }
              return <Text key={entry.id} style={muted}>{item?.name || `Item ${entry.id}`} observations: high {item?.high ? item.high : 'unknown'} GP ({age(item?.highTime)}) · low {item?.low ? item.low : 'unknown'} GP ({age(item?.lowTime)}).</Text>
            })}
            <Text style={muted}>High/low are independent historical trade observations, not live orders or guaranteed fills. Patient averages may reflect sparse trades; aggregate volume is not available inventory or personal fill odds. Missing or zero quotes stay unknown.</Text>
          </>}
          {market.market && supportsOutputThreshold(r.recipe) && <OutputThresholdSection key={`${r.recipe.id}:${inputs}:${outputs}`} recipe={r.recipe} market={market.market} inputs={inputs} outputs={outputs} />}
          <Text style={text}>Each action: {gpFull(r.flip.cost)} GP cost → {gpFull(r.flip.revenue)} GP gross; {gpFull(r.flip.tax)} GP tax.</Text>
          {stress && <View style={[styles.ceilings, { backgroundColor: p.well }]}>
            <Text style={[styles.label, { color: p.brand }]}>Hypothetical quote stress</Text>
            <Text style={muted}>Screen-wide choices · selected {inputs} buys / {outputs} sells. Baseline uses unchanged quotes.</Text>
            <Text style={text}>Higher input cost</Text>
            <Pills options={STRESS_OPTIONS} value={inputStress} onChange={setInputStress} />
            <Text style={text}>Lower output quote</Text>
            <Pills options={STRESS_OPTIONS} value={outputStress} onChange={setOutputStress} />
            <Pressable accessibilityRole="button" onPress={() => { setInputStress('0'); setOutputStress('0') }}><Text style={{ color: p.brand }}>Reset both to 0%</Text></Pressable>
            <Text style={muted}>Hypothetical fractional notional quotes, not executable prices, forecasts, confidence estimates, or fills. Recipe coin fees/revenue stay fixed; costs beyond the recipe are excluded.</Text>
            {stress.reason && <Text style={muted}>Stress unavailable — {stress.reason === 'missing-quote' ? 'an input or output quote is missing.' : 'a quote, quantity, coin amount, action count, or calculation is invalid or outside the safe range.'}</Text>}
            {stress.baseline && stress.stress && <>
              <Text style={{ color: stress.baseline.profit > 0 ? p.profit : p.muted }}>Baseline: {quoteGp(stress.baseline.profit)} GP/action after tax</Text>
              <Text style={{ color: stress.stress.profit > 0 ? p.profit : p.muted }}>Stress: {quoteGp(stress.stress.profit)} GP/action after tax</Text>
              <Text style={muted}>Tax/action: baseline {quoteGp(stress.baseline.tax)} GP · stress {quoteGp(stress.stress.tax)} GP.</Text>
            </>}
            {stress.batch && <>
              <Text style={muted}>Same {stress.batch.actions.toLocaleString()} base actions · stress does not resize the batch or rerank recipes. The selected pace still controls base actions.</Text>
              <Text style={{ color: stress.batch.baselineMargin > 0 ? p.profit : p.muted }}>Baseline batch margin: {quoteGp(stress.batch.baselineMargin)} GP</Text>
              <Text style={{ color: stress.batch.stressMargin > 0 ? p.profit : p.muted }}>Stress batch margin: {quoteGp(stress.batch.stressMargin)} GP</Text>
              <Text style={muted}>Change in modeled margin (stress − baseline): {quoteGp(stress.batch.cashDelta)} GP. This is not actual cash movement.</Text>
              <Text style={muted}>Upfront capital: baseline {quoteGp(stress.batch.baselineCapital)} GP · full stress {quoteGp(stress.batch.stressCapital)} GP · capital increase {quoteGp(stress.batch.capitalIncrease)} GP.</Text>
              <Text style={muted}>Declared cash: {quoteGp(cashValue)} GP · stress capital shortage: {quoteGp(Math.max(0, stress.batch.stressCapital - cashValue))} GP. Capital increase is additional modeled input funding, separate from the change in modeled margin.</Text>
            </>}
            {r.batch.actions === null && <Text style={muted}>No trusted rate: only per-action stress is available; no batch margin or capital figures.</Text>}
          </View>}
          {ceilings && <View style={[styles.ceilings, { backgroundColor: p.well }]}>
            <Text style={[styles.label, { color: p.brand }]}>Ingredient break-even quotes</Text>
            <Text style={muted}>One action, all inputs purchased. Each ceiling varies one ingredient’s unit buy quote, with other input and output quotes fixed. Output tax and recipe coin costs/revenue are included; costs beyond the recipe are excluded.</Text>
            {ceilings.ingredients.map(ingredient => {
              const quote = ingredient.currentQuote
              const ceiling = ingredient.ceiling
              const headroom = ingredient.headroom
              const reason = ingredient.reason ? CEILING_REASONS[ingredient.reason] : 'No finite calculation is available.'
              const available = ceiling !== null && Number.isFinite(ceiling) && headroom !== null && Number.isFinite(headroom)
              return <View key={ingredient.id} style={styles.ingredient}>
                <Text style={text}>{market.market?.get(ingredient.id)?.name || `Item ${ingredient.id}`}</Text>
                <Text style={muted}>Selected buy ({inputs}): {quote === null ? 'unavailable — missing quote' : !Number.isFinite(quote) || quote <= 0 || quote > Number.MAX_SAFE_INTEGER ? 'unavailable — invalid quote' : `${quoteGp(quote)} GP/unit`}</Text>
                <Text style={text}>Maximum whole-GP break-even unit quote: {available ? `${gpFull(ceiling)} GP/unit` : `unavailable — ${reason}`}</Text>
                <Text style={muted}>{available ? headroom < 0 ? `Needed reduction: ${quoteGp(-headroom)} GP/unit` : `Headroom: ${quoteGp(headroom)} GP/unit` : `Headroom / needed reduction unavailable — ${reason}`}</Text>
              </View>
            })}
            <Text style={muted}>Each ceiling is independent, not simultaneous suggested orders. Quotes are not fills; headroom does not establish achievable earnings.</Text>
          </View>}
          {floors && <View style={[styles.ceilings, { backgroundColor: p.well }]}>
            <Text style={[styles.label, { color: p.brand }]}>Output break-even quotes</Text>
            <Text style={muted}>One action, all inputs purchased. Each floor varies one output’s unit sell quote, with all input and other output quotes fixed. Canonical GE tax and recipe coin costs/revenue are included; costs beyond the recipe are excluded.</Text>
            {floors.outputs.map(output => {
              const quote = output.currentQuote
              const floor = output.floor
              const headroom = output.headroom
              const reason = output.reason ? FLOOR_REASONS[output.reason] : 'No finite calculation is available.'
              const available = floor !== null && Number.isFinite(floor) && headroom !== null && Number.isFinite(headroom)
              return <View key={output.id} style={styles.ingredient}>
                <Text style={text}>{market.market?.get(output.id)?.name || `Item ${output.id}`}</Text>
                <Text style={muted}>Selected sell ({outputs}): {quote === null ? 'unavailable — missing quote' : !Number.isFinite(quote) || quote <= 0 || quote > Number.MAX_SAFE_INTEGER ? 'unavailable — invalid quote' : `${quoteGp(quote)} GP/unit`}</Text>
                <Text style={text}>Minimum whole-GP break-even unit quote: {available ? `${gpFull(floor)} GP/unit` : `unavailable — ${reason}`}</Text>
                {available && floor === 0 && <Text style={muted}>0 GP is a mathematical floor, not an executable GE quote.</Text>}
                <Text style={muted}>{available ? headroom < 0 ? `Needed raise: ${quoteGp(-headroom)} GP/unit` : `Headroom (current − floor): ${quoteGp(headroom)} GP/unit` : `Headroom / needed raise unavailable — ${reason}`}</Text>
              </View>
            })}
            <Text style={muted}>Each floor is independent, not simultaneous suggested asks. These are arithmetic thresholds, not fills; headroom does not establish achievable earnings.</Text>
          </View>}
          {!isLabOnlyConversion(r.recipe) && <Text style={muted}>Buy-limit cap: {r.limit === null ? 'unknown; quantity may be overstated' : `${r.limit.toLocaleString()} actions per unused window`}{r.unknownLimit && r.limit !== null ? '; some input limits unknown, quantity may be overstated' : ''}.</Text>}
          {!isUnicornGrinding(r.recipe) && <Text style={muted}>{r.rate ? `${r.rateSource}: ${r.rate.toLocaleString()} actions/h. Modeled active processing: ${((r.batch.actions ?? 0) / r.rate * 60).toFixed(1)} minutes. ` : ''}Extra GE wait: {wait === null ? 'unknown' : !Number.isFinite(wait) ? 'no modeled flow' : `${(wait * 60).toFixed(0)} min`}. Offers may require several free GE slots.</Text>}
          <Text style={muted}>{labSourceDisclosure(r.freshness)} {r.flip.suspicious ? 'Unusually large margin. ' : ''}Daily averages can lag the market; instant depth is unknown.</Text>
          {SCENARIOS.map(([buy, sell]) => <Text key={`${buy}-${sell}`} style={text}>{buy} in / {sell} out: {scenario(r.recipe, buy, sell, r.rate)}</Text>)}
          <Text style={muted}>Requires: {r.method.requirements || 'See method guide'}</Text>
          {!isLabOnlyConversion(r.recipe) && <Link href={`/tools/${r.method.key}`} style={{ color: p.brand }}>Open recipe tool</Link>}
          {r.method.source && <Link href={r.method.source as `https://${string}`} style={{ color: p.brand }}>{isLabOnlyConversion(r.recipe) ? 'Wiki conversion mechanics (no measured rate)' : 'Wiki mechanics and rate source'}</Link>}
        </View>}
      </View>
    }}
  />
}
const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 12 }, title: { fontSize: 25, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '600' }, search: { padding: 12, borderRadius: 10, fontSize: 16 },
  card: { borderRadius: 12, overflow: 'hidden' }, row: { padding: 16, gap: 6 },
  ceilings: { padding: 12, borderRadius: 10, gap: 10 }, ingredient: { gap: 4 },
  earning: { fontSize: 20, fontWeight: '700' }, detail: { padding: 16, paddingTop: 0, gap: 10 }, empty: { padding: 20 }
})


// Local counts never come from guide pace or batch sizing. Mode keys and row
// unmounting reset both counts; editing attempts clears the scenario.
function OutputThresholdSection ({ recipe, market, inputs, outputs }: { recipe: ProcessRecipe; market: Market; inputs: PriceMode; outputs: PriceMode }) {
  const { palette: p } = useTheme()
  const [attempts, setAttempts] = useState('')
  const [scenario, setScenario] = useState('')
  const result = processingOutputThreshold(recipe, market, inputs, outputs, attempts, scenario)
  const muted = { color: p.muted }
  const marginStyle = (value: number) => ({ color: value >= 0 ? p.brand : p.muted })
  const reasons = {
    'unsupported-recipe': 'Unavailable for this recipe identity or fee model.',
    'patient-mode': 'Unavailable with patient pricing. Select instant buys and instant sells to use observed high input / low output quotes.',
    'attempts-required': 'Enter your whole attempted count to calculate a threshold.',
    'missing-quote': 'Unavailable: an observed input high or output low quote is missing.',
    'invalid-value': 'Unavailable: counts must be safe whole numbers, successful outputs must be from 0 to attempts, and quotes and arithmetic must be safe whole GP.'
  }
  return <View style={[styles.ceilings, { backgroundColor: p.well }]}>
    <Text style={[styles.label, { color: p.brand }]}>Break-even output count</Text>
    <Text style={muted}>One raw karambwan per attempt, at most one saleable cooked karambwan per attempt. All inputs purchased at observed high; outputs sold at observed low, less canonical per-item GE tax. Recipe fee: 0 GP. Costs beyond the recipe are excluded.</Text>
    <TextInput accessibilityLabel="Whole attempted count" placeholder="Attempted count (required)" placeholderTextColor={p.muted} keyboardType="number-pad" value={attempts} onChangeText={value => { setAttempts(value); setScenario('') }} style={[styles.search, { color: p.ink, backgroundColor: p.card }]} />
    <TextInput accessibilityLabel="Optional successful output count" placeholder="Successful outputs (optional, 0 to attempts)" placeholderTextColor={p.muted} keyboardType="number-pad" value={scenario} onChangeText={setScenario} style={[styles.search, { color: p.ink, backgroundColor: p.card }]} />
    {result.reason ? <Text style={muted}>{reasons[result.reason]}</Text> : <>
      <Text style={muted}>Your count: {result.attempts!.toLocaleString()} attempts. Net per saleable output: {gpFull(result.netUnit!)} GP.</Text>
      {result.maxFailed !== null ? <Text style={{ color: p.brand }}>Minimum saleable outputs: {result.minimumOutputs!.toLocaleString()}{result.requiredPercent === null ? '' : ` (${result.requiredPercent.toLocaleString('en-US', { maximumFractionDigits: 2 })}% of attempts)`}. Maximum failed attempts: {result.maxFailed.toLocaleString()}. At this minimum count the modeled margin is nonnegative.</Text>
        : <Text style={muted}>{result.minimumOutputs === null ? 'No finite output count covers the positive cost at zero net output revenue.' : `Even all ${result.attempts!.toLocaleString()} attempts producing saleable outputs would not break even; ${result.minimumOutputs.toLocaleString()} outputs would be required.`} Failed-attempt tolerance unavailable.</Text>}
      <Text style={marginStyle(result.fullMargin!)}>Full-output margin: {gpFull(result.fullMargin!)} GP after tax.</Text>
      {result.scenarioMargin !== null && <Text style={marginStyle(result.scenarioMargin)}>Your {scenario} successful outputs: {gpFull(result.scenarioMargin)} GP margin after tax.</Text>}
    </>}
    <Text style={muted}>Counts are your hypothetical inputs, not a predicted yield or burn probability. No guide rate, player eligibility or fill confidence is inferred. Quotes are observations, not guaranteed fills; selected source freshness is disclosed in this row.</Text>
  </View>
}
