import { useState } from 'react'
import { allowanceDeclaration, mappingAllowance, parseWhole as parse, prayerItems as items } from './allowance'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { geTax } from '@ge/engine'
import { fetchMapping } from '../../api/wiki'
import { useMarket } from '../../api/useMarket'
import { optimizeDoseBasket, type DoseBasketPlan } from '../../lib/doseBasket'
import { minutesAgo } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'

const name = (id: number) => id === 229 ? 'Empty vial' : `Prayer potion (${items.find(i => i.id === id)?.dose ?? '?'})`
const gp = (n: number | null) => n === null ? 'Unknown' : `${n.toLocaleString()} GP`
type Result = ReturnType<typeof optimizeDoseBasket>

export function DoseBasket () {
  const { palette: p, isDark } = useTheme()
  const blue = isDark ? '#80baff' : '#175db6'
  const market = useMarket()
  const mapping = useQuery({ queryKey: ['mapping'], queryFn: fetchMapping, staleTime: 21600000 })
  const [cash, setCash] = useState('1000000')
  const [target, setTarget] = useState(4)
  const [allowance, setAllowance] = useState('')
  const [vialPrice, setVialPrice] = useState('')
  const [buyCaps, setBuyCaps] = useState<Record<number, string>>({})
  const [sellCaps, setSellCaps] = useState<Record<number, string>>({})
  const [owned, setOwned] = useState<Record<number, string>>({})
  const [details, setDetails] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [comparedTarget, setComparedTarget] = useState(4)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const cap = mappingAllowance(mapping.data)
  const declaration = allowanceDeclaration(allowance, cap.bound)
  const verified = [...items.map(i => ({ id: i.id, expected: `Prayer potion(${i.dose})` })), { id: 229, expected: 'Vial' }].every(i => mapping.data?.find(m => m.id === i.id)?.name === i.expected)
  const edit = (setter: (s: string) => void) => (s: string) => { setter(s); setDirty(true) }
  const text = (value: string, muted = false) => <Text style={{ color: muted ? p.muted : p.ink, lineHeight: 20 }}>{value}</Text>
  const field = (label: string, value: string, change: (s: string) => void, placeholder?: string) => <View style={s.field}><Text style={{ flex: 1, color: p.muted }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={edit(change)} placeholder={placeholder} placeholderTextColor={p.muted} keyboardType="number-pad" selectTextOnFocus style={[s.input, { color: p.ink, backgroundColor: p.well }]} /></View>
  const card = (children: React.ReactNode) => <View style={[s.card, { backgroundColor: p.card, borderColor: p.rule }]}>{children}</View>
  function compare () {
    setError(null); setResult(null)
    try {
      const required = [cash, ...items.flatMap(i => [buyCaps[i.id] ?? '25', sellCaps[i.id] ?? '100', owned[i.id] ?? '0']), buyCaps[229] ?? '25', sellCaps[229] ?? '100', owned[229] ?? '0']
      if (required.some(v => parse(v) === null) || (allowance !== '' && parse(allowance) === null) || (vialPrice !== '' && parse(vialPrice) === null)) throw new Error('Use nonnegative safe whole integers; no decimals, signs or separators.')
      if (declaration.error) throw new Error(declaration.error)
      if (!verified) throw new Error('Unsupported / unverified mapping. Expected 4=2434, 3=139, 2=141, 1=143 and empty vial=229. Compare is unavailable until mapping matches.')
      const vial = market.market?.get(229)
      const liquidation = (id: number) => { const low = market.market?.get(id)?.low; return low == null ? null : low - geTax(low, id) }
      const r = optimizeDoseBasket({
        family: { ordinaryVial: true, limitGroup: 'prayer-potion-shared', remainingAllowance: declaration.value, vialId: 229, items },
        cash: parse(cash)!, targetDose: target,
        quotes: items.map(i => ({ id: i.id, buy: market.market?.get(i.id)?.high ?? null, sell: market.market?.get(i.id)?.low ?? null, buyCap: parse(buyCaps[i.id] ?? '25'), sellCap: parse(sellCaps[i.id] ?? '100') })),
        vial: { buy: vialPrice === '' ? vial?.high ?? null : parse(vialPrice), sell: vial?.low ?? null, buyCap: parse(buyCaps[229] ?? '25'), sellCap: parse(sellCaps[229] ?? '100'), provenance: vialPrice === '' ? 'Declared vial acquisition price: observed live high; no Bob fee.' : 'Declared vial acquisition price: user override; no Bob fee.' },
        owned: items.map(i => ({ id: i.id, quantity: parse(owned[i.id] ?? '0')!, netLiquidation: liquidation(i.id) })),
        ownedVials: { quantity: parse(owned[229] ?? '0')!, netLiquidation: liquidation(229) },
        snapshot: `Snapshot downloaded ${market.updatedAt ? new Date(market.updatedAt).toISOString() : 'unknown'}`,
        scenario: `Observed high purchases / low sales; conditional fills, one planning window. Cash ${cash} GP; target ${target}; shared allowance ${declaration.value ?? 'unknown'} (manual model declaration; no account autofill). USER caps / owned quantities: ${[...items.map(i => i.id), 229].map(id => `${id}: buy ${buyCaps[id] ?? '25'}, sell ${sellCaps[id] ?? '100'}, owned ${owned[id] ?? '0'}`).join('; ')}.`, tax: geTax
      }, { maxQuantity: 25, maxCandidates: 10000 })
      setResult(r); setComparedTarget(target); setDirty(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Comparison unavailable. Check inputs.'); }
  }
  const plan = (title: string, v: DoseBasketPlan) => card(<>
    <Text style={[s.heading, { color: blue }]}>{title}</Text>
    {text(v.kind === 'zero-action' ? 'Zero action — retain all owned inventory unchanged. No purchases, sales or decanting.' : `Conditional conversion · ${v.status}`)}
    {text(`Economic gain: ${gp(v.economicGain)}`)}{text(`Cash surplus: ${gp(v.cashSurplus)}`)}
    {text(`Cash outlay ${gp(v.cashOutlay)} · net sales ${gp(v.netRevenue)} · owned opportunity cost ${gp(v.ownedOpportunityCost)}`, true)}
    {v.kind !== 'zero-action' && <>
      {text(`Buy: ${v.purchases.map(x => `${x.quantity} × ${name(x.id)} [${x.id}]`).join('; ') || 'none'}`)}
      {text(`Sell: ${v.sales.map(x => `${x.quantity} × ${name(x.id)} [${x.id}]`).join('; ') || 'none'}`)}
      {text(`${v.inputDoses} doses → ${v.targetQuantity} × ${comparedTarget}-dose + ${v.remainderDose ? `1 × ${v.remainderDose}-dose remainder (sold)` : 'no remainder'}.`, true)}
      {text(`Filled vials: ${v.inputContainers} in → ${v.outputContainers} out. Extra needed ${v.extraVials}; owned supplied/consumed ${v.suppliedVials}; purchased/consumed ${v.purchasedVials}; released ${v.releasedVials}; empty vials sold ${v.soldVials}. Retained: 0.`, true)}
      {text('All opted-in owned potions are consumed; all target, remainder and surplus vial outputs are sold. Retained inventory value: 0 GP.', true)}
    </>}
  </>)
  return <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={market.isRefreshing} onRefresh={market.refresh} tintColor={blue} />}>
    <Text style={[s.title, { color: blue }]}>Prayer dose basket</Text>
    {text('One ordinary vial family · up to two purchased source doses', true)}
    {card(<>
      {field('Cash budget (GP)', cash, setCash)}
      <Text style={{ color: p.muted }}>Target dose</Text><View style={s.row}>{[1, 2, 3, 4].map(d => <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: target === d }} onPress={() => { setTarget(d); setDirty(true) }} style={[s.tab, { backgroundColor: target === d ? blue : p.well }]}><Text style={{ color: target === d ? (isDark ? '#10243c' : '#fff') : p.ink }}>{d}</Text></Pressable>)}</View>
      {field('Shared remaining family allowance', allowance, setAllowance, 'Unknown')}
      {text('Blank = unknown; 0 = explicitly exhausted. Manually declare the remaining allowance for this model and window. All four purchased potion doses share it; owned potions do not consume it. No account autofill, reinvestment or guaranteed fills.', true)}
      {text(`Mapping upper bound: ${cap.bound ?? 'unknown'} (${cap.known}/4 verified dose limits known). ${cap.verifiedCap !== null ? 'All four limits agree; this is not your remaining allowance.' : 'Partial or inconsistent mapping; no verified unused-window cap.'}`, true)}
      <Pressable accessibilityRole="button" disabled={cap.verifiedCap === null} accessibilityState={{ disabled: cap.verifiedCap === null }} onPress={() => { if (cap.verifiedCap !== null) edit(setAllowance)(String(cap.verifiedCap)) }} style={s.button}><Text style={{ color: cap.verifiedCap === null ? p.muted : blue }}>Use mapping cap (unused-window scenario)</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => edit(setAllowance)('')} style={s.button}><Text style={{ color: blue }}>Reset allowance to unknown</Text></Pressable>
      {declaration.error && <Text accessibilityRole="alert" style={{ color: p.ink }}>{declaration.error} Your entry is preserved.</Text>}
      {field('Declared empty vial acquisition GP', vialPrice, setVialPrice, market.market?.get(229)?.high?.toString() ?? 'Unknown')}
      {text('Blank uses live observed high for vial 229. Override declares your acquisition price. Supply required vials; no automatic Bob fee is added.', true)}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={s.button}><Text style={{ color: blue }}>{details ? 'Hide' : 'Edit'} USER caps, owned stock & quotes</Text></Pressable>
      {details && <>
        {text('USER planning caps default to 25 buys / 100 sales per item. These are not observed liquidity or promised fills. Owned stock defaults to zero and is valued at after-tax observed low; missing prices remain unknown.', true)}
        {[...items.map(i => i.id), 229].map(id => { const q = market.market?.get(id); const low = q?.low; return <View key={id} style={[s.item, { borderColor: p.rule }]}>
          <Text style={[s.heading, { color: p.ink }]}>{name(id)} · {id}</Text>
          {text(`Buy high ${gp(q?.high ?? null)} · ${minutesAgo(q?.highTime ? q.highTime * 1000 : null) || 'age unknown'}`, true)}
          {text(`Sell low ${gp(low ?? null)} · ${minutesAgo(q?.lowTime ? q.lowTime * 1000 : null) || 'age unknown'}`, true)}
          {field(`USER buy cap ${id}`, buyCaps[id] ?? '25', v => setBuyCaps(x => ({ ...x, [id]: v })))}
          {field(`USER sell cap ${id}`, sellCaps[id] ?? '100', v => setSellCaps(x => ({ ...x, [id]: v })))}
          {field(`Owned quantity ${id}`, owned[id] ?? '0', v => setOwned(x => ({ ...x, [id]: v })))}
          {text(`Owned net liquidation / item: ${gp(low == null ? null : low - geTax(low, id))}`, true)}
        </View> })}
      </>}
    </>)}
    {text(`Mapping: ${verified ? 'IDs and names verified' : 'unsupported / awaiting verification'}. Quotes downloaded ${minutesAgo(market.updatedAt) || 'not yet'}. Pull to refresh.`, true)}
    {(market.error || mapping.error) && text(`Data error: ${(market.error ?? mapping.error)?.message}. Cached observations may be stale.`, true)}
    {text('Observed trade prices and ages are historical, not executable offers. Review stale or missing quotes before planning.', true)}
    <Pressable accessibilityRole="button" onPress={compare} style={[s.compare, { backgroundColor: blue }]}><Text style={{ color: isDark ? '#10243c' : '#fff', fontWeight: '700' }}>Compare</Text></Pressable>
    {error && <Text accessibilityRole="alert" style={{ color: p.ink }}>Comparison unavailable: {error}</Text>}
    {result && <>
      {card(<>
        <Text style={[s.heading, { color: blue }]}>Best found within search</Text>
        {text(`Optimizer: ${result.status.toUpperCase()} · coverage: ${result.coverage.status.toUpperCase()}`)}
        {text(`${result.coverage.evaluated} candidates · hard bounds: quantity 25 per source / 10,000 candidates. ${result.coverage.description}`, true)}
        {text(`Source bounds: ${result.coverage.sourceBounds.map(x => `${name(x.id)} ≤ ${x.max}`).join('; ')}`, true)}
        {result.status !== 'supported' && text(`INCOMPLETE / UNSUPPORTED — no actionable result. ${[...result.unsupportedReasons, ...result.missingInputs].join('; ')}`)}
        {text('Container conservation rule: in-game acceptance pending. Estimates only; no verified fills or returns.', true)}
        {text(dirty ? 'Inputs changed. Results below are the previous comparison; press Compare again.' : 'Saved comparison; refreshes do not rerun optimization.', true)}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAssumptions }} onPress={() => setShowAssumptions(!showAssumptions)} style={s.button}><Text style={{ color: blue }}>{showAssumptions ? 'Hide' : 'Show'} comparison assumptions</Text></Pressable>
        {showAssumptions && result.assumptions.map((a, i) => <View key={i}>{text(a, true)}</View>)}
      </>)}
      {result.status === 'supported' && !declaration.error && plan('Up to two sources', result.best)}
      {result.status === 'supported' && !declaration.error && plan('Fair single-source baseline', result.bestSingle)}
      {result.status === 'supported' && !declaration.error && text(`Within-search economic uplift: ${gp(result.uplift)}. Baseline uses identical cash, inventory, tax, vial, remainder and cap rules; includes zero action. Cash surplus excludes retained value; economic gain subtracts owned liquidation opportunity cost.`, true)}
    </>}
    {card(<>
      {text('Scope: Prayer potion ordinary vials only. Mixes, oils and cups are excluded. Shared limit covers all doses; no sales reinvestment.', true)}
      {['Prayer_potion', 'Grand_Exchange/Buying_limits', 'Decant', 'Bob_Barter_(herbs)'].map(source => <Link key={source} href={`https://oldschool.runescape.wiki/w/${source}`} style={{ color: blue, paddingVertical: 5 }}>Wiki: {source.replace(/_/g, ' ')}</Link>)}
      <Link href="https://prices.runescape.wiki/" style={{ color: blue }}>Source: Wiki real-time prices</Link>
    </>)}
  </ScrollView>
}
const s = StyleSheet.create({ page: { padding: 16, paddingBottom: 120, gap: 12 }, title: { fontSize: 26, fontWeight: '700' }, heading: { fontSize: 16, fontWeight: '600' }, card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 10 }, field: { flexDirection: 'row', alignItems: 'center', gap: 10 }, input: { width: 115, padding: 10, borderRadius: 8, fontSize: 16, fontVariant: ['tabular-nums'] }, row: { flexDirection: 'row', gap: 8 }, tab: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' }, button: { minHeight: 44, justifyContent: 'center' }, compare: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, item: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 } })
