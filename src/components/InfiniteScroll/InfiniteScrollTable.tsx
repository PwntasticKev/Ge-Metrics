import React, { forwardRef, useCallback, useMemo } from 'react'
import {
  Box,
  Center,
  Loader,
  Text,
  Button,
  Stack,
  Alert,
  Skeleton,
  Group,
  ThemeIcon,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import {
  IconAlertCircle,
  IconRefresh,
  IconArrowUp,
  IconWifi,
  IconWifiOff
} from '@tabler/icons-react'
import { useInfiniteScroll, type InfiniteScrollConfig } from '../../hooks/useInfiniteScroll'
import { formatNumber } from '../../utils/formatters'

interface InfiniteScrollTableProps<T> extends Omit<InfiniteScrollConfig, 'fetchData'> {
  // Data fetching
  fetchData: InfiniteScrollConfig['fetchData']
  
  // Rendering
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode
  renderHeader?: () => React.ReactNode
  renderEmpty?: () => React.ReactNode
  renderError?: (error: Error, retry: () => void) => React.ReactNode
  renderLoadingMore?: () => React.ReactNode
  
  // Layout
  itemHeight?: number
  containerHeight?: string | number
  showStats?: boolean
  showScrollToTop?: boolean
  scrollToTopThreshold?: number
  
  // Accessibility
  ariaLabel?: string
  itemAriaLabel?: (item: T, index: number) => string
  
  // Performance
  overscan?: number // Number of items to render outside viewport
  
  // Styling
  className?: string
  itemClassName?: string
  loadingClassName?: string
  
  // Callbacks
  onItemClick?: (item: T, index: number) => void
  onSelectionChange?: (selectedItems: T[]) => void
  
  // Selection (optional)
  selectable?: boolean
  selectedItems?: T[]
  getItemKey?: (item: T) => string | number
}

interface VirtualizedItemProps<T> {
  item: T
  index: number
  height: number
  isVisible: boolean
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode
  onClick?: (item: T, index: number) => void
  ariaLabel?: string
  className?: string
}

/**
 * Virtualized item component for performance
 */
const VirtualizedItem = React.memo(<T,>({
  item,
  index,
  height,
  isVisible,
  renderItem,
  onClick,
  ariaLabel,
  className
}: VirtualizedItemProps<T>) => {
  const handleClick = useCallback(() => {
    onClick?.(item, index)
  }, [item, index, onClick])

  return (
    <Box
      style={{ 
        height,
        minHeight: height,
        cursor: onClick ? 'pointer' : undefined
      }}
      className={className}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      } : undefined}
    >
      {isVisible ? renderItem(item, index, true) : (
        <Box style={{ height, background: 'transparent' }} />
      )}
    </Box>
  )
})

VirtualizedItem.displayName = 'VirtualizedItem'

/**
 * Loading skeleton for initial load
 */
const LoadingSkeleton: React.FC<{ count?: number; height?: number }> = ({ 
  count = 30, 
  height = 60 
}) => (
  <Stack spacing="xs">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} height={height} radius="sm" />
    ))}
  </Stack>
)

/**
 * Load more indicator
 */
const LoadMoreIndicator: React.FC<{
  isLoading: boolean
  hasMore: boolean
  error: Error | null
  onRetry: () => void
  itemCount: number
  totalCount: number
}> = ({ isLoading, hasMore, error, onRetry, itemCount, totalCount }) => {
  if (error) {
    return (
      <Alert 
        color="red" 
        icon={<IconAlertCircle size={16} />}
        variant="light"
        style={{ margin: '16px' }}
      >
        <Group position="apart">
          <Text size="sm">Failed to load more items</Text>
          <Button size="xs" onClick={onRetry}>
            Retry
          </Button>
        </Group>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <Center py="md">
        <Group spacing="md">
          <Loader size="sm" />
          <Text size="sm" color="dimmed">Loading more items...</Text>
        </Group>
      </Center>
    )
  }

  if (!hasMore) {
    const percentage = totalCount > 0 ? ((itemCount / totalCount) * 100).toFixed(0) : '100'
    return (
      <Center py="md">
        <Text size="sm" color="dimmed">
          Loaded {formatNumber(itemCount)} of {formatNumber(totalCount)} items ({percentage}%)
        </Text>
      </Center>
    )
  }

  return (
    <Center py="md">
      <Text size="sm" color="dimmed">
        Scroll down to load more items
      </Text>
    </Center>
  )
}

/**
 * Stats header showing current data status
 */
const StatsHeader: React.FC<{
  itemCount: number
  totalCount: number
  isLoading: boolean
  searchQuery?: string
  hasError: boolean
}> = ({ itemCount, totalCount, isLoading, searchQuery, hasError }) => (
  <Group position="apart" p="sm" style={{ 
    borderBottom: '1px solid var(--mantine-color-gray-3)',
    background: 'var(--mantine-color-gray-0)'
  }}>
    <Group spacing="xs">
      <ThemeIcon 
        size="sm" 
        color={hasError ? 'red' : isLoading ? 'blue' : 'green'} 
        variant="light"
      >
        {hasError ? <IconWifiOff size={14} /> : <IconWifi size={14} />}
      </ThemeIcon>
      <Text size="sm" weight={500}>
        {searchQuery ? `Search: "${searchQuery}"` : 'All Items'}
      </Text>
    </Group>
    
    <Text size="sm" color="dimmed">
      Showing {formatNumber(itemCount)} of {formatNumber(totalCount)} items
    </Text>
  </Group>
)

/**
 * Scroll to top button
 */
const ScrollToTopButton: React.FC<{
  visible: boolean
  onClick: () => void
}> = ({ visible, onClick }) => {
  if (!visible) return null

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000
      }}
    >
      <Tooltip label="Scroll to top">
        <ActionIcon
          size="lg"
          radius="xl"
          variant="filled"
          onClick={onClick}
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
        >
          <IconArrowUp size={18} />
        </ActionIcon>
      </Tooltip>
    </Box>
  )
}

/**
 * Infinite scroll table component with virtualization support
 */
export function InfiniteScrollTable<T>({
  fetchData,
  renderItem,
  renderHeader,
  renderEmpty,
  renderError,
  renderLoadingMore,
  itemHeight = 60,
  containerHeight = '100%',
  showStats = true,
  showScrollToTop = true,
  scrollToTopThreshold = 500,
  enableVirtualization = false,
  overscan = 5,
  ariaLabel = 'Items table',
  itemAriaLabel,
  className,
  itemClassName,
  loadingClassName,
  onItemClick,
  getItemKey,
  ...scrollConfig
}: InfiniteScrollTableProps<T>) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = React.useState(false)

  // Initialize infinite scroll
  const {
    items,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    retry,
    triggerRef,
    scrollToTop,
    getVisibleRange
  } = useInfiniteScroll<T>({
    fetchData,
    enableVirtualization,
    virtualItemHeight: itemHeight,
    ...scrollConfig
  })

  // Handle scroll for "scroll to top" button
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return
    
    const { scrollTop } = scrollContainerRef.current
    setShowScrollButton(scrollTop > scrollToTopThreshold)
  }, [scrollToTopThreshold])

  // Attach scroll listener
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Get visible items for virtualization
  const visibleItems = useMemo(() => {
    if (!enableVirtualization) {
      return items.map((item, index) => ({ item, index, isVisible: true }))
    }

    const range = getVisibleRange()
    if (!range) {
      return items.map((item, index) => ({ item, index, isVisible: true }))
    }

    const start = Math.max(0, range.start - overscan)
    const end = Math.min(items.length - 1, range.end + overscan)

    return items.slice(start, end + 1).map((item, idx) => ({
      item,
      index: start + idx,
      isVisible: idx >= overscan && idx <= (end - start - overscan)
    }))
  }, [items, enableVirtualization, getVisibleRange, overscan])

  // Render error state
  if (error && items.length === 0) {
    if (renderError) {
      return <>{renderError(error, retry)}</>
    }

    return (
      <Alert 
        color="red" 
        icon={<IconAlertCircle size={16} />}
        variant="light"
        className={className}
        style={{ margin: '20px' }}
      >
        <Stack spacing="md">
          <Text>Failed to load items: {error.message}</Text>
          <Group>
            <Button size="sm" leftIcon={<IconRefresh size={14} />} onClick={retry}>
              Retry
            </Button>
            <Button size="sm" variant="light" onClick={refresh}>
              Refresh
            </Button>
          </Group>
        </Stack>
      </Alert>
    )
  }

  // Render initial loading state
  if (isLoading && items.length === 0) {
    return (
      <Box className={`${className} ${loadingClassName}`}>
        {showStats && (
          <StatsHeader
            itemCount={0}
            totalCount={0}
            isLoading={true}
            searchQuery={scrollConfig.searchQuery}
            hasError={false}
          />
        )}
        <LoadingSkeleton count={scrollConfig.initialLoadSize} height={itemHeight} />
      </Box>
    )
  }

  // Render empty state
  if (items.length === 0) {
    if (renderEmpty) {
      return <>{renderEmpty()}</>
    }

    return (
      <Center style={{ minHeight: 200 }}>
        <Stack align="center" spacing="md">
          <Text size="lg" color="dimmed">No items found</Text>
          {scrollConfig.searchQuery && (
            <Text size="sm" color="dimmed">
              Try adjusting your search criteria
            </Text>
          )}
          <Button variant="light" onClick={refresh}>
            Refresh
          </Button>
        </Stack>
      </Center>
    )
  }

  return (
    <Box className={className} style={{ position: 'relative', height: containerHeight }}>
      {/* Header */}
      {showStats && (
        <StatsHeader
          itemCount={items.length}
          totalCount={totalCount}
          isLoading={isLoading}
          searchQuery={scrollConfig.searchQuery}
          hasError={!!error}
        />
      )}

      {renderHeader?.()}

      {/* Scrollable content */}
      <Box
        ref={scrollContainerRef}
        role="table"
        aria-label={ariaLabel}
        style={{
          height: typeof containerHeight === 'string' 
            ? `calc(${containerHeight} - ${showStats ? '60px' : '0px'})` 
            : containerHeight,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Virtualized items */}
        {visibleItems.map(({ item, index, isVisible }) => {
          const key = getItemKey ? getItemKey(item) : index
          const label = itemAriaLabel ? itemAriaLabel(item, index) : `Item ${index + 1}`
          
          return (
            <VirtualizedItem
              key={key}
              item={item}
              index={index}
              height={itemHeight}
              isVisible={isVisible}
              renderItem={renderItem}
              onClick={onItemClick}
              ariaLabel={label}
              className={itemClassName}
            />
          )
        })}

        {/* Load more trigger */}
        <div ref={triggerRef.current} style={{ height: 1 }} />

        {/* Load more indicator */}
        {renderLoadingMore ? renderLoadingMore() : (
          <LoadMoreIndicator
            isLoading={isLoadingMore}
            hasMore={hasMore}
            error={error}
            onRetry={retry}
            itemCount={items.length}
            totalCount={totalCount}
          />
        )}
      </Box>

      {/* Scroll to top button */}
      {showScrollToTop && (
        <ScrollToTopButton
          visible={showScrollButton}
          onClick={() => {
            scrollToTop()
            setShowScrollButton(false)
          }}
        />
      )}
    </Box>
  )
}

export default InfiniteScrollTable