import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useTrashScoring } from './useTrashScoring'
import { trpc } from '../utils/trpc'

// Mock the TRPC client
vi.mock('../utils/trpc', () => ({
  trpc: {
    trash: {
      getAllTrashData: {
        useQuery: vi.fn()
      },
      markItem: {
        useMutation: vi.fn()
      },
      unmarkItem: {
        useMutation: vi.fn()
      }
    },
    useUtils: vi.fn(() => ({
      trash: {
        getAllTrashData: {
          invalidate: vi.fn()
        }
      }
    }))
  }
}))

describe('useTrashScoring', () => {
  let queryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('should fetch trash data on mount', () => {
    const mockData = {
      trashItems: [],
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10
    }

    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    expect(result.current.totalUsers).toBe(10)
    expect(result.current.userTrashItems).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle loading state', () => {
    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.totalUsers).toBe(0)
  })

  it('should handle error state', () => {
    const mockError = new Error('Failed to fetch trash data')
    
    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    expect(result.current.error).toBe(mockError)
    expect(result.current.isLoading).toBe(false)
  })

  it('should calculate trash percentage correctly', () => {
    const mockData = {
      trashItems: [
        { itemId: 1, trashCount: 5 }
      ],
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10
    }

    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    const percentage = result.current.getTrashPercentage(1)
    expect(percentage).toBe(50) // 5 out of 10 users = 50%
  })

  it('should check if item is trash for user', () => {
    const mockData = {
      trashItems: [],
      userVotes: [1, 2, 3],
      userTrashItems: [],
      totalUsers: 10
    }

    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    expect(result.current.isUserTrashVoted(1)).toBe(true)
    expect(result.current.isUserTrashVoted(4)).toBe(false)
  })

  it('should toggle trash vote successfully', async () => {
    const mockMutate = vi.fn()
    const mockInvalidate = vi.fn()
    
    trpc.trash.markItem.useMutation.mockReturnValue({
      mutateAsync: mockMutate
    })
    
    trpc.trash.unmarkItem.useMutation.mockReturnValue({
      mutateAsync: vi.fn()
    })

    trpc.useUtils.mockReturnValue({
      trash: {
        getAllTrashData: {
          invalidate: mockInvalidate
        }
      }
    })

    const mockData = {
      trashItems: [],
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10
    }

    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    await act(async () => {
      await result.current.toggleTrashVote(123, 'Test Item')
    })

    expect(mockMutate).toHaveBeenCalledWith({
      itemId: 123,
      itemName: 'Test Item'
    })
    expect(mockInvalidate).toHaveBeenCalled()
  })

  it('should handle trash vote toggle error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockError = new Error('Failed to mark item')
    
    trpc.trash.markItem.useMutation.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(mockError)
    })

    const mockData = {
      trashItems: [],
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10
    }

    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    await act(async () => {
      await result.current.toggleTrashVote(123, 'Test Item')
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to toggle trash vote:',
      mockError
    )

    consoleErrorSpy.mockRestore()
  })

  it('should unmark item if already marked as trash', async () => {
    const mockUnmark = vi.fn()
    const mockInvalidate = vi.fn()
    
    trpc.trash.markItem.useMutation.mockReturnValue({
      mutateAsync: vi.fn()
    })
    
    trpc.trash.unmarkItem.useMutation.mockReturnValue({
      mutateAsync: mockUnmark
    })

    trpc.useUtils.mockReturnValue({
      trash: {
        getAllTrashData: {
          invalidate: mockInvalidate
        }
      }
    })

    const mockData = {
      trashItems: [],
      userVotes: [123], // Item is already marked
      userTrashItems: [],
      totalUsers: 10
    }

    trpc.trash.getAllTrashData.useQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })

    const { result } = renderHook(() => useTrashScoring(), { wrapper })

    await act(async () => {
      await result.current.toggleTrashVote(123, 'Test Item')
    })

    expect(mockUnmark).toHaveBeenCalledWith({
      itemId: 123
    })
    expect(mockInvalidate).toHaveBeenCalled()
  })
})