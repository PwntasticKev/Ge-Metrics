import { useState } from 'react'
import { ScrollView, RefreshControl, Text, TextInput, Pressable, View } from 'react-native'
import { buildRecipes, geTax, type WikiAverage } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { useAverages } from '../../api/useAverages'
import { useTheme } from '../../theme/ThemeProvider'
import { batchConstraint, compareSet, evaluateSet, type Direction, type LabQuote } from '../../lib/setProfitLab'
import { buyFillHours, sellFillHours, flowFromAverages } from '../../lib/analytics/fillTime'
import { duration, gpFull, minutesAgo, signed } from '../../lib/format'
const recipes = buildRecipes().filter(r => r.kind === 'ge-set' && r.reversible)
export default function SetProfitLabScreen () {
  const market = useMarket(); const averages = useAverages(); const { palette: p } = useTheme()
  const [query, setQuery] = useState(''); const [chosen, setChosen] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>('combine'); const [leg, setLeg] = useState<number | null>(null)
  const [delta, setDelta] = useState(0); const [cash, setCash] = useState('1000000'); const [baseline, setBaseline] = useState<'hour' | 'day'>('hour')
  const available = recipes.filter(r => market.market?.get(r.setId))
  const recipe = available.find(r => r.id === chosen) ?? available.find(r => r.setId === 12863) ?? available[0]
  const text = (s: string, muted = false) => <Text style={{ color: muted ? p.muted : p.ink, fontSize: 14, lineHeight: 21 }}>{s}</Text>
  const button = (s: string, action: () => void, selected = false) => <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected }} onPress={action} style={{ backgroundColor: selected ? p.brand : p.well, padding: 10, borderRadius: 8 }}><Text style={{ color: selected ? p.onBrand : p.ink }}>{s}</Text></Pressable>
  const inputStyle = { color: p.ink, backgroundColor: p.well, borderRadius: 8, padding: 12, fontSize: 15 }
  const quotesFor = (avg?: Record<string, WikiAverage>): LabQuote[] => recipe ? [{ id: recipe.setId, qty: 1 }, ...recipe.parts].flatMap(part => {
    const item = market.market?.get(part.id); const a = avg?.[part.id]
    const buy = avg ? (a?.lowPriceVolume ? a.avgLowPrice : null) : item?.low
    const sell = avg ? (a?.highPriceVolume ? a.avgHighPrice : null) : item?.high
    return item ? [{ ...part, name: item.name, buy: buy ?? null, sell: sell ?? null, limit: item.limit }] : []
  }) : []
  const live = quotesFor(); const selected = live.find(q => q.id === leg) ?? live.find(q => q.id === recipe?.parts[0]?.id)
  const side = (direction === 'combine' ? selected?.id !== recipe?.setId : selected?.id === recipe?.setId) ? 'buy' : 'sell'
  const selectedPrice = selected?.[side]
  const scenario = live.map(q => q.id === selected?.id && selectedPrice != null ? { ...q, [side]: Math.max(1, selectedPrice + delta) } : q)
  const plan = recipe ? evaluateSet(recipe, scenario, direction, geTax) : null
  const current = recipe ? evaluateSet(recipe, live, direction, geTax) : null
  const h1 = averages.h1 ? quotesFor(averages.h1) : []; const h24 = averages.h24 ? quotesFor(averages.h24) : []
  const prior = baseline === 'hour' ? h1 : h24
  const impacts = recipe ? compareSet(recipe, live, prior, direction, geTax) : null
  const old = recipe ? evaluateSet(recipe, prior, direction, geTax) : null
  const missingFlow = plan && [...plan.buy, ...plan.sell].some(q => !flowFromAverages(averages.h1?.[q.id], averages.h24?.[q.id]))
  const batch = plan && !missingFlow ? batchConstraint(plan, scenario, Number(cash) || 0, 4, (id, side, price, qty) => {
    const flow = flowFromAverages(averages.h1?.[id], averages.h24?.[id])
    return flow ? (side === 'buy' ? buyFillHours : sellFillHours)(flow, price, qty) : Infinity
  }) : null
  const reset = () => { setDelta(0); setLeg(null) }
  const price = (value: number | null | undefined, qty = 1) => value != null && Number.isFinite(value) && value > 0 ? gpFull(value * qty) : 'unavailable'
  const pair = (q?: LabQuote) => q ? `${price(q.buy)} / ${price(q.sell)}` : 'unavailable'
  return <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets style={{ backgroundColor: p.bg }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={market.isRefreshing || averages.isRefreshing} onRefresh={() => { market.refresh(); averages.refresh() }} tintColor={p.brand} />}>
    <Text accessibilityRole="header" style={{ color: p.ink, fontSize: 28, fontWeight: '700' }}>Set profit lab</Text>
    {text('Trace the gap, then test how easily it disappears. GE sets exchange in either direction at a clerk for free.', true)}
    {text(`Quotes downloaded: ${minutesAgo(market.updatedAt) || 'waiting'}. Hour/day are period averages, not prices exactly 1h/24h ago.`, true)}
    {text(`Averages downloaded · hour: ${minutesAgo(averages.h1UpdatedAt) || 'waiting'} · day: ${minutesAgo(averages.h24UpdatedAt) || 'waiting'}.`, true)}
    {market.error || averages.refreshError ? text(`Refresh failed: ${market.error?.message ?? averages.refreshError?.message}. Pull to retry; cached values may remain.`, true) : null}
    {market.isLoading ? text('Loading Wiki market prices…') : null}
    <TextInput accessibilityLabel="Search GE sets" placeholder="Find a set" placeholderTextColor={p.muted} value={query} onChangeText={setQuery} style={inputStyle} />
    <View style={{ gap: 6 }}>{available.filter(r => market.market?.get(r.setId)?.name.toLowerCase().includes(query.toLowerCase())).slice(0, query ? 15 : 4).map(r => button(market.market!.get(r.setId)!.name, () => { setChosen(r.id); reset() }, r.id === recipe?.id))}</View>
    {recipe ? <>
      <Text accessibilityRole="header" style={{ color: p.ink, fontSize: 20, fontWeight: '700' }}>{market.market?.get(recipe.setId)?.name}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{button('Combine', () => { setDirection('combine'); reset() }, direction === 'combine')}{button('Unpack', () => { setDirection('split'); reset() }, direction === 'split')}</View>
      {(['combine', 'split'] as const).map(d => { const x = evaluateSet(recipe, live, d, geTax); return <View key={d}>{text(`${d === 'combine' ? 'Combine' : 'Unpack'} observed gap: ${x ? signed(x.profit) + ' GP / set after tax' : 'missing prices'}`)}</View> })}
      {current ? text(`Buy ${gpFull(current.cost)} → exit ${gpFull(current.revenue - current.tax)} after ${gpFull(current.tax)} tax. Low-side buys and high-side exits are observed trades, not your fills.`, true) : text('Required trade sides are missing; no complete profit estimate.')}
      <View style={{ flexDirection: 'row', gap: 8 }}>{button('Hour comparison', () => setBaseline('hour'), baseline === 'hour')}{button('Day comparison', () => setBaseline('day'), baseline === 'day')}</View>
      {text(old && current ? `Gap changed ${signed(current.profit - old.profit)} GP vs ${baseline} average. Contributions include sale tax.` : 'Comparison unavailable: a component is missing traded prices.', true)}
      {live.map(q => <View key={q.id} style={{ backgroundColor: p.card, borderRadius: 10, padding: 12, gap: 5 }}>
        {button(`${q.qty} × ${q.name}`, () => { setLeg(q.id); setDelta(0) }, q.id === selected?.id)}
        {text(`Buy / sell each: ${pair(q)}`)}
        {text(`Basket buy / gross exit: ${price(q.buy, q.qty)} / ${price(q.sell, q.qty)} GP · oldest trade ${minutesAgo(Math.min(market.market?.get(q.id)?.lowTime ?? 0, market.market?.get(q.id)?.highTime ?? 0) * 1000) || 'time unknown'}`, true)}
        {text(`Hour: ${pair(h1.find(x => x.id === q.id))} · Day: ${pair(h24.find(x => x.id === q.id))}`, true)}
        {text(`Gap contribution: ${impacts ? signed(impacts.find(x => x.id === q.id)?.impact ?? 0) + ' GP' : 'unavailable'}`, true)}
      </View>)}
      {selected && current && selectedPrice != null ? <>
        {text(`Stress ${selected.name} ${side} price (${selected.qty} per set)`)}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[-1, 1].map(n => button(`${n > 0 ? '+' : ''}${n} GP`, () => setDelta(v => v + n)))}{[-1, 1].map(n => button(`${n > 0 ? '+' : ''}${n}%`, () => setDelta(v => v + n * Math.max(1, Math.round(selectedPrice * 0.01)))))}{button('Reset', () => setDelta(0))}</View>
        {text(`Scenario price ${gpFull(Math.max(1, selectedPrice + delta))} · gap ${signed(plan?.profit ?? null)} GP (${signed(plan ? plan.profit - current.profit : null)} vs observed)`)}
        {text(`+1 GP changes the gap by ${signed(evaluateSet(recipe, live.map(q => q.id === selected.id ? { ...q, [side]: selectedPrice + 1 } : q), direction, geTax)!.profit - current.profit)} GP. Percentage steps use the observed price and round to whole GP; tax is recalculated.`, true)}
      </> : null}
      {text('Cash available (GP)')}<TextInput accessibilityLabel="Cash available in GP" keyboardType="number-pad" value={cash} onChangeText={v => setCash(v.replace(/[^0-9]/g, '').slice(0, 12))} style={inputStyle} />
      {text(batch?.quantity != null ? `4h scenario cap: ${batch.quantity} sets${batch.quantity ? `, modeled cycle ${duration(batch.hours!)} · ${signed((plan?.profit ?? 0) * batch.quantity)} GP` : ' within cash, limits and modeled flow'}` : 'Batch estimate unavailable: missing flow or buy limits.')}
      {text('Assumes unused buy limits and enough GE slots for parallel buys, then parallel sells. Uses slower hour/day side flow and the app’s queue-share model. Excludes clerk travel, existing offers and changing competition. This is a scenario cap, not a fill guarantee or measured GP/h.', true)}
      {text('Latest trades can be stale or isolated; averages can lag. A positive gap does not prove executable arbitrage.', true)}
    </> : !market.isLoading ? text('No mapped sets available. Pull to retry.') : null}
  </ScrollView>
}
