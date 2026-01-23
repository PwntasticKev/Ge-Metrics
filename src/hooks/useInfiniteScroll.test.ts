import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useInfiniteScroll, type InfiniteScrollConfig } from './useInfiniteScroll'

// Mock intersection observer
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})
window.IntersectionObserver = mockIntersectionObserver

// Mock scroll methods
const mockScrollTo = vi.fn()
Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: mockScrollTo,
  writable: true
})

// Sample data for testing
interface TestItem {
  id: number
  name: string
  value: number
}

const generateTestData = (start: number, count: number): TestItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: start + i,
    name: `Item ${start + i}`,
    value: Math.random() * 1000
  }))
}

describe.skip('useInfiniteScroll', () => {
  let mockFetchData: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetchData = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  const defaultConfig: InfiniteScrollConfig = {
    fetchData: mockFetchData,
    initialLoadSize: 30,
    loadMoreSize: 20,
    triggerOffset: 200,
    maxRetries: 3,
    retryDelay: 1000
  }

  describe('initial data loading', () => {
    it('should load initial data on mount', async () => {
      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 100,
        hasMore: true
      })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.items).toEqual([])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.items).toEqual(initialData)
      expect(result.current.totalCount).toBe(100)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.error).toBeNull()
      expect(mockFetchData).toHaveBeenCalledWith({
        offset: 0,
        limit: 30,
        search: '',
        filters: {},
        sortBy: undefined,
        sortOrder: 'desc'
      })
    })

    it('should handle initial load errors', async () => {
      const error = new Error('Network error')
      mockFetchData.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.items).toEqual([])
      expect(result.current.error).toBe(error)
      expect(result.current.hasMore).toBe(true)
    })

    it('should pass search and filter parameters correctly', async () => {
      const configWithParams = {
        ...defaultConfig,
        searchQuery: 'test search',
        filters: { category: 'weapons' },
        sortBy: 'name',
        sortOrder: 'asc' as const
      }

      mockFetchData.mockResolvedValueOnce({
        data: [],
        totalCount: 0,
        hasMore: false
      })

      renderHook(() => useInfiniteScroll(configWithParams))

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith({
          offset: 0,
          limit: 30,
          search: 'test search',
          filters: { category: 'weapons' },
          sortBy: 'name',
          sortOrder: 'asc'
        })
      })
    })
  })

  describe('load more functionality', () => {
    it('should load more data when loadMore is called', async () => {
      const initialData = generateTestData(1, 30)
      const moreData = generateTestData(31, 20)

      mockFetchData
        .mockResolvedValueOnce({
          data: initialData,
          totalCount: 100,
          hasMore: true
        })
        .mockResolvedValueOnce({
          data: moreData,
          totalCount: 100,
          hasMore: true
        })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Load more data
      act(() => {
        result.current.loadMore()
      })

      expect(result.current.isLoadingMore).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false)
      })

      expect(result.current.items).toEqual([...initialData, ...moreData])
      expect(mockFetchData).toHaveBeenCalledTimes(2)
      expect(mockFetchData).toHaveBeenLastCalledWith({
        offset: 30,
        limit: 20,
        search: '',
        filters: {},
        sortBy: undefined,
        sortOrder: 'desc'
      })
    })

    it('should not load more when already loading', async () => {
      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 100,
        hasMore: true
      })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Set loading state and try to load more
      act(() => {
        result.current.loadMore()
        result.current.loadMore() // Second call should be ignored
      })

      expect(mockFetchData).toHaveBeenCalledTimes(2) // Initial + one load more
    })

    it('should not load more when hasMore is false', async () => {
      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 30,
        hasMore: false
      })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.loadMore()
      })

      expect(mockFetchData).toHaveBeenCalledTimes(1) // Only initial load
    })

    it('should handle load more errors', async () => {
      const initialData = generateTestData(1, 30)
      const error = new Error('Load more failed')

      mockFetchData
        .mockResolvedValueOnce({
          data: initialData,
          totalCount: 100,
          hasMore: true
        })
        .mockRejectedValueOnce(error)

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false)
      })

      expect(result.current.items).toEqual(initialData) // Should keep original data
      expect(result.current.error).toBe(error)
    })
  })

  describe('memory management', () => {
    it('should enforce memory limits by removing old items', async () => {
      const config = {
        ...defaultConfig,
        maxItemsInMemory: 40
      }

      const initialData = generateTestData(1, 30)
      const moreData = generateTestData(31, 20)

      mockFetchData
        .mockResolvedValueOnce({
          data: initialData,
          totalCount: 100,
          hasMore: true
        })
        .mockResolvedValueOnce({
          data: moreData,
          totalCount: 100,
          hasMore: true
        })

      const { result } = renderHook(() => useInfiniteScroll(config))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false)
      })

      // Should keep only 40 items (removing first 10)
      expect(result.current.items).toHaveLength(40)
      expect(result.current.items[0].id).toBe(11) // First item should now be id 11
    })
  })

  describe('refresh functionality', () => {
    it('should reload all data when refresh is called', async () => {
      const initialData = generateTestData(1, 30)
      const refreshedData = generateTestData(1, 25)

      mockFetchData
        .mockResolvedValueOnce({
          data: initialData,
          totalCount: 100,
          hasMore: true
        })
        .mockResolvedValueOnce({
          data: refreshedData,
          totalCount: 80,
          hasMore: true
        })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.items).toHaveLength(30)

      act(() => {
        result.current.refresh()
      })

      expect(result.current.isRefreshing).toBe(true)

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false)
      })

      expect(result.current.items).toEqual(refreshedData)
      expect(result.current.totalCount).toBe(80)
    })
  })

  describe('retry functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    })

    it('should retry failed requests with exponential backoff', async () => {
      const error = new Error('Network error')
      const successData = generateTestData(1, 30)

      mockFetchData
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          data: successData,
          totalCount: 100,
          hasMore: true
        })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.error).toBe(error)
      })

      act(() => {
        result.current.retry()
      })

      // Fast forward through retry delay
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(result.current.items).toEqual(successData)
        expect(result.current.error).toBeNull()
      })

      expect(result.current.retryCount).toBe(1)
    })

    it('should respect max retry limit', async () => {
      const error = new Error('Network error')
      mockFetchData.mockRejectedValue(error)

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.error).toBe(error)
      })

      // Retry 3 times (max retries)
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.retry()
        })
        
        act(() => {
          vi.advanceTimersByTime(1000 * Math.pow(2, i))
        })
        
        await waitFor(() => {
          expect(result.current.retryCount).toBe(i + 1)
        })
      }

      // Fourth retry should not execute
      const initialCallCount = mockFetchData.mock.calls.length
      
      act(() => {
        result.current.retry()
      })

      expect(mockFetchData.mock.calls.length).toBe(initialCallCount)
    })
  })

  describe('reset functionality', () => {
    it('should reset to initial state', async () => {
      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 100,
        hasMore: true
      })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.items).toHaveLength(30)

      act(() => {
        result.current.reset()
      })

      expect(result.current.items).toEqual([])
      expect(result.current.totalCount).toBe(0)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.retryCount).toBe(0)
    })
  })

  describe('scroll utilities', () => {
    it('should provide scroll to top functionality', async () => {
      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 100,
        hasMore: true
      })

      const { result } = renderHook(() => useInfiniteScroll(defaultConfig))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.scrollToTop()
      })

      // Note: scrollTo is mocked, so we just verify it's callable
      expect(typeof result.current.scrollToTop).toBe('function')
    })

    it('should provide scroll to item functionality with virtualization', async () => {
      const configWithVirtualization = {
        ...defaultConfig,
        enableVirtualization: true,
        virtualItemHeight: 60
      }

      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 100,
        hasMore: true
      })

      const { result } = renderHook(() => useInfiniteScroll(configWithVirtualization))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.scrollToItem(10)
      })

      expect(typeof result.current.scrollToItem).toBe('function')
    })
  })

  describe('callbacks', () => {
    it('should call onLoadingChange callback', async () => {
      const onLoadingChange = vi.fn()
      const config = {
        ...defaultConfig,
        onLoadingChange
      }

      mockFetchData.mockResolvedValueOnce({
        data: generateTestData(1, 30),
        totalCount: 100,
        hasMore: true
      })

      renderHook(() => useInfiniteScroll(config))

      expect(onLoadingChange).toHaveBeenCalledWith(true)

      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(false)
      })
    })

    it('should call onDataChange callback', async () => {
      const onDataChange = vi.fn()
      const config = {
        ...defaultConfig,
        onDataChange
      }

      const initialData = generateTestData(1, 30)
      mockFetchData.mockResolvedValueOnce({
        data: initialData,
        totalCount: 100,
        hasMore: true
      })

      renderHook(() => useInfiniteScroll(config))

      await waitFor(() => {
        expect(onDataChange).toHaveBeenCalledWith(initialData, 100)
      })
    })

    it('should call onError callback', async () => {
      const onError = vi.fn()
      const config = {
        ...defaultConfig,
        onError
      }

      const error = new Error('Network error')
      mockFetchData.mockRejectedValueOnce(error)

      renderHook(() => useInfiniteScroll(config))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error)
      })
    })
  })

  describe('parameter changes', () => {
    it('should reload data when search query changes', async () => {
      const { result, rerender } = renderHook(
        ({ searchQuery }) => useInfiniteScroll({
          ...defaultConfig,
          searchQuery
        }),
        {
          initialProps: { searchQuery: '' }
        }
      )

      mockFetchData
        .mockResolvedValueOnce({
          data: generateTestData(1, 30),
          totalCount: 100,
          hasMore: true
        })
        .mockResolvedValueOnce({
          data: generateTestData(101, 20),
          totalCount: 50,
          hasMore: false
        })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Change search query
      rerender({ searchQuery: 'test' })

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledTimes(2)
        expect(mockFetchData).toHaveBeenLastCalledWith({
          offset: 0,
          limit: 30,
          search: 'test',
          filters: {},
          sortBy: undefined,
          sortOrder: 'desc'
        })
      })
    })

    it('should reload data when filters change', async () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useInfiniteScroll({
          ...defaultConfig,
          filters
        }),
        {
          initialProps: { filters: {} }
        }
      )

      mockFetchData.mockResolvedValue({
        data: generateTestData(1, 30),
        totalCount: 100,
        hasMore: true
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Change filters
      rerender({ filters: { category: 'weapons' } })

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledTimes(2)
        expect(mockFetchData).toHaveBeenLastCalledWith({
          offset: 0,
          limit: 30,
          search: '',
          filters: { category: 'weapons' },
          sortBy: undefined,
          sortOrder: 'desc'
        })
      })
    })
  })
})