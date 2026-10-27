import { useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useMarket } from '../../api/useMarket'
import { compareRepair, repairDefinition, type RepairAmounts } from '../../lib/repairComparison'
import { gpFull } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { NumberField } from '../NumberField'

export function RepairComparison () {
  const { palette: p } = useTheme()
  const prices = useMarket()
  const [quantity, setQuantity] = useState('1')
  const [smithing, setSmithing] = useState('60')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const count = Number(quantity)
  const level = Number(smithing)
  const validCount = /^\d+$/.test(quantity) && Number.isSafeInteger(count) && count >= 0
  const validLevel = /^\d+$/.test(smithing) && Number.isSafeInteger(level) && level >= 1 && level <= 99
  const valid = validCount && validLevel
  let comparison: ReturnType<typeof compareRepair> | null = null
  let calculationError: string | null = null
  try {
    if (prices.market) comparison = compareRepair({ ...prices.market, nowSec: Math.floor(now / 1000) }, validLevel ? level : 60, validCount ? count : 1)
  } catch (error) {
    calculationError = error instanceof Error ? error.message : 'Calculation unavailable'
  }
  const text = { color: p.ink }
  const muted = { color: p.muted }
  const amountRows: [keyof RepairAmounts, string][] = [
    ['purchase', 'Purchase'], ['fee', 'Cash repair fee'], ['upfrontCash', 'Upfront purchase + fee'],
    ['grossSale', 'Gross sale'], ['tax', 'GE sale tax'], ['netSale', 'Sale after tax'], ['profit', 'Net margin']
  ]
  const amounts = (value: RepairAmounts | null) => value
    ? amountRows.map(([key, label]) => <View key={key} style={styles.row}>
      <Text style={[styles.cell, muted]}>{label}</Text>
      <Text style={[styles.value, { color: key === 'profit' ? value.profit > 0 ? p.profit : p.muted : p.ink }]}>{gpFull(value[key])} GP</Text>
    </View>)
    : <Text style={muted}>Unavailable: a required market quote is missing.</Text>
  return <ScrollView style={{ backgroundColor: p.bg }} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={prices.isRefreshing} onRefresh={prices.refresh} tintColor={p.brand} />}>
    <Text style={[styles.title, text]}>Repair comparison</Text>
    <Text style={[styles.heading, text]}>Dharok’s platelegs 0 → undamaged</Text>
    <Text style={muted}>Fully broken 4902 → undamaged 4722 only. Observed high buy / low sell quotes; these are not confirmed fills.</Text>
    <View style={[styles.card, { backgroundColor: p.card }]}>
      <NumberField label="Quantity" value={quantity} onChange={setQuantity} />
      {!validCount && <Text style={muted}>Enter a whole quantity from 0 to {gpFull(Number.MAX_SAFE_INTEGER)} using digits only.</Text>}
      <NumberField label="Smithing" value={smithing} onChange={setSmithing} />
      <Text style={muted}>Unboosted Smithing, 1–99. Default: 60. Boosts are not modeled.</Text>
      {!validLevel && <Text style={muted}>Enter a whole unboosted Smithing level from 1 to 99 using digits only.</Text>}
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: prices.isRefreshing }} disabled={prices.isRefreshing} onPress={prices.refresh} style={styles.refresh}>
      <Text style={{ color: p.brand }}>{prices.isRefreshing ? 'Refreshing prices…' : 'Refresh prices'}</Text>
    </Pressable>
    <Text style={muted}>Quote download: {prices.updatedAt ? new Date(prices.updatedAt).toISOString() : 'not available'}. Download time is not quote age.</Text>
    {prices.isLoading && <Text style={muted}>Loading market data…</Text>}
    {prices.error && <Text style={muted}>{prices.market ? 'Refresh failed. Available cached observations remain visible; their individual ages are shown below.' : 'Market data unavailable. Refresh to retry; no comparison is available.'}</Text>}
    {!prices.isLoading && !prices.market && !prices.error && <Text style={muted}>Market data is not available yet.</Text>}
    {calculationError && <Text accessibilityRole="alert" style={muted}>Comparison unavailable: {calculationError}. Reduce the quantity if arithmetic exceeds the safe range.</Text>}
    {comparison && <>
      <View style={[styles.card, { backgroundColor: p.card }]}>
        <Text style={[styles.heading, text]}>Individual quote observations</Text>
        {[comparison.quotes.input, comparison.quotes.output].map(quote => {
          const knownTime = quote.time !== null && Number.isFinite(quote.time) && Math.abs(quote.time * 1000) <= 8.64e15
          return <View key={quote.id} style={styles.quote}>
            <Text style={text}>{quote.id === 4902 ? 'Broken input · high buy' : 'Undamaged output · low sell'} · {quote.id}</Text>
            <Text style={text}>{quote.price === null ? 'Missing quote' : `${gpFull(quote.price)} GP per item`}</Text>
            <Text style={muted}>Raw time: {quote.time === null ? 'missing' : String(quote.time)}{knownTime ? ` · ${new Date(quote.time! * 1000).toISOString()}` : ''}</Text>
            <Text style={muted}>Age: {quote.ageSec === null ? 'unknown — missing or invalid timestamp' : `${gpFull(quote.ageSec)} seconds`}. {quote.price === null ? 'Missing price. ' : ''}{quote.stale === null ? 'Freshness unknown.' : quote.stale ? 'Stale (over 5 minutes).' : 'Within 5-minute freshness threshold.'}</Text>
            <Text style={muted}>Mapping buy limit: {quote.mappingLimit === null ? 'unknown' : gpFull(quote.mappingLimit)}. Metadata only; not remaining allowance or attainable quantity.</Text>
          </View>
        })}
      </View>
      {valid && (['npc', 'stand'] as const).map(method => {
        const result = comparison[method]
        return <View key={method} style={[styles.card, { backgroundColor: p.card }]}>
          <Text style={[styles.heading, text]}>{method === 'npc' ? 'NPC repair' : 'Armour stand'}</Text>
          <Text style={muted}>Fee per item: {gpFull(result.recipe.coinCost!)} GP{method === 'stand' ? ` · unboosted Smithing ${level}` : ''}</Text>
          <Text style={[styles.subheading, text]}>Per item</Text>
          {amounts(result.perItem)}
          <Text style={[styles.subheading, text]}>Fixed upfront batch · {gpFull(count)} items</Text>
          {amounts(result.batch)}
        </View>
      })}
    </>}
    <View style={[styles.card, { backgroundColor: p.card }]}>
      <Text style={[styles.heading, text]}>Scope and access</Text>
      <Text style={muted}>All inputs are purchased and cash repair fees are paid upfront. Net margin = sale after GE tax − purchase − repair fee. No owned stock, boost costs, travel, or stand construction costs are included.</Text>
      <Text style={muted}>Members only. Use an armour stand in a player-owned house you can access, including another player’s where account restrictions permit. Building your own requires 55 Construction; that is not required to use an accessible stand. Verify membership and house access before relying on the comparison.</Text>
      <Text style={muted}>70 Defence is required to wear the platelegs, not to repair them. Stand fee = 80,000 × (1 − unboosted Smithing / 200). Actual boosts can affect fees, but are excluded here.</Text>
      <Text style={muted}>This fixed batch is not sized by cash, buy limits, or market depth. Stale observations remain visible and may no longer be available.</Text>
      <Link href={repairDefinition.source} style={[styles.source, { color: p.brand }]}>Wiki: item pair and wear requirement</Link>
      <Link href={repairDefinition.feeSource} style={[styles.source, { color: p.brand }]}>Wiki: NPC repair fees</Link>
      <Link href={repairDefinition.formulaSource} style={[styles.source, { color: p.brand }]}>Wiki: armour stand fee formula</Link>
      <Link href="https://oldschool.runescape.wiki/w/Player-owned_house" style={[styles.source, { color: p.brand }]}>Wiki: house access and account restrictions</Link>
      <Link href={repairDefinition.mappingSource} style={[styles.source, { color: p.brand }]}>Wiki Prices: item mapping metadata</Link>
    </View>
  </ScrollView>
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  subheading: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  card: { padding: 16, borderRadius: 12, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
  value: { fontVariant: ['tabular-nums'], flexShrink: 1 },
  quote: { gap: 6, paddingVertical: 6 },
  refresh: { paddingVertical: 12, alignSelf: 'flex-start' },
  source: { paddingVertical: 8 }
})
