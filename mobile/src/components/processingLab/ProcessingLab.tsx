import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { computeProcessFlip, type ProcessRecipe } from '@ge/engine'
import { Link } from 'expo-router'
import { useMarket } from '../../api/useMarket'
import { useAverages } from '../../api/useAverages'
import { NumberField } from '../NumberField'
import { ErrorState, LoadingState } from '../ListStates'
import { Pills } from '../Tabs'
import { PROCESSING_METHODS } from '../../lib/methods'
import { batchWait, labMarket, recipeLimit, sizeProcessingBatch, type PriceMode } from '../../lib/processingLab'
import { gpFull, gpShort, minutesAgo } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { useSettings } from '../../state/settings'

const MODES = [{ value: 'instant', label: 'Instant' }, { value: 'patient', label: 'Patient' }] as const
const SCENARIOS = [ ['instant', 'instant'], ['instant', 'patient'], ['patient', 'instant'], ['patient', 'patient'] ] as const

export function ProcessingLab () {
  const { palette: p } = useTheme()
  const market = useMarket()
  const averages = useAverages()
  const { settings } = useSettings()
  const [cash, setCash] = useState(String(settings.budget ?? 1_000_000))
  const [minutes, setMinutes] = useState('60')
  const [inputs, setInputs] = useState<PriceMode>('instant')
  const [outputs, setOutputs] = useState<PriceMode>('instant')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [untimed, setUntimed] = useState(false)
  const [assumptions, setAssumptions] = useState(false)
  const cashValue = Number(cash.replace(/,/g, ''))
  const minutesValue = Number(minutes)
  const valid = Number.isFinite(cashValue) && cashValue >= 0 && Number.isFinite(minutesValue) && minutesValue >= 0
  const rows = useMemo(() => {
    const source = market.market
    if (!source || !valid) return []
    const quoted = labMarket(source, inputs, outputs, averages.h24)
    return PROCESSING_METHODS.flatMap(method => method.recipes(source).flatMap(recipe => {
      if (!settings.membersItems && (recipe.members || [...recipe.inputs, ...recipe.outputs].some(e => source.get(e.id)?.members))) return []
      const flip = computeProcessFlip(recipe, quoted)
      if (!flip || (settings.hideStale && flip.stale) || (settings.hideFlukes && flip.suspicious)) return []
      const limit = recipeLimit(recipe, source)
      const batch = sizeProcessingBatch({ cost: flip.cost, profit: flip.profit, tax: flip.tax, cash: cashValue, minutes: minutesValue, actionsPerHour: recipe.actionsPerHour ?? null, limitActions: limit })
      const unknownLimit = recipe.inputs.some(e => !source.get(e.id)?.limit)
      return [{ method, recipe, flip, batch, limit, unknownLimit }]
    })).filter(r => Boolean(r.batch.actions === null) === untimed)
      .filter(r => `${r.method.title} ${r.flip.name}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.batch.earnings ?? b.flip.profit) - (a.batch.earnings ?? a.flip.profit))
  }, [market.market, valid, inputs, outputs, averages.h24, settings, cashValue, minutesValue, untimed, query])
  const refresh = () => { market.refresh(); averages.refresh() }
  const text = { color: p.ink }
  const muted = { color: p.muted }
  const scenario = (recipe: ProcessRecipe, buy: PriceMode, sell: PriceMode) => {
    if (!market.market) return 'Unavailable'
    const quoted = labMarket(market.market, buy, sell, averages.h24)
    const f = computeProcessFlip(recipe, quoted)
    if (!f) return 'Missing traded prices'
    const b = sizeProcessingBatch({ cost: f.cost, profit: f.profit, tax: f.tax, cash: cashValue, minutes: minutesValue, actionsPerHour: recipe.actionsPerHour ?? null, limitActions: recipeLimit(recipe, market.market) })
    return b.earnings === null ? `${gpFull(f.profit)} GP/action · no rate` : `${gpFull(b.earnings)} GP · ${b.actions} actions`
  }
  return <FlatList
    style={{ backgroundColor: p.bg }} contentContainerStyle={styles.list}
    keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
    data={rows} keyExtractor={r => r.recipe.id} extraData={open}
    refreshControl={<RefreshControl refreshing={market.isRefreshing || averages.isRefreshing} onRefresh={refresh} tintColor={p.brand} />}
    ListHeaderComponent={<View style={styles.header}>
      <Text style={[styles.title, text]}>What can this session earn?</Text>
      <Text style={muted}>Compare one upfront batch across the existing processing recipes. Each row uses the whole cash stack independently.</Text>
      <NumberField label="Cash (GP)" value={cash} onChange={setCash} />
      <NumberField label="Active mins" value={minutes} onChange={setMinutes} />
      {!valid && <Text style={muted}>Enter finite, non-negative cash and minutes.</Text>}
      <Text style={[styles.label, text]}>Buy inputs</Text><Pills options={MODES} value={inputs} onChange={setInputs} />
      <Text style={[styles.label, text]}>Sell outputs</Text><Pills options={MODES} value={outputs} onChange={setOutputs} />
      <Text style={muted}>Modeled batch earnings, not confirmed fills. GE waits are extra.</Text>
      <Text style={muted}>Downloads: quotes {minutesAgo(market.updatedAt) || 'unknown'} · daily averages {minutesAgo(averages.h24UpdatedAt) || 'unknown'}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: assumptions }} onPress={() => setAssumptions(value => !value)}><Text style={{ color: p.brand }}>{assumptions ? 'Hide' : 'Show'} pricing and batch assumptions</Text></Pressable>
      {assumptions && <>
        <Text style={muted}>Instant uses observed buy-high / sell-low quotes, not confirmed fills. Patient uses traded 24h averages and adds modeled GE wait outside active time. Prices and rates are estimates, not measured earnings.</Text>
        <Text style={muted}>Assumes unused buy limits, no resets or reinvestment. Shared limits and previous purchases can reduce the batch. Equipment and travel costs beyond the recipe are excluded.</Text>
      </>}
      {(market.error || averages.refreshError) && <Text style={muted}>Refresh failed for some data. Available cached prices remain visible; missing prices are excluded.</Text>}
      <TextInput accessibilityLabel="Search processing recipes" placeholder="Search method or recipe" placeholderTextColor={p.muted} value={query} onChangeText={setQuery} style={[styles.search, text, { backgroundColor: p.well }]} />
      <Pills options={[{ value: 'timed', label: 'Session earnings' }, { value: 'untimed', label: 'No trusted rate' }]} value={untimed ? 'untimed' : 'timed'} onChange={v => setUntimed(v === 'untimed')} />
      <Text style={muted}>{rows.length} recipes · {untimed ? 'ranked by GP/action' : 'ranked by modeled batch earnings'} · tap to compare all four assumptions</Text>
    </View>}
    ListEmptyComponent={market.isLoading ? <LoadingState /> : !market.market && market.error ? <ErrorState message="Prices unavailable" onRetry={refresh} /> : <Text style={[muted, styles.empty]}>No recipes match with the available prices and current stale/fluke/member settings. Patient pricing needs traded daily averages.</Text>}
    renderItem={({ item: r }) => {
      const expanded = open === r.recipe.id
      const wait = market.market && r.batch.actions !== null ? batchWait(r.recipe, labMarket(market.market, inputs, outputs, averages.h24), r.batch.actions, inputs, outputs, averages.h1, averages.h24) : null
      return <View style={[styles.card, { backgroundColor: p.card }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? null : r.recipe.id)} style={styles.row}>
          <Text style={[styles.label, text]}>{r.flip.name}</Text>
          <Text style={muted}>{r.method.title}</Text>
          <Text style={[styles.earning, { color: r.flip.profit >= 0 ? p.profit : p.muted }]}>{r.batch.earnings === null ? `${gpFull(r.flip.profit)} GP/action` : `${gpFull(r.batch.earnings)} GP after tax`}</Text>
          <Text style={muted}>{r.batch.actions === null ? 'No trusted rate: no session or hourly estimate' : `${r.batch.actions.toLocaleString()} actions · ${gpShort(r.batch.capital)} GP upfront · ${r.batch.bottlenecks.join(' + ')} capped`}</Text>
        </Pressable>
        {expanded && <View style={styles.detail}>
          <Text style={text}>Each action: {gpFull(r.flip.cost)} GP cost → {gpFull(r.flip.revenue)} GP gross; {gpFull(r.flip.tax)} GP tax.</Text>
          <Text style={muted}>Buy-limit cap: {r.limit === null ? 'unknown; quantity may be overstated' : `${r.limit.toLocaleString()} actions per unused window`}{r.unknownLimit && r.limit !== null ? '; some input limits unknown, quantity may be overstated' : ''}.</Text>
          <Text style={muted}>{r.recipe.actionsPerHour ? `Curated rate: ${r.recipe.actionsPerHour.toLocaleString()} actions/h. Active processing: ${((r.batch.actions ?? 0) / r.recipe.actionsPerHour * 60).toFixed(1)} minutes. ` : ''}Extra GE wait: {wait === null ? 'unknown' : !Number.isFinite(wait) ? 'no modeled flow' : `${(wait * 60).toFixed(0)} min`}. Offers may require several free GE slots.</Text>
          <Text style={muted}>{r.flip.stale ? 'Stale quotes. ' : ''}{r.flip.suspicious ? 'Unusually large margin. ' : ''}Daily averages can lag the market; instant depth is unknown.</Text>
          {SCENARIOS.map(([buy, sell]) => <Text key={`${buy}-${sell}`} style={text}>{buy} in / {sell} out: {scenario(r.recipe, buy, sell)}</Text>)}
          <Text style={muted}>Requires: {r.method.requirements || 'See method guide'}</Text>
          <Link href={`/tools/${r.method.key}`} style={{ color: p.brand }}>Open recipe tool</Link>
          {r.method.source && <Link href={r.method.source as `https://${string}`} style={{ color: p.brand }}>Wiki mechanics and rate source</Link>}
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
  earning: { fontSize: 20, fontWeight: '700' }, detail: { padding: 16, paddingTop: 0, gap: 10 }, empty: { padding: 20 }
})
