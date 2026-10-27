import { useEffect, useState } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import type { Market } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { PROCESSING_METHODS } from '../../lib/methods'
import { useTheme } from '../../theme/ThemeProvider'
import { pendingSessions, processingSessionRepository } from '../../components/processingSessions/repository'
import { asRecorder, newSession, type RecorderSession } from '../../components/processingSessions/model'
import { snapshotRecipe } from '../../components/processingSessions/recipe'
import { SessionRecorder } from '../../components/processingSessions/SessionRecorder'

function Message({ text }: { text: string }) {
  const { palette: p } = useTheme()
  return <View style={{ flex: 1, backgroundColor: p.bg, padding: 20 }}><Text style={{ color: p.ink }}>{text}</Text></View>
}
function SavedSession({ id }: { id: string }) {
  const [session, setSession] = useState<RecorderSession | null>(null)
  const [committed, setCommitted] = useState<RecorderSession | undefined>(undefined)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    processingSessionRepository.load().then(result => {
      if (!live) return
      if (!result.ok) { setError(`Cannot load session: ${result.error.message}`); return }
      const found = result.sessions.find(s => s.id === id)
      if (!found) { setError('This session is unavailable. Saved records have not been changed.'); return }
      const saved = asRecorder(found)
      setCommitted(saved)
      const pending = pendingSessions.get(id)
      setSession(pending ? { ...pending, elapsedTimeConfirmed: pending.status === 'processing' ? false : pending.elapsedTimeConfirmed } : saved)
    })
    return () => { live = false }
  }, [id])
  return session ? <SessionRecorder initial={session} committed={committed} /> : <Message text={error || 'Loading saved session…'} />
}
function NewSession({ market, method, recipeid }: { market: Market; method?: string; recipeid?: string }) {
  const [result] = useState(() => {
    try {
      const selectedMethod = PROCESSING_METHODS.find(m => m.key === method)
      const recipe = selectedMethod?.recipes(market).find(r => r.id === recipeid)
      if (!selectedMethod || !recipe) throw new Error('Choose a curated recipe from an expanded Processing Lab row.')
      return { session: newSession(snapshotRecipe(recipe, selectedMethod.key, market)), error: '' }
    } catch (e) { return { session: null, error: e instanceof Error ? e.message : String(e) } }
  })
  return result.session ? <SessionRecorder initial={result.session} /> : <Message text={result.error} />
}
export default function ProcessingSessionScreen() {
  const { sessionid, recipeid, method } = useLocalSearchParams<{ sessionid?: string; recipeid?: string; method?: string }>()
  const market = useMarket()
  return <><Stack.Screen options={{ title: 'Actual processing session' }} />{sessionid ? <SavedSession key={sessionid} id={sessionid} /> : market.market ? <NewSession key={`${method}:${recipeid}`} market={market.market} method={method} recipeid={recipeid} /> : <Message text={market.error ? 'Recipe data unavailable. Return to the lab and refresh.' : 'Loading recipe metadata…'} />}</>
}
