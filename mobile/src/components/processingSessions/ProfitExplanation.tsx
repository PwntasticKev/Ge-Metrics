import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { gpFull } from '../../lib/format'
import { explainProcessingSession } from '../../lib/processingExplanation'
import { readInitialPlan } from '../../lib/processingPlan'
import { initialPlanMessage } from './planLifecycle'
import type { RecorderSession } from './model'

export function ProfitExplanation({ session, now }: { session: RecorderSession; now: number }) {
  const { palette: p } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [term, setTerm] = useState<number | null>(null)
  const result = explainProcessingSession(session, now)
  const plan = readInitialPlan(session.initialPlan, session.recipe, now)
  if (!result.ok) return <Text style={{ color: p.muted }}>{result.reason}</Text>
  return <View style={{ gap: 12 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ paddingVertical: 12 }}>
      <Text style={{ color: p.brand }}>{expanded ? 'Hide recorded profit explanation' : 'Explain recorded profit'}</Text>
    </Pressable>
    {expanded && <>
      <Text style={{ color: p.muted }}>{plan.status === 'valid' ? 'These are saved actual receipts and costs. Same-quantity quote comparison eligibility is shown separately.' : initialPlanMessage(plan)}</Text>
      {result.terms.map((row, index) => <View key={row.label} style={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: term === index }} onPress={() => setTerm(term === index ? null : index)} style={{ paddingVertical: 12 }}>
          <Text style={{ color: row.signedGp < 0 ? p.muted : p.brand }}>{row.label}: {row.signedGp < 0 ? '−' : '+'}{gpFull(Math.abs(row.signedGp))} GP</Text>
        </Pressable>
        {term === index && (row.sources.length ? row.sources : ['No saved source rows.']).map((source, n) => <Text selectable key={n} style={{ color: p.muted }}>{source}</Text>)}
      </View>)}
      <Text style={{ color: result.finalProfitGp < 0 ? p.muted : p.brand }}>Equals recorded final profit: {gpFull(result.finalProfitGp)} GP</Text>
    </>}
  </View>
}
