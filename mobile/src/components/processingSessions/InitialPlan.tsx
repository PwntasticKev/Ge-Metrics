import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { readInitialPlan } from '../../lib/processingPlan'
import { useTheme } from '../../theme/ThemeProvider'
import type { RecorderSession } from './model'
import { initialPlanMessage } from './planLifecycle'
const number = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 20 })
const time = (n: number | null) => n === null ? 'unavailable' : new Date(n).toLocaleString()
export function InitialPlan({ session, now }: { session: RecorderSession; now: number }) {
  const { palette: p } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const read = readInitialPlan(session.initialPlan, session.recipe, now)
  if (read.status !== 'valid') return <Text style={{ color: p.muted }}>{initialPlanMessage(read)}</Text>
  const plan = read.plan
  const s = plan.sizing
  const legs = [...session.recipe.inputs, ...session.recipe.outputs]
  return <View style={{ gap: 12, padding: 14, borderRadius: 12, backgroundColor: p.card }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ paddingVertical: 12 }}><Text style={{ color: p.brand }}>{expanded ? 'Hide' : 'Show'} initial quote plan</Text></Pressable>
    {expanded && <>
      <Text style={{ color: p.ink }}>Captured {time(plan.capturedAtMs)} · committed revision {session.revision ?? 0}. Read-only quote hypothesis; no actual quantities, costs or elapsed time were confirmed by capture.</Text>
      {plan.quotes.map((q, index) => <View key={index} style={{ gap: 6 }}>
        <Text style={{ color: p.ink }}>{index < session.recipe.inputs.length ? 'Input' : 'Output'}: {legs[index].name} · {q.qtyPerAction} / action · {q.mode} · {q.source} · {number(q.unitPriceGp)} GP / item</Text>
        <Text style={{ color: p.muted }}>{q.mode === 'instant' ? `Trade observation: ${time(q.quoteTradeAtMs)}${q.quoteTradeAtMs === null ? '' : ` · ${number((plan.capturedAtMs - q.quoteTradeAtMs) / 1000)} seconds old at capture`}` : `24h average; exact period timestamp unavailable (start/end unknown). Side volume: ${q.averageSideVolume}. No individual trade timestamp.`}</Text>
        <Text style={{ color: p.muted }}>Local cache updated: {time(q.sourceDataUpdatedAtMs)}. This is download/cache provenance, not a trade time or guaranteed freshness.</Text>
        {index >= session.recipe.inputs.length && <Text style={{ color: p.muted }}>Saved output tax: {number(plan.outputTaxes[index - session.recipe.inputs.length].taxPerUnitGp)} GP / unit · {plan.outputTaxes[index - session.recipe.inputs.length].exempt ? 'exempt' : 'not exempt'}.</Text>}
      </View>)}
      <Text style={{ color: p.ink }}>Selected sizing: {number(s.cashBudgetGp)} GP cash · {number(s.activeMinutes)} active minutes · {s.actions === null ? 'unsized (no action count)' : `${number(s.actions)} actions`}.</Text>
      <Text style={{ color: p.muted }}>Selected rate: {s.rate === null ? 'unavailable' : `${number(s.rate.actionsPerHour)} actions/hour · ${s.rate.source}`}.</Text>
      {s.rate?.recordedEvidence && <Text style={{ color: p.muted }}>Recorded evidence computed {time(s.rate.recordedEvidence.computedAtMs)} · past {s.rate.recordedEvidence.lookbackDays} days · {s.rate.recordedEvidence.sampleCount} samples · {number(s.rate.recordedEvidence.totalActions)} actions · {number(s.rate.recordedEvidence.totalActiveMs / 60000)} active minutes.</Text>}
      <Text style={{ color: p.muted }}>Mapping buy-limit context: {s.mappingLimitActions === null ? 'unknown' : `${number(s.mappingLimitActions)} actions`} · {s.hasUnknownInputLimit ? 'some input limits unknown' : 'input mapping limits known'}. This is not remaining personal allowance or attainable capacity.</Text>
      <Text style={{ color: p.ink }}>Modeled per action: cost {number(plan.amounts.cost)} GP · gross revenue {number(plan.amounts.revenue)} GP · tax {number(plan.amounts.tax)} GP.</Text>
      <Text style={{ color: plan.amounts.profit >= 0 ? p.brand : p.muted }}>Modeled profit: {number(plan.amounts.profit)} GP / action{s.actions === null ? '' : ` · ${number(plan.amounts.profit * s.actions)} GP for selected batch`}.</Text>
      {s.actions !== null && <Text style={{ color: p.ink }}>Selected batch: cost {number(plan.amounts.cost * s.actions)} GP · gross revenue {number(plan.amounts.revenue * s.actions)} GP · tax {number(plan.amounts.tax * s.actions)} GP.</Text>}
      <Text style={{ color: p.muted }}>Recipe coin fee: {number(session.recipe.coinCostPerAction)} GP / action; direct coin revenue: {number(session.recipe.coinRevenuePerAction)} GP / action. Tax assumption: {plan.taxAssumption}.</Text>
      <Text style={{ color: p.muted }}>Travel, tools, access and other expenses excluded. GE waits are extra and were not captured. No reinvestment or buy-limit resets. Quotes and historical pace are estimates, not fills or profit forecasts. Same-quantity comparison eligibility is shown separately.</Text>
    </>}
  </View>
}
