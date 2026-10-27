import { useScrollToTop } from 'expo-router'
import { useRef, type ReactNode } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import type { FlipListScreen } from '../FlipListScreen'
import { EmptyState, ErrorState, LoadingState, Notice } from '../ListStates'
import { minutesAgo } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'

type Props<T> = Parameters<typeof FlipListScreen<T>>[0] & { capitalPanel?: ReactNode }

/** Keep the cash panel scrollable with Plan rows, including on small/landscape screens. */
export function CapitalPlanList<T> ({ header, capitalPanel, market, data, keyOf, renderRow, extraData, empty, footer }: Props<T>) {
  const { palette } = useTheme()
  const listRef = useRef<FlatList<T>>(null)
  useScrollToTop(listRef)
  const available = Boolean(market.market) && !market.isLoading
  const state = market.isLoading ? <LoadingState /> : !market.market
    ? <ErrorState message={market.error?.message ?? 'Could not load prices'} onRetry={market.refresh} />
    : <EmptyState {...empty} />
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {header}
      {market.error && market.market ? <Notice text={`Couldn't refresh. Showing prices from ${minutesAgo(market.updatedAt)}.`} /> : null}
      <FlatList
        ref={listRef}
        data={available ? data : []}
        keyExtractor={keyOf}
        renderItem={({ item }) => renderRow(item)}
        extraData={extraData}
        initialNumToRender={14}
        windowSize={9}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View>{capitalPanel}</View>}
        ListEmptyComponent={state}
        ListFooterComponent={footer ? <View>{footer}</View> : undefined}
        refreshControl={<RefreshControl refreshing={market.isRefreshing} onRefresh={market.refresh} tintColor={palette.brand} />}
      />
    </View>
  )
}
