import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { geTax, processingMethods } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { NumberField } from '../NumberField'
import { combineBatches } from '../../lib/combinedBatches'
import { gpFull } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'

// Match BatchCoordinator's curated multi-input, whole deterministic recipes.
const recipes = processingMethods.flatMap(m => m.recipes.map(r => ({ ...r, group: m.title, requirements: m.requirements, description: m.description, notes: 'notes' in r && typeof r.notes === 'string' ? r.notes : null })))
  .filter(r => new Set(r.inputs.map(i => i.id)).size > 1 && [...r.inputs, ...r.outputs].every(i => Number.isSafeInteger(i.qty) && i.qty > 0))
const parse = (text: string): number | null => {
  const raw = text.trim()
  const n = Number(raw)
  return /^\d+$/.test(raw) && Number.isSafeInteger(n) && n <= 1_000_000_000 ? n : null
}
const money = (n: number | null) => n === null ? 'Unknown' : `${gpFull(n)} gp`

export function CombinedBatches () {
  const { palette } = useTheme()
  const market = useMarket()
  const [recipeIds, setRecipeIds] = useState([recipes[0]?.id, recipes[1]?.id ?? recipes[0]?.id])
  const [goals, setGoals] = useState(['100', '100'])
  const [searches, setSearches] = useState(['', ''])
  const [choosing, setChoosing] = useState<number | null>(null)
  const [budgetText, setBudgetText] = useState('1000000')
  const [owned, setOwned] = useState<Record<number, string>>({})
  const [remaining, setRemaining] = useState<Record<number, string>>({})
  const selected = recipeIds.map(id => recipes.find(r => r.id === id))
  const inputIds = [...new Set(selected.flatMap(r => r?.inputs.map(i => i.id) ?? []))]
  const name = (id: number) => market.market?.get(id)?.name ?? `Item #${id}`
  const fullLimit = (id: number) => {
    const n = market.market?.get(id)?.limit
    return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : undefined
  }
  const budget = parse(budgetText)
  const parsedGoals = goals.map(parse)
  const errors: string[] = []
  if (budget === null || parsedGoals.some(n => n === null) || inputIds.some(id => parse(owned[id] ?? '0') === null)) {
    errors.push('Goals, cash budget and owned units must be whole numbers from 0 to 1,000,000,000. Use digits only; no commas or decimals.')
  }
  for (const id of inputIds) {
    const raw = remaining[id] ?? ''
    const n = parse(raw)
    const cap = fullLimit(id)
    if (raw.trim() && n === null) errors.push(`${name(id)}: remaining must be a whole number from 0 to 1,000,000,000, or blank for unknown.`)
    else if (n !== null && cap !== undefined && n > cap) errors.push(`${name(id)}: remaining exceeds the full mapping limit of ${gpFull(cap)}. Update your declaration; the entered value is preserved.`)
  }
  let plan: ReturnType<typeof combineBatches> | null = null
  if (!errors.length && budget !== null && selected.every(r => r !== undefined)) {
    try {
      plan = combineBatches(selected.map((recipe, i) => ({ recipe: recipe!, goal: parsedGoals[i]! })), {
        budget,
        allowances: Object.fromEntries(inputIds.map(id => [id, { owned: parse(owned[id] ?? '0')!, remaining: parse(remaining[id] ?? ''), knownFullLimit: fullLimit(id) }])),
        prices: id => { const item = market.market?.get(id); return item ? { buy: item.high, sell: item.low } : null },
        tax: geTax
      })
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
      errors.push(`Cannot calculate combined batches: ${error.message}`)
    }
  }
  const text = { color: palette.ink }
  const muted = { color: palette.muted }
  const card = [styles.card, { backgroundColor: palette.card }]
  const button = [styles.button, { backgroundColor: palette.well }]
  return <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
    <Text accessibilityRole="header" style={[styles.title, text]}>Combined two-batch coordinator</Text>
    <Text style={muted}>Two independent parallel batches sharing one stock declaration and one upfront cash budget. All inputs are required upfront; neither batch’s outputs supply the other’s inputs. No reinvestment, routes or fill assumptions.</Text>
    {selected.map((recipe, index) => {
      const matches = recipes.filter(r => `${r.name} ${r.group}`.toLowerCase().includes(searches[index].toLowerCase()))
      return <View style={card} key={index}>
        <Text style={[styles.heading, text]}>Batch {index + 1}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: choosing === index }} style={button} onPress={() => setChoosing(choosing === index ? null : index)}><Text style={{ color: palette.brand }}>{recipe?.name ?? 'Choose recipe'} · Change recipe</Text></Pressable>
        <Text style={muted}>Selecting either recipe resets ALL owned and remaining declarations.</Text>
        {choosing === index && <>
          <TextInput accessibilityLabel={`Search batch ${index + 1} recipes`} placeholder="Search curated recipes" placeholderTextColor={palette.muted} value={searches[index]} onChangeText={v => setSearches(prev => prev.map((s, i) => i === index ? v : s))} style={[styles.search, text, { backgroundColor: palette.well }]} />
          <Text style={muted}>{matches.length} matches · showing first 20</Text>
          {matches.slice(0, 20).map(r => <Pressable key={r.id} accessibilityRole="button" style={button} onPress={() => { setRecipeIds(prev => prev.map((id, i) => i === index ? r.id : id)); setOwned({}); setRemaining({}); setChoosing(null) }}><Text style={text}>{r.name} · {r.group}</Text></Pressable>)}
        </>}
        <Text style={muted}>{recipe?.requirements}</Text>
        <Text style={muted}>{recipe?.description}</Text>
        {recipe?.notes ? <Text style={muted}>{recipe.notes}</Text> : null}
        <Text style={muted}>One batch: {recipe?.inputs.map(i => `${i.qty} × ${name(i.id)}`).join(' + ')} → {recipe?.outputs.map(i => `${i.qty} × ${name(i.id)}`).join(' + ')}</Text>
        <NumberField label={`Batch ${index + 1} goal`} value={goals[index]} onChange={v => setGoals(prev => prev.map((g, i) => i === index ? v : g))} />
      </View>
    })}
    <View style={card}>
      <NumberField label="Cash budget" value={budgetText} onChange={setBudgetText} />
      <Text style={muted}>Shared additional cash available now. Fees are included; output proceeds cannot fund upfront purchases.</Text>
      <Text style={[styles.heading, text]}>Shared owned stock & allowances</Text>
      {inputIds.map(id => <View key={id} style={styles.ingredient}>
        <Text style={text}>{name(id)} · ID {id}</Text>
        <NumberField label="Owned units" value={owned[id] ?? '0'} onChange={v => setOwned(prev => ({ ...prev, [id]: v }))} />
        <NumberField label="Remaining units" value={remaining[id] ?? ''} onChange={v => setRemaining(prev => ({ ...prev, [id]: v }))} />
        <Text style={muted}>Full mapping limit: {fullLimit(id) === undefined ? 'Unknown · unverified full cap' : gpFull(fullLimit(id)!)}. Informational cap, not current remaining. Blank remaining = unknown; 0 = none.</Text>
      </View>)}
      <Text style={muted}>Owned stock is shared once per item ID and does not consume remaining allowance. Declare this purchase window manually. Account for prior purchases and connected limit groups yourself: independent ID bounds may overstate a shared group. Journal, slots, offers and uncollected fills are not imported.</Text>
    </View>
    {errors.map(error => <Text key={error} style={text}>{error}</Text>)}
    {plan && <>
      <View style={card}>
        <Text style={[styles.heading, text]}>Upfront cash & separate allowance status</Text>
        <Text style={{ color: palette.brand }}>Budget status: {plan.budgetFit === 'fits' ? 'Fits at these quotes' : plan.budgetFit === 'exceeds' ? 'Exceeds budget' : 'Unknown — missing input quotes'}</Text>
        <Text style={text}>Upfront cash needed: {money(plan.cashNeeded)}</Text>
        <Text style={muted}>Processing fees: {money(plan.fees)}</Text>
        {plan.cashNeeded !== null && budget !== null && plan.cashNeeded > budget && <Text style={text}>Budget shortfall: {money(plan.cashNeeded - budget)}</Text>}
        <Text style={{ color: palette.brand }}>Allowance status: {plan.allowanceStatus === 'feasible' ? 'Fits declared allowances' : plan.allowanceStatus === 'blocked' ? 'Blocked by declared allowances' : 'Unknown remaining allowances'}</Text>
        <Text style={muted}>These are separate checks; neither guarantees executable purchases or fills.</Text>
      </View>
      <View style={card}>
        <Text style={[styles.heading, text]}>Combined shopping & shared stock</Text>
        {plan.ingredients.map(i => <View style={styles.ingredient} key={i.id}>
          <Text style={text}>{name(i.id)} · ID {i.id}</Text>
          <Text style={text}>Need {gpFull(i.required)} · buy {gpFull(i.shopping)} · owned used {gpFull(i.ownedConsumed)} · surplus {gpFull(i.surplus)}</Text>
          <Text style={text}>Remaining: {i.remaining === null ? 'Unknown' : gpFull(i.remaining)} · shortfall: {i.knownShortfall === null ? 'Unknown' : gpFull(i.knownShortfall)}</Text>
          <Text style={muted}>{i.status === 'enough' ? 'Covered by owned stock and declared allowance' : i.status === 'exceeds' ? 'Shopping exceeds declared remaining' : 'Shopping allowance unknown'}</Text>
          <Text style={muted}>Observed high: {money(i.price)} · shopping cash: {money(i.cashCost)}</Text>
        </View>)}
      </View>
      <View style={card}>
        <Text style={[styles.heading, text]}>Outputs & replacement economics</Text>
        {plan.outputs.map((o, i) => <View key={i} style={styles.ingredient}>
          <Text style={text}>Batch {o.selectionIndex + 1}: {gpFull(o.quantity)} × {name(o.id)}</Text>
          <Text style={muted}>Observed low: {money(o.price)} · tax: {money(o.outputTax)} · net: {money(o.netProceeds)}</Text>
        </View>)}
        <Text style={text}>Recipe coin revenue: {money(plan.coinRevenue)}</Text>
        <Text style={text}>Net output proceeds including coins: {money(plan.netProceeds)}</Text>
        <Text style={muted}>Total GE output tax: {money(plan.outputTax)}</Text>
        <Text style={text}>Replacement inputs + fees: {money(plan.replacementCost)}</Text>
        <Text style={muted}>Owned inputs at replacement value: {money(plan.ownedReplacementCost)}</Text>
        <Text style={{ color: plan.projectedMargin !== null && plan.projectedMargin >= 0 ? palette.brand : palette.muted, fontWeight: '600' }}>Replacement margin: {money(plan.projectedMargin)}</Text>
        <Text style={muted}>Owned inputs retain replacement value. Historical cost is not tracked; this quote-based estimate is not measured profit.</Text>
      </View>
    </>}
    <Text style={muted}>Inputs buy at observed high; outputs sell at observed low with exact per-unit GE tax. Unknown quotes stay unknown. Quotes may be stale and do not promise fills. Processing time, travel and resets are not modeled. Check recipe requirements.</Text>
    <Text style={muted}>{market.isLoading ? 'Loading quotes… ' : ''}{market.updatedAt ? `Quotes downloaded ${new Date(market.updatedAt).toLocaleTimeString()}. Cached quotes are shown between refreshes.` : 'Quotes unavailable; estimates with missing prices are unknown.'}{market.error ? ' Refresh failed; any cached quotes remain shown.' : ''}</Text>
    <Pressable accessibilityRole="button" style={button} onPress={market.refresh}><Text style={{ color: palette.brand }}>{market.isRefreshing ? 'Refreshing…' : 'Refresh quotes'}</Text></Pressable>
    <Text style={muted}>Refresh preserves goals, budget and declarations. Scenario stays on this screen only.</Text>
  </ScrollView>
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
