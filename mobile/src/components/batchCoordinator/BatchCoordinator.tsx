import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { geTax, processingMethods } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { NumberField } from '../NumberField'
import { coordinateBatch } from '../../lib/batchCoordinator'
import { calculateBatchAllowances, type BatchAllowanceResult } from '../../lib/batchAllowances'
import { gpFull } from '../../lib/format'
import { ownedOpportunity, parseBatchNumber as parse } from './ownedOpportunity'
import { useTheme } from '../../theme/ThemeProvider'

// Curated whole-unit recipes only: fractional guide yields are not deterministic.
const recipes = processingMethods.flatMap(m => m.recipes.map(r => ({ ...r, group: m.title, requirements: m.requirements, description: m.description, notes: 'notes' in r && typeof r.notes === 'string' ? r.notes : null })))
  .filter(r => new Set(r.inputs.map(i => i.id)).size > 1 && [...r.inputs, ...r.outputs].every(i => Number.isSafeInteger(i.qty) && i.qty > 0))
const money = (n: number | null) => n === null ? 'Unknown' : `${gpFull(n)} gp`

export function BatchCoordinator () {
  const { palette } = useTheme()
  const market = useMarket()
  const [recipeId, setRecipeId] = useState(recipes[0]?.id)
  const [search, setSearch] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [showOpportunityDetails, setShowOpportunityDetails] = useState(false)
  const [goalText, setGoalText] = useState('100')
  const [budgetText, setBudgetText] = useState('1000000')
  const [ownedText, setOwnedText] = useState<Record<number, string>>({})
  const [remainingText, setRemainingText] = useState<Record<number, string>>({})
  const recipe = recipes.find(r => r.id === recipeId)
  const goal = parse(goalText)
  const budget = parse(budgetText)
  const inputIds = [...new Set(recipe?.inputs.map(i => i.id) ?? [])]
  const fullLimit = (id: number): number | undefined => {
    const limit = market.market?.get(id)?.limit
    return typeof limit === 'number' && Number.isSafeInteger(limit) && limit > 0 ? limit : undefined
  }
  const valid = inputIds.every(id => parse(ownedText[id] ?? '0') !== null)
  const allowanceErrors = inputIds.flatMap(id => {
    const raw = remainingText[id] ?? ''
    const remaining = parse(raw)
    const limit = fullLimit(id)
    if (raw.trim() !== '' && remaining === null) return [`Item #${id}: remaining must be a whole number from 0 to 1,000,000,000.`]
    if (remaining !== null && limit !== undefined && remaining > limit) return [`Item #${id}: remaining exceeds the full mapping limit of ${gpFull(limit)}. Update your declaration; the entered value is preserved.`]
    return []
  })
  let allowanceResult: BatchAllowanceResult | null = null
  let allowanceError: string | null = null
  if (recipe && goal !== null && valid && !allowanceErrors.length) {
    try {
      allowanceResult = calculateBatchAllowances(recipe.inputs, goal, Object.fromEntries(inputIds.map(id => [id, {
        owned: parse(ownedText[id] ?? '0') ?? 0,
        remaining: parse(remainingText[id] ?? ''),
        knownFullLimit: fullLimit(id)
      }])))
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
      allowanceError = `Cannot calculate manual allowances: ${error.message}`
    }
  }
  const opportunity = ownedOpportunity(recipe, goal, budget, ownedText, id => market.market?.get(id), geTax)
  const comparison = opportunity.kind === 'ready' ? opportunity.result : null
  const plan = opportunity.kind === 'ready' && recipe && goal !== null && budget !== null && valid ? coordinateBatch(recipe, goal, budget,
    Object.fromEntries(inputIds.map(id => [id, parse(ownedText[id] ?? '0') ?? 0])),
    id => { const item = market.market?.get(id); return item ? { buy: item.high, sell: item.low } : null }, geTax) : null
  const name = (id: number) => market.market?.get(id)?.name ?? `Item #${id}`
  const text = { color: palette.ink }
  const muted = { color: palette.muted }
  const card = [styles.card, { backgroundColor: palette.card }]
  const button = [styles.button, { backgroundColor: palette.well }]
  const matches = recipes.filter(r => `${r.name} ${r.group}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <Text accessibilityRole="header" style={[styles.title, text]}>Recipe batch coordinator</Text>
      <Text style={muted}>Coordinate ingredients you already have with shopping and cash still needed.</Text>
      <View style={card}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: choosing }} onPress={() => setChoosing(!choosing)} style={button}><Text style={{ color: palette.brand }}>{recipe?.name ?? 'Choose recipe'} · Change recipe</Text></Pressable>
        {choosing && <>
          <TextInput accessibilityLabel="Search recipes" placeholder="Search curated recipes" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} style={[styles.search, text, { backgroundColor: palette.well }]} />
          <Text style={muted}>{matches.length} matches · showing first 20</Text>
          {matches.slice(0, 20).map(r => <Pressable key={r.id} style={button} accessibilityRole="button" onPress={() => { setRecipeId(r.id); setOwnedText({}); setRemainingText({}); setChoosing(false) }}><Text style={text}>{r.name} · {r.group}</Text></Pressable>)}
        </>}
        <Text style={muted}>{recipe?.requirements}</Text>
        <Text style={muted}>{recipe?.description}</Text>
        {recipe?.notes ? <Text style={muted}>{recipe.notes}</Text> : null}
        <Text style={muted}>One batch: {recipe?.inputs.map(i => `${i.qty} × ${name(i.id)}`).join(' + ')} → {recipe?.outputs.map(i => `${i.qty} × ${name(i.id)}`).join(' + ')}</Text>
        <NumberField label="Batch goal" value={goalText} onChange={setGoalText} />
        <NumberField label="Cash budget" value={budgetText} onChange={setBudgetText} />
        <Text style={muted}>Additional cash available now. Fees are reserved; sale proceeds are not reinvested.</Text>
      </View>
      <View style={card}>
        <Text style={[styles.heading, text]}>Owned stock & manual allowances</Text>
        {inputIds.map(id => <View key={id} style={styles.ingredient}>
          <Text style={text}>{name(id)} · ID {id}</Text>
          <NumberField label="Owned units" value={ownedText[id] ?? '0'} onChange={v => setOwnedText(prev => ({ ...prev, [id]: v }))} />
          <Text style={muted}>Full mapping limit: {fullLimit(id) === undefined ? 'Unknown · unverified full cap' : gpFull(fullLimit(id)!)}. Informational cap, not current remaining.</Text>
          <NumberField label="Remaining units" value={remainingText[id] ?? ''} onChange={v => setRemainingText(prev => ({ ...prev, [id]: v }))} />
          <Text style={muted}>Manual declaration for this purchase window · blank = unknown; 0 = none remaining.{fullLimit(id) === undefined ? ' Declaration has an unverified full cap.' : ''}</Text>
        </View>)}
        <Text style={muted}>Owned stock does not consume remaining allowance. Account for prior purchases and connected limit groups yourself; independent item ID bounds may overstate what a shared group permits. Open offers and uncollected fills are not imported.</Text>
      </View>
      <View style={card}>
        <Text style={[styles.heading, text]}>Process or sell owned inputs?</Text>
        {opportunity.kind === 'unavailable' ? <Text style={muted}>Comparison unavailable. {opportunity.reason}</Text> : comparison && <>
          <Text style={{ color: comparison.incrementalValue !== null && comparison.incrementalValue > 0 ? palette.brand : palette.muted, fontWeight: '600' }}>Estimated extra value from processing: {comparison.incrementalValue === null ? 'Unknown' : `${gpFull(comparison.incrementalValue)} GP`} versus selling these owned inputs now.</Text>
          <Text style={text}>New cash required: {money(comparison.newCashNeeded)}</Text>
          <Text style={text}>Budget shortfall: {money(comparison.cashShortfall)}</Text>
          <Text style={muted}>{comparison.cashAffordable === null ? 'Cash fit unknown at these quotes.' : comparison.cashAffordable ? 'Full goal fits the cash budget at these quotes.' : 'Full goal exceeds the cash budget at these quotes.'} Cash fit alone does not establish an executable goal; see declared ingredient allowances separately.</Text>
          {comparison.missingQuotes.length > 0 && <Text style={muted}>Missing quotes: {comparison.missingQuotes.map(q => `${name(q.id)} (${q.side === 'buy' ? 'purchase high' : 'liquidation low'})`).join(', ')}. Affected estimates remain Unknown.</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showOpportunityDetails }} onPress={() => setShowOpportunityDetails(!showOpportunityDetails)} style={button}><Text style={{ color: palette.brand }}>{showOpportunityDetails ? 'Hide' : 'Show'} comparison breakdown</Text></Pressable>
          {showOpportunityDetails && <>
            <Text style={text}>Sell-now baseline for consumed owned inputs, after tax: {money(comparison.sellNowConsumedOwned)}</Text>
            <Text style={text}>Net output receipts, including direct coins: {money(comparison.netReceipts)}</Text>
            <Text style={muted}>Output GE tax: {money(comparison.outputTax)}</Text>
            <Text style={text}>Processing fees: {money(comparison.fees)} · direct coin receipts: {money(comparison.directCoins)}</Text>
            {comparison.items.map(i => <View key={i.id} style={styles.ingredient}>
              <Text style={text}>{name(i.id)} · ID {i.id}</Text>
              <Text style={text}>Owned consumed: {gpFull(i.consumedOwned)} · purchases: {gpFull(i.purchases)} · owned surplus retained: {gpFull(i.surplus)}</Text>
              <Text style={muted}>Total consumed: {gpFull(i.consumed)} · output produced: {gpFull(i.produced)}</Text>
              <Text style={muted}>Instant purchase high: {money(market.market?.get(i.id)?.high ?? null)} · liquidation low: {money(market.market?.get(i.id)?.low ?? null)} per unit</Text>
            </View>)}
          </>}
          <Text style={muted}>Only owned units consumed by this goal enter the sell-now baseline. Unused surplus is retained in both scenarios. Neither the baseline nor output receipts fund upfront purchases or fees. This is a quote-based estimate, not realised profit; replacement margin is shown separately below.</Text>
        </>}
      </View>
      {allowanceErrors.map(error => <Text key={error} style={text}>{error}</Text>)}
      {allowanceError && <Text style={text}>{allowanceError}</Text>}
      {allowanceResult && <View style={card}>
        <Text style={[styles.heading, text]}>Declared ingredient allowances only</Text>
        <Text style={{ color: palette.brand }}>{allowanceResult.status === 'feasible' ? 'Goal fits declared allowances' : allowanceResult.status === 'blocked' ? 'Goal blocked by declared allowances' : 'Goal allowance fit unknown'}</Text>
        <Text style={text}>{allowanceResult.maxActions.kind === 'unknown' ? 'Maximum batches: unknown' : `${allowanceResult.maxActions.kind === 'exact' ? 'Exact maximum' : 'Known upper bound'}: ${gpFull(allowanceResult.maxActions.value)} batches under these ingredient declarations`}</Text>
        {allowanceResult.ingredients.map(i => <View key={i.id} style={styles.ingredient}>
          <Text style={text}>{name(i.id)} · ID {i.id}</Text>
          <Text style={text}>Remaining: {i.remaining === null ? 'Unknown' : gpFull(i.remaining)} · shopping: {gpFull(i.shopping)} · shortfall: {i.knownShortfall === null ? 'Unknown' : gpFull(i.knownShortfall)}</Text>
          <Text style={muted}>{i.status === 'enough' ? 'Goal covered by owned stock and declared allowance' : i.status === 'exceeds' ? 'Shopping exceeds declared remaining' : 'Shopping allowance unknown'}</Text>
        </View>)}
        <Text style={muted}>Ingredient bounds only, independent of cash. This does not establish an executable combined goal or promise fills, resets or reinvestment. Refreshing quotes never refills or resets declarations.</Text>
      </View>}
      {!plan && (goal === null || budget === null || !valid) && <Text style={text}>Enter whole numbers from 0 to 1,000,000,000 for goal, cash and owned units. Remaining may be blank for unknown. Use digits only; no commas or decimals.</Text>}
      {plan && <>
        <View style={card}>
          <Text style={[styles.heading, { color: palette.brand }]}>{gpFull(plan.complete)} / {gpFull(goal ?? 0)} batches ready from inventory</Text>
          <Text style={text}>Ingredient bottleneck: {plan.bottlenecks.length ? plan.bottlenecks.map(name).join(', ') : 'Goal covered'}</Text>
          <Text style={text}>Cash-only batches affordable after shopping: {plan.affordable === null ? 'Unknown — missing prices' : gpFull(plan.affordable)}</Text>
          <Text style={text}>Cash still needed for full goal: {money(plan.cashNeeded)}</Text>
          <Text style={muted}>{plan.cashNeeded === null ? 'Missing input quotes prevent a cash estimate.' : plan.cashNeeded > (budget ?? 0) ? `Budget shortfall: ${money(plan.cashNeeded - (budget ?? 0))}` : 'Full goal fits the cash budget at these quotes; ingredient allowances are assessed separately.'}</Text>
          <Text style={muted}>Processing fees included: {money(plan.fees)}</Text>
        </View>
        <View style={card}>
          <Text style={[styles.heading, text]}>Shopping & surplus</Text>
          {plan.ingredients.map(i => <View style={styles.ingredient} key={i.id}>
            <Text style={text}>{name(i.id)} · {gpFull(i.qty)} per batch</Text>
            <Text style={text}>Buy {gpFull(i.shopping)} · need {gpFull(i.required)} total</Text>
            <Text style={muted}>Left after ready batches: {gpFull(i.stranded)} · excess beyond goal: {gpFull(i.surplus)}</Text>
          </View>)}
          <Text style={muted}>Left after ready batches includes ingredients waiting on the bottleneck. Excess beyond the goal stays unused even after shopping.</Text>
        </View>
        <View style={card}>
          <Text style={[styles.heading, text]}>Full goal economics · estimate</Text>
          <Text style={text}>Net output proceeds: {money(plan.netProceeds)}</Text>
          <Text style={muted}>GE output tax: {money(plan.outputTax)}</Text>
          <Text style={text}>Replacement input cost + fees: {money(plan.replacementCost)}</Text>
          <Text style={muted}>Owned inputs at replacement value: {money(plan.ownedReplacementCost)}</Text>
          <Text style={{ color: palette.brand, fontWeight: '600' }}>Projected margin after replacement cost: {money(plan.projectedMargin)}</Text>
          <Text style={muted}>Owned inputs have value. Historical purchase cost is not tracked. Replacement value uses current observed high prices. This is a quote-based scenario, not measured profit.</Text>
        </View>
      </>}
      <Text style={muted}>Inputs use observed high prices; outputs use observed low prices with per-item GE tax. Quotes can be stale and do not guarantee fills. Buy allowances use manual independent item bounds with no automatic purchase or reset sync. Travel, processing time and fill times are not modeled. Check skill and membership requirements before acting.</Text>
      <Text style={muted}>{market.updatedAt ? `Quotes downloaded ${new Date(market.updatedAt).toLocaleTimeString()}` : market.isLoading ? 'Loading quotes…' : 'Quotes unavailable.'}{market.error ? ' Refresh failed; cached quotes may be shown.' : ''}</Text>
      <Pressable style={button} accessibilityRole="button" onPress={market.refresh}><Text style={{ color: palette.brand }}>{market.isRefreshing ? 'Refreshing…' : 'Refresh quotes'}</Text></Pressable>
      <Text style={muted}>Scenario stays on this screen only.</Text>
    </ScrollView>
  )
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  card: { padding: 16, borderRadius: 12, gap: 12 },
  ingredient: { gap: 6, paddingVertical: 6 },
  button: { padding: 12, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  search: { padding: 12, borderRadius: 8, fontSize: 16 }
})
