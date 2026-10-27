import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { compareProcessingPlan } from '../../lib/processingPlanComparison'
import { useTheme } from '../../theme/ThemeProvider'
import type { RecorderSession } from './model'
import { comparisonPresentation } from './planComparisonPresentation'

export function PlanComparison({ session, now }: { session: RecorderSession; now: number }) {
  const { palette: p } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [source, setSource] = useState<number | null>(null)
  const data = comparisonPresentation(compareProcessingPlan(session, now), session)
  return <View style={{ gap: 12, padding: 14, borderRadius: 12, backgroundColor: p.card }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ paddingVertical: 12 }}>
      <Text style={{ color: p.brand }}>{expanded ? 'Hide' : 'Compare'} saved quotes with actuals</Text>
    </Pressable>
    {expanded && (data.ok ? <>
      <Text style={{ color: p.ink }}>Same-quantity quote comparison</Text>
      <Text style={{ color: p.muted }}>{data.scope}</Text>
      <Text style={{ color: p.muted }}>Inputs use assigned historical valuation, including owned stock; these are not input fill prices. Other recorded expenses are excluded from the quote model.</Text>
      <Text style={{ color: data.baselineNegative ? p.muted : p.brand }}>Saved quote baseline at recorded quantities: {data.baseline}</Text>
      {data.rows.map((row, index) => <View key={row.label} style={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: source === index }} onPress={() => setSource(source === index ? null : index)} style={{ paddingVertical: 12 }}>
          <Text style={{ color: row.negative ? p.muted : p.brand }}>{row.label}: {row.value} · {source === index ? 'Hide' : 'Show'} sources</Text>
        </Pressable>
        {source === index && row.sources.map((text, i) => <Text selectable key={i} style={{ color: p.muted }}>{text}</Text>)}
      </View>)}
      <Text style={{ color: data.finalProfitNegative ? p.muted : p.brand }}>Equals recorded final profit: {data.finalProfit}</Text>
      <Text style={{ color: p.muted }}>Differences describe saved assumptions and recorded values; they do not establish causes or execution slippage. Tax uses saved decisions, not current rules; a tax difference does not establish a tax-rate change. No time effect, forecast, guarantee or joint-cost allocation is modeled.</Text>
    </> : <Text style={{ color: p.muted }}>{data.message} The recorded profit explanation remains independently available when its actuals are eligible.</Text>)}
  </View>
}
