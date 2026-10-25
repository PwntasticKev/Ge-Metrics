import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { ProcessFlip } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { EmptyState } from '../../components/ListStates'
import { FlipListScreen } from '../../components/FlipListScreen'
import { ProcessFlipRow } from '../../components/ProcessFlipRow'
import { ScreenHeader } from '../../components/ScreenHeader'
import { Tabs } from '../../components/Tabs'
import { METHODS, useRankedProcess, type MethodDef, type ProcessSort } from '../../lib/methods'
import { useTheme } from '../../theme/ThemeProvider'

function isMethodKey (key: unknown): key is string {
  return typeof key === 'string' && key in METHODS
}

function MethodList ({ method }: { method: MethodDef }) {
  const market = useMarket()
  const { palette } = useTheme()
  const [sortBy, setSortBy] = useState<ProcessSort>(method.defaultSort)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const { flips, total } = useRankedProcess(market.market, method, sortBy, query)
  const onToggle = useCallback((id: string) => setOpenId(prev => (prev === id ? null : id)), [])

  return (
    <FlipListScreen<ProcessFlip>
      market={market}
      header={
        <ScreenHeader inset={false} meta={market.market ? `${total} profitable now` : undefined} search={{ value: query, onChange: setQuery, placeholder: 'Search' }}>
          <Tabs options={method.sorts} value={sortBy} onChange={setSortBy} />
        </ScreenHeader>
      }
      data={flips}
      keyOf={f => f.id}
      extraData={`${openId}:${sortBy}`}
      renderRow={f => <ProcessFlipRow flip={f} sortBy={sortBy} expanded={openId === f.id} onToggle={onToggle} />}
      empty={{ title: query ? 'Nothing matches' : 'Nothing profitable right now', body: 'Prices move all day. Pull down to refresh.' }}
      footer={<Text style={[styles.note, { color: palette.muted }]}>{method.blurb}{method.requirements ? `\nRequires: ${method.requirements}` : ''}</Text>}
    />
  )
}

export default function MethodScreen () {
  const { method } = useLocalSearchParams<{ method: string }>()
  if (!isMethodKey(method)) return <EmptyState title="Unknown tool" body="Go back and pick a tool from the list." />
  return (
    <>
      <Stack.Screen options={{ title: METHODS[method].title }} />
      <MethodList method={METHODS[method]} />
    </>
  )
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
