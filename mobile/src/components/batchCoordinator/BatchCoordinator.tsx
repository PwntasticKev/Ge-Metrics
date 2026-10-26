import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { geTax, processingMethods } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { NumberField } from '../NumberField'
import { coordinateBatch } from '../../lib/batchCoordinator'
import { gpFull } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'

// Curated whole-unit recipes only: fractional guide yields are not deterministic.
const recipes = processingMethods.flatMap(m => m.recipes.map(r => ({ ...r, group: m.title, requirements: m.requirements, description: m.description, notes: 'notes' in r && typeof r.notes === 'string' ? r.notes : null })))
  .filter(r => new Set(r.inputs.map(i => i.id)).size > 1 && [...r.inputs, ...r.outputs].every(i => Number.isSafeInteger(i.qty) && i.qty > 0))
const parse = (text: string): number | null => {
  const raw = text.replace(/,/g, '').trim()
  const n = Number(raw)
  return /^\d+$/.test(raw) && Number.isSafeInteger(n) && n <= 1_000_000_000 ? n : null
}
const money = (n: number | null) => n === null ? 'Unknown' : `${gpFull(n)} gp`

export function BatchCoordinator () {
  const { palette } = useTheme()
  const market = useMarket()
  const [recipeId, setRecipeId] = useState(recipes[0]?.id)
  const [search, setSearch] = useState('')
  const [choosing, setChoosing] = useState(false)
  const [goalText, setGoalText] = useState('100')
  const [budgetText, setBudgetText] = useState('1000000')
  const [ownedText, setOwnedText] = useState<Record<number, string>>({})
  const recipe = recipes.find(r => r.id === recipeId)
  const goal = parse(goalText)
  const budget = parse(budgetText)
  const valid = Object.values(ownedText).every(v => parse(v) !== null)
  const plan = recipe && goal !== null && budget !== null && valid ? coordinateBatch(recipe, goal, budget,
    Object.fromEntries(Object.entries(ownedText).map(([id, v]) => [id, parse(v) ?? 0])),
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
          {matches.slice(0, 20).map(r => <Pressable key={r.id} style={button} accessibilityRole="button" onPress={() => { setRecipeId(r.id); setOwnedText({}); setChoosing(false) }}><Text style={text}>{r.name} · {r.group}</Text></Pressable>)}
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
        <Text style={[styles.heading, text]}>Already acquired</Text>
        {recipe && [...new Set(recipe.inputs.map(i => i.id))].map(id => <View key={id} style={styles.ingredient}>
          <Text style={text}>{name(id)}</Text>
          <NumberField label="Owned units" value={ownedText[id] ?? '0'} onChange={v => setOwnedText(prev => ({ ...prev, [id]: v }))} />
        </View>)}
        <Text style={muted}>Enter collected ingredients manually. Open offers and uncollected slot fills are not imported.</Text>
      </View>
      {!plan && <Text style={text}>Enter whole numbers from 0 to 1,000,000,000 in every field.</Text>}
      {plan && <>
        <View style={card}>
          <Text style={[styles.heading, { color: palette.brand }]}>{gpFull(plan.complete)} / {gpFull(goal ?? 0)} batches ready from inventory</Text>
          <Text style={text}>Ingredient bottleneck: {plan.bottlenecks.length ? plan.bottlenecks.map(name).join(', ') : 'Goal covered'}</Text>
          <Text style={text}>Batches affordable after shopping: {plan.affordable === null ? 'Unknown — missing prices' : gpFull(plan.affordable)}</Text>
          <Text style={text}>Cash still needed for full goal: {money(plan.cashNeeded)}</Text>
          <Text style={muted}>{plan.cashNeeded === null ? 'Missing input quotes prevent a cash estimate.' : plan.cashNeeded > (budget ?? 0) ? `Budget shortfall: ${money(plan.cashNeeded - (budget ?? 0))}` : 'Full goal fits the budget at these quotes.'}</Text>
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
      <Text style={muted}>Inputs use observed high prices; outputs use observed low prices with per-item GE tax. Quotes can be stale and do not guarantee fills. Buy limits, travel, processing time and fill times are not modeled. Check skill and membership requirements before acting.</Text>
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
