import { useScrollToTop } from 'expo-router'
import { useRef, type ReactElement, type ReactNode } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import type { MarketState } from '../api/useMarket'
import { minutesAgo } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'
import { EmptyState, ErrorState, LoadingState, Notice } from './ListStates'

interface Props<T> {
  header: ReactNode
  market: MarketState
  data: T[]
  keyOf: (item: T) => string
  renderRow: (item: T) => ReactElement
  extraData: unknown
  empty: { title: string; body: string }
  footer?: ReactNode
}

// Shared shell for the Sets and Items lists: fixed header, pull to refresh,
// and the loading / error / empty states. Tapping the active tab scrolls the
// list back to the top (iOS convention); the native tabs can't find this list
// themselves because the header sits above it.
export function FlipListScreen<T> ({ header, market, data, keyOf, renderRow, extraData, empty, footer }: Props<T>) {
  const { palette } = useTheme()
  const listRef = useRef<FlatList<T>>(null)
  useScrollToTop(listRef)
  const refreshFailed = market.error && market.market

  let body: ReactNode
  if (market.isLoading) body = <LoadingState />
  else if (!market.market) body = <ErrorState message={market.error?.message ?? 'Could not load prices'} onRetry={market.refresh} />
  else {
    body = (
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={keyOf}
        renderItem={({ item }) => renderRow(item)}
        extraData={extraData}
        initialNumToRender={14}
        windowSize={9}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState {...empty} />}
        ListFooterComponent={footer ? <View>{footer}</View> : undefined}
        refreshControl={<RefreshControl refreshing={market.isRefreshing} onRefresh={market.refresh} tintColor={palette.brand} />}
      />
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {header}
      {refreshFailed ? <Notice text={`Couldn't refresh. Showing prices from ${minutesAgo(market.updatedAt)}.`} /> : null}
      {body}
    </View>
  )
}
