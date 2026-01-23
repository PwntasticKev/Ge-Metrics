import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useIntersection } from '@mantine/hooks'

interface InfiniteScrollConfig {
  // Data fetching
  fetchData: (params: FetchParams) => Promise<FetchResult<any>>
  
  // Pagination settings
  initialLoadSize?: number      // Initial items to load (default: 30)
  loadMoreSize?: number        // Items per batch after initial (default: 20)
  triggerOffset?: number       // Pixels from bottom to trigger load (default: 200)
  
  // Search and filtering
  searchQuery?: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  
  // Performance
  enableVirtualization?: boolean  // Use virtual scrolling for large datasets
  virtualItemHeight?: number     // Height of each item for virtualization
  maxItemsInMemory?: number      // Max items to keep in memory (default: 1000)
  
  // Caching
  cacheKey?: string             // Unique key for caching results
  cacheDuration?: number        // Cache duration in ms (default: 5 minutes)
  
  // Error handling
  maxRetries?: number           // Max retry attempts (default: 3)
  retryDelay?: number           // Delay between retries in ms (default: 1000)
  
  // Callbacks
  onError?: (error: Error) => void
  onLoadingChange?: (loading: boolean) => void
  onDataChange?: (data: any[], totalCount: number) => void
}

interface FetchParams {
  offset: number
  limit: number
  search?: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface FetchResult<T> {
  data: T[]
  totalCount: number
  hasMore: boolean
}

interface InfiniteScrollState<T> {
  items: T[]
  totalCount: number
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  error: Error | null
  retryCount: number
  isRefreshing: boolean
}

interface InfiniteScrollReturn<T> extends InfiniteScrollState<T> {
  loadMore: () => void
  refresh: () => void
  retry: () => void
  reset: () => void
  triggerRef: React.RefObject<HTMLDivElement>
  scrollToTop: () => void
  scrollToItem: (index: number) => void
  getVisibleRange: () => { start: number; end: number } | null
}

// Cache implementation
class ScrollCache {
  private cache = new Map<string, { data: any; timestamp: number; totalCount: number }>()
  
  set(key: string, data: any, totalCount: number, duration: number) {
    this.cache.set(key, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now(),
      totalCount
    })
    
    // Auto-cleanup after duration
    setTimeout(() => {
      this.cache.delete(key)
    }, duration)
  }
  
  get(key: string, maxAge: number): { data: any; totalCount: number } | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return {
      data: [...cached.data], // Clone to prevent mutations
      totalCount: cached.totalCount
    }
  }
  
  clear(keyPrefix?: string) {
    if (keyPrefix) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(keyPrefix)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}

const cache = new ScrollCache()

/**
 * Advanced infinite scroll hook with virtual scrolling, caching, and error handling
 */
export function useInfiniteScroll<T = any>(config: InfiniteScrollConfig): InfiniteScrollReturn<T> {
  const {
    fetchData,
    initialLoadSize = 30,
    loadMoreSize = 20,
    triggerOffset = 200,
    searchQuery = '',
    filters = {},
    sortBy,
    sortOrder = 'desc',
    enableVirtualization = false,
    virtualItemHeight = 60,
    maxItemsInMemory = 1000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onLoadingChange,
    onDataChange
  } = config

  // State management
  const [state, setState] = useState<InfiniteScrollState<T>>({
    items: [],
    totalCount: 0,
    hasMore: true,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    retryCount: 0,
    isRefreshing: false
  })

  // Refs for DOM manipulation and performance
  const triggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Intersection observer for load trigger
  const { ref: intersectionRef, entry } = useIntersection({
    threshold: 0.1
  })

  // Combine refs for trigger element
  const combinedTriggerRef = useCallback((node: HTMLDivElement) => {
    triggerRef.current = node
    intersectionRef(node)
  }, [intersectionRef])

  // Generate cache key based on current params
  const currentCacheKey = useMemo(() => {
    if (!cacheKey) return null
    return `${cacheKey}:${searchQuery}:${JSON.stringify(filters)}:${sortBy}:${sortOrder}`
  }, [cacheKey, searchQuery, filters, sortBy, sortOrder])

  // Debounced search params to prevent excessive requests
  const debouncedParams = useMemo(() => ({
    search: searchQuery,
    filters,
    sortBy,
    sortOrder
  }), [searchQuery, filters, sortBy, sortOrder])

  /**
   * Load data with caching and error handling
   */
  const loadData = useCallback(async (
    offset: number, 
    limit: number, 
    isRefresh = false
  ): Promise<FetchResult<T> | null> => {
    // Prevent concurrent requests
    if (loadingRef.current && !isRefresh) return null
    
    try {
      loadingRef.current = true
      
      // Check cache for initial load
      if (offset === 0 && currentCacheKey && !isRefresh) {
        const cached = cache.get(currentCacheKey, cacheDuration)
        if (cached && cached.data.length >= limit) {
          return {
            data: cached.data.slice(0, limit),
            totalCount: cached.totalCount,
            hasMore: cached.data.length < cached.totalCount
          }
        }
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // Fetch new data
      const result = await fetchData({
        offset,
        limit,
        search: debouncedParams.search,
        filters: debouncedParams.filters,
        sortBy: debouncedParams.sortBy,
        sortOrder: debouncedParams.sortOrder
      })

      // Cache the result if it's a fresh load
      if (offset === 0 && currentCacheKey) {
        cache.set(currentCacheKey, result.data, result.totalCount, cacheDuration)
      }

      return result

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null // Request was cancelled
      }
      throw error
    } finally {
      loadingRef.current = false
    }
  }, [fetchData, debouncedParams, currentCacheKey, cacheDuration])

  /**
   * Load initial data
   */
  const loadInitialData = useCallback(async (isRefresh = false) => {
    if (state.isLoading && !isRefresh) return

    setState(prev => ({
      ...prev,
      isLoading: true,
      isRefreshing: isRefresh,
      error: null,
      retryCount: 0
    }))

    onLoadingChange?.(true)

    try {
      const result = await loadData(0, initialLoadSize, isRefresh)
      if (!result) return

      setState(prev => ({
        ...prev,
        items: result.data,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        isLoading: false,
        isRefreshing: false,
        error: null
      }))

      onDataChange?.(result.data, result.totalCount)

    } catch (error) {
      const err = error as Error
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: err
      }))
      onError?.(err)
    }

    onLoadingChange?.(false)
  }, [state.isLoading, loadData, initialLoadSize, onLoadingChange, onDataChange, onError])

  /**
   * Load more data (pagination)
   */
  const loadMoreData = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore || state.isLoading || state.error) {
      return
    }

    setState(prev => ({
      ...prev,
      isLoadingMore: true,
      error: null
    }))

    try {
      const result = await loadData(state.items.length, loadMoreSize)
      if (!result) return

      setState(prev => {
        // Implement memory management
        let newItems = [...prev.items, ...result.data]
        
        if (maxItemsInMemory && newItems.length > maxItemsInMemory) {
          // Remove oldest items when exceeding memory limit
          const itemsToRemove = newItems.length - maxItemsInMemory
          newItems = newItems.slice(itemsToRemove)
          console.warn(`Infinite scroll: Removed ${itemsToRemove} items to manage memory`)
        }

        return {
          ...prev,
          items: newItems,
          hasMore: result.hasMore,
          isLoadingMore: false
        }
      })

    } catch (error) {
      const err = error as Error
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
        error: err
      }))
      onError?.(err)
    }
  }, [state.isLoadingMore, state.hasMore, state.isLoading, state.error, state.items.length, loadData, loadMoreSize, maxItemsInMemory, onError])

  /**
   * Retry failed request
   */
  const retry = useCallback(async () => {
    if (state.retryCount >= maxRetries) return

    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }))

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, state.retryCount)
    await new Promise(resolve => setTimeout(resolve, delay))

    if (state.items.length === 0) {
      await loadInitialData()
    } else {
      await loadMoreData()
    }
  }, [state.retryCount, state.items.length, maxRetries, retryDelay, loadInitialData, loadMoreData])

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    // Clear cache for this query
    if (currentCacheKey) {
      cache.clear(currentCacheKey.split(':')[0])
    }
    await loadInitialData(true)
  }, [currentCacheKey, loadInitialData])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState({
      items: [],
      totalCount: 0,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      retryCount: 0,
      isRefreshing: false
    })
  }, [])

  /**
   * Scroll utilities
   */
  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const scrollToItem = useCallback((index: number) => {
    if (!enableVirtualization || !containerRef.current) return
    
    const scrollTop = index * virtualItemHeight
    containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
  }, [enableVirtualization, virtualItemHeight])

  const getVisibleRange = useCallback((): { start: number; end: number } | null => {
    if (!enableVirtualization || !containerRef.current) return null
    
    const container = containerRef.current
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    
    const start = Math.floor(scrollTop / virtualItemHeight)
    const end = Math.min(
      state.items.length - 1,
      Math.ceil((scrollTop + containerHeight) / virtualItemHeight)
    )
    
    return { start, end }
  }, [enableVirtualization, virtualItemHeight, state.items.length])

  // Load initial data when params change
  useEffect(() => {
    loadInitialData()
  }, [debouncedParams.search, debouncedParams.filters, debouncedParams.sortBy, debouncedParams.sortOrder])

  // Trigger load more when intersection observed
  useEffect(() => {
    if (entry?.isIntersecting && state.hasMore && !state.isLoading && !state.isLoadingMore) {
      loadMoreData()
    }
  }, [entry?.isIntersecting, state.hasMore, state.isLoading, state.isLoadingMore, loadMoreData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    loadMore: loadMoreData,
    refresh,
    retry,
    reset,
    triggerRef: { current: null } as React.RefObject<HTMLDivElement>,
    scrollToTop,
    scrollToItem,
    getVisibleRange
  }
}

/**
 * Higher-order component for infinite scroll
 */
export interface InfiniteScrollComponentProps<T> {
  items: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: Error | null
  onRetry: () => void
  triggerRef: React.RefObject<HTMLDivElement>
}

export function withInfiniteScroll<T, P extends object>(
  WrappedComponent: React.ComponentType<P & InfiniteScrollComponentProps<T>>,
  scrollConfig: Omit<InfiniteScrollConfig, 'fetchData'>
) {
  return function WithInfiniteScrollComponent(
    props: P & { fetchData: InfiniteScrollConfig['fetchData'] }
  ) {
    const { fetchData, ...restProps } = props
    const scrollState = useInfiniteScroll<T>({ ...scrollConfig, fetchData })
    
    return React.createElement(WrappedComponent, {
      ...(restProps as P),
      items: scrollState.items,
      isLoading: scrollState.isLoading,
      isLoadingMore: scrollState.isLoadingMore,
      hasMore: scrollState.hasMore,
      error: scrollState.error,
      onRetry: scrollState.retry,
      triggerRef: scrollState.triggerRef
    })
  }
}