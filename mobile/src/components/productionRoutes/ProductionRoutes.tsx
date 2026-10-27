import { useState } from 'react'
import { mappingCap, remainingAllowance, unusedWindowAllowances } from './allowance'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { geTax } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { evaluateProductionRoutesSafely, safeRouteMoney, productionRoutes, type RoutePlan } from '../../lib/productionRoutes'
import { gpFull, minutesAgo } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'

const names: Record<number, string> = { 207: 'Grimy ranarr', 257: 'Ranarr weed', 99: 'Ranarr potion (unf)', 3051: 'Grimy snapdragon', 3000: 'Snapdragon', 3004: 'Snapdragon potion (unf)', 227: 'Vial of water', 440: 'Iron ore', 453: 'Coal', 2353: 'Steel bar', 2: 'Cannonball' }
const titles: Record<string, string> = { 'full-chain': 'Full chain', finish: 'Finish from intermediate', 'intermediate-exit': 'Intermediate exit' }
const requirements: Record<string, string> = { ranarr: 'Cleaning: 25 Herblore. Unfinished preparation: 30 Herblore.', snapdragon: 'Unfinished preparation: 63 Herblore. Cleaning requirement: unknown; verify before starting.', steel: 'Bars: 30 Smithing. Cannonballs: 35 Smithing, Dwarf Cannon quest and ammo mould.' }
const sources: Record<string, string[]> = { ranarr: ['Ranarr_weed', 'Ranarr_potion_(unf)'], snapdragon: ['Snapdragon', 'Snapdragon_potion_(unf)'], steel: ['Steel_bar', 'Cannonball', 'Dwarf_Cannon'] }
const parse = (s: string) => /^\d+$/.test(s.replace(/,/g, '')) && Number.isSafeInteger(Number(s.replace(/,/g, ''))) ? Number(s.replace(/,/g, '')) : null
const money = (n: number | null) => n === null || !Number.isFinite(n) ? 'Unavailable' : `${gpFull(n)} GP`
const feasible = (n: boolean | null) => n === null ? 'Unknown' : n ? 'Fits' : 'Does not fit'

export function ProductionRoutes () {
  const { palette: p } = useTheme()
  const market = useMarket()
  const [selected, setSelected] = useState('ranarr')
  const [batches, setBatches] = useState('100')
  const [cash, setCash] = useState('1000000')
  const [owned, setOwned] = useState<Record<number, string>>({})
  const [limits, setLimits] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [inputsOpen, setInputsOpen] = useState(false)
  const [quotesOpen, setQuotesOpen] = useState(false)
  const route = productionRoutes.find(r => r.id === selected)!
  const ids = [...new Set(route.stages.flatMap(s => [...s.inputs.map(i => i.id), s.output.id]))]
  const inputIds = ids.filter(id => id !== route.stages[1].output.id)
  const batchValue = parse(batches)
  const cashValue = parse(cash)
  const valid = batchValue !== null && batchValue <= Math.floor(Number.MAX_SAFE_INTEGER / 4) && cashValue !== null && inputIds.every(id => parse(owned[id] ?? '0') !== null) && ids.every(id => remainingAllowance(limits[id], market.market?.get(id)?.limit).valid)
  const quotes = ids.map(id => {
    const item = market.market?.get(id)
    return { id, buy: item?.high ?? null, sell: item?.low ?? null, remainingLimit: remainingAllowance(limits[id], item?.limit).value }
  })
  const result = valid ? evaluateProductionRoutesSafely({ route, batches: batchValue!, budget: cashValue!, quotes, owned: Object.fromEntries(inputIds.map(id => [id, parse(owned[id] ?? '0')!])), tax: geTax }) : null
  const baseline = result?.acquisitionBaseline
  const full = result?.plans[0]
  const exit = result?.plans[2]
  const safeMoney = (compute: () => number) => {
    try { return safeRouteMoney(compute()) } catch (error) {
      if (!(error instanceof RangeError)) throw error
      return null
    }
  }
  const difference = full?.economicGain != null && exit?.economicGain != null ? safeMoney(() => full.economicGain! - exit.economicGain!) : null
  const text = (value: string, muted = false) => <Text style={{ color: muted ? p.muted : p.ink, lineHeight: 21 }}>{value}</Text>
  const button = (label: string, onPress: () => void, open?: boolean) => <Pressable accessibilityRole="button" accessibilityState={open === undefined ? undefined : { expanded: open }} onPress={onPress} style={s.button}><Text style={{ color: p.brand, fontWeight: '600' }}>{label}</Text></Pressable>
  const field = (label: string, value: string, onChangeText: (value: string) => void, placeholder?: string) => <View style={s.field}><Text style={{ color: p.muted, flex: 1 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType="number-pad" placeholder={placeholder} placeholderTextColor={p.muted} selectTextOnFocus style={[s.input, { color: p.ink, backgroundColor: p.well }]} /></View>
  const retained = (plan: RoutePlan) => {
    let total = 0
    for (const r of plan.ledger) {
      if (!r.ownedLeft) continue
      const price = quotes.find(q => q.id === r.id)?.sell
      if (price == null || price <= 0) return null
      const next = safeMoney(() => {
        safeRouteMoney(price)
        safeRouteMoney(price * r.ownedLeft)
        const tax = safeRouteMoney(geTax(price, r.id))
        safeRouteMoney(tax * r.ownedLeft)
        return total + safeRouteMoney((price - tax) * r.ownedLeft)
      })
      if (next === null) return null
      total = next
    }
    return total
  }
  return <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={market.isRefreshing} onRefresh={market.refresh} tintColor={p.brand} />}>
    <Text style={[s.title, { color: p.ink }]}>Choose where to finish</Text>
    {text('Compare one upfront batch, including the value of stock you already own.', true)}
    <View style={s.tabs}>{productionRoutes.map(r => <Pressable key={r.id} accessibilityRole="button" accessibilityState={{ selected: selected === r.id }} onPress={() => { if (selected !== r.id) { setSelected(r.id); setOwned({}); setLimits({}) } }} style={[s.tab, { backgroundColor: selected === r.id ? p.brand : p.well }]}><Text style={{ color: selected === r.id ? p.onBrand : p.ink, fontWeight: '600', textTransform: 'capitalize' }}>{r.id}</Text></Pressable>)}</View>
    <View style={[s.card, { backgroundColor: p.card }]}>
      {field('Whole batches', batches, setBatches)}{field('Available cash (GP)', cash, setCash)}
      {text(selected === 'steel' ? 'Each batch: 1 iron ore + 2 coal → 1 steel bar → 4 cannonballs.' : `Each batch: 1 grimy herb → 1 clean herb + 1 vial of water → 1 unfinished potion.`, true)}
      {button(`${inputsOpen ? 'Hide' : 'Edit'} owned stock & remaining limits`, () => setInputsOpen(!inputsOpen), inputsOpen)}
      {inputsOpen && <>
        {text('Owned stock defaults to zero. Blank remaining allowances are unknown; 0 means exhausted. Enter remaining quantities manually. Full mapping caps are informational, not remaining allowances. Each item ID is independent; shared limit groups are manual and are not inferred. Changing routes resets owned stock and remaining allowances.', true)}
        {button('Use full mapping limits (unused-window scenario)', () => setLimits(unusedWindowAllowances(ids, id => market.market?.get(id)?.limit)))}
        {text('This hypothetical scenario assumes an unused window for known caps; it does not sync or verify your account. Unknown caps stay blank.', true)}
        {button('Reset all remaining allowances to unknown', () => setLimits({}))}
        {ids.map(id => <View key={id} style={[s.item, { borderTopColor: p.rule }]}><Text style={[s.heading, { color: p.ink }]}>{names[id]} (ID {id})</Text>{text(`Full mapping cap: ${mappingCap(market.market?.get(id)?.limit)?.toLocaleString() ?? 'Unknown'} (informational)`, true)}{inputIds.includes(id) && field(`Owned ${names[id]}`, owned[id] ?? '0', value => setOwned(v => ({ ...v, [id]: value })))}{field(`Remaining limit: ${names[id]}`, limits[id] ?? '', value => setLimits(v => ({ ...v, [id]: value })), 'Unknown (blank)')}</View>)}
      </>}
      {!valid && text('Enter safe whole nonnegative quantities and cash. Remaining allowances must not exceed a known positive mapping cap. Batches must fit safe integer output quantities.', true)}
    </View>
    {text(`Quotes downloaded: ${minutesAgo(market.updatedAt) || 'not yet'}. ${market.isRefreshing ? 'Refreshing…' : market.isLoading ? 'Loading prices…' : 'Pull down to refresh.'}`, true)}
    {market.error && text(`Download / refresh error: ${market.error.message}. Cached data may remain visible.`, true)}
    {button(`${quotesOpen ? 'Hide' : 'Show'} observed quotes & trade ages`, () => setQuotesOpen(!quotesOpen), quotesOpen)}
    {quotesOpen && <View style={[s.card, { backgroundColor: p.card }]}>{text('Buys use observed high; sales use observed low. Trade ages differ from download time. Quotes are not guaranteed fills or market depth.', true)}{quotes.map(q => {
      const item = market.market?.get(q.id)
      return <View key={q.id} style={s.detail}>{text(names[q.id])}{text(`Buy high: ${money(q.buy)} · ${minutesAgo(item?.highTime ? item.highTime * 1000 : null) || 'age unknown'}`, true)}{text(`Sell low: ${money(q.sell)} · ${minutesAgo(item?.lowTime ? item.lowTime * 1000 : null) || 'age unknown'}`, true)}</View>
    })}</View>}
    {result && <>
      {result.plans.slice(0, 3).map((plan, index) => plan === null ? <View key={index} style={[s.card, { backgroundColor: p.card }]}>{text(titles[['full-chain', 'finish', 'intermediate-exit'][index]])}{text('Unavailable: amounts exceed safe whole GP arithmetic. Reduce quantities to compare this scenario.', true)}</View> : <View key={plan.kind} style={[s.card, { backgroundColor: p.card }]}>
        <Text style={[s.heading, { color: p.ink }]}>{titles[plan.kind]}</Text>
        {text(`Sell ${gpFull(plan.ledger.find(r => r.sold > 0)?.sold ?? 0)} × ${names[plan.kind === 'intermediate-exit' ? route.stages[0].output.id : route.stages[1].output.id]}`, true)}
        <Text style={[s.gain, { color: p.profit }]}>{money(plan.economicGain)}</Text>{text('Economic gain after tax and owned stock cost', true)}
        {text(`Cash outlay: ${money(plan.cashOutlay)}`)}{text(`Net output sale proceeds: ${money(plan.netRevenue)}`)}{text(`Owned opportunity cost: ${money(plan.ownedOpportunityCost)}`)}
        {text(`Cash: ${feasible(plan.budgetFeasible)} · GE limits: ${feasible(plan.limitsFeasible)}`, true)}
        {text('Active time & GP/hour: unavailable (no complete trusted rates).', true)}
        {button(`${expanded === plan.kind ? 'Hide' : 'Show'} purchases & full accounting`, () => setExpanded(expanded === plan.kind ? null : plan.kind), expanded === plan.kind)}
        {expanded === plan.kind && <View style={s.detail}>
          {text(`Gross output: ${money(plan.grossRevenue)} · output tax: ${money(plan.outputTax)} · recipe coin fees: ${money(plan.fees)}`, true)}
          {text(`Retained inventory liquidation value: ${money(retained(plan))}. Retained stock is not sold or counted as gain.`, true)}
          {plan.purchases.length === 0 && text('No purchases required.')}
          {plan.purchases.map(b => <View key={b.id}>{text(`Buy ${gpFull(b.quantity)} × ${names[b.id]}: ${money(b.cost)}`)}{text(`Remaining limit ${b.remainingLimit === null ? 'unknown' : gpFull(b.remainingLimit)} · ${feasible(b.feasible)}`, true)}</View>)}
          {plan.ledger.map(r => <View key={r.id}>{text(names[r.id])}{text(`Required externally ${gpFull(r.required)} · owned used ${gpFull(r.ownedUsed)} · bought ${gpFull(r.bought)} · produced ${gpFull(r.produced)} · consumed ${gpFull(r.consumed)} · sold ${gpFull(r.sold)} · owned left ${gpFull(r.ownedLeft)}`, true)}</View>)}
          {plan.missingQuotes.length > 0 && text(`Missing quotes: ${plan.missingQuotes.map(q => `${names[q.id]} ${q.side}`).join(', ')}. Dependent totals are unavailable.`, true)}
        </View>}
      </View>)}
      <View style={[s.card, { backgroundColor: p.card }]}><Text style={[s.heading, { color: p.ink }]}>Continue or exit?</Text>{text(`Full-chain economic gain minus intermediate-exit economic gain: ${money(difference)}.`)}{text(`Under these quotes, quantities and owned stock, this is the modeled change from processing through to the final output instead of selling the intermediate. Outputs differ${selected === 'steel' ? ' (4 cannonballs versus 1 bar per batch)' : ' (unfinished potion versus clean herb)'}. Scenarios may consume different owned assets; this is not a strict dominance claim. Missing prices, limits or requirements can prevent execution.`, true)}</View>
      {baseline ? <View style={[s.card, { backgroundColor: p.card }]}><Text style={[s.heading, { color: p.ink }]}>Finished purchase baseline</Text>{text(`Acquire ${gpFull(baseline.quantity)} × ${names[baseline.id]}: ${money(baseline.cashOutlay)}`)}{text('Acquisition cost only, not profit. No sale is assumed; owned inputs remain retained. The purchase must independently fit cash and the finished item’s remaining limit.', true)}{text(`Cash: ${feasible(baseline.cashOutlay === null ? null : baseline.cashOutlay <= cashValue!)} · GE limit: ${feasible(quotes.find(q => q.id === baseline.id)?.remainingLimit == null ? null : baseline.quantity <= quotes.find(q => q.id === baseline.id)!.remainingLimit!)}`, true)}</View> : text('Finished purchase baseline unavailable: amounts exceed safe whole GP arithmetic.', true)}
    </>}
    <View style={[s.card, { backgroundColor: p.card }]}><Text style={[s.heading, { color: p.ink }]}>Requirements & assumptions</Text>{text(requirements[selected])}{sources[selected].map(source => <Link key={source} href={`https://oldschool.runescape.wiki/w/${source}`} style={{ color: p.brand, paddingVertical: 6 }}>Wiki: {source.replace(/_/g, ' ')}</Link>)}{text('Economic gain = net output proceeds − cash outlay − after-tax liquidation value of consumed owned stock. Owned leftovers retain their value. Each scenario uses the same starting cash and inventory independently; no sale reinvestment, internal transfer tax or intermediate sale inside the full chain. Equipment, travel and execution time are excluded. Shared limits and earlier purchases must be reflected in your entries. Requirements are informational and are not checked against your account.', true)}</View>
  </ScrollView>
}
const s = StyleSheet.create({ page: { padding: 16, paddingBottom: 120, gap: 12 }, title: { fontSize: 27, fontWeight: '700' }, heading: { fontSize: 17, fontWeight: '600' }, gain: { fontSize: 25, fontWeight: '700' }, tabs: { flexDirection: 'row', gap: 8 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10 }, card: { padding: 16, borderRadius: 14, gap: 10 }, field: { flexDirection: 'row', alignItems: 'center', gap: 12 }, input: { width: 132, padding: 12, borderRadius: 8, fontSize: 16, fontVariant: ['tabular-nums'] }, button: { minHeight: 44, justifyContent: 'center' }, detail: { gap: 8 }, item: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 } })
