import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useTrashScoring } from './useTrashScoring'
import { trpc } from '../utils/trpc.jsx'

// Mock useAuth
vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, email: 'test@test.com' }
  }))
}))

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn()
  }
}))

// Mock the entire TRPC module
vi.mock('../utils/trpc.jsx', () => {
  const invalidateFn = vi.fn()
  const mockUtils = {
    trash: {
      invalidate: invalidateFn
    }
  }
  
  return {
    trpc: {
      trash: {
        getAllTrashData: {
          useQuery: vi.fn(() => ({
            data: {
              itemStats: {},
              userVotes: [],
              userTrashItems: [],
              totalUsers: 100,
              adminCleaned: new Set()
            },
            isLoading: false
          }))
        },
        markItem: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: true }),
            isLoading: false
          }))
        },
        unmarkItem: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: true }),
            isLoading: false
          }))
        }
      },
      useContext: vi.fn(() => mockUtils),
      useUtils: vi.fn(() => mockUtils)
    }
  }
})

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
      itemStats: {},
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10,
      adminCleaned: new Set()
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
      itemStats: {
        1: { trashCount: 5, totalUsers: 10 }
      },
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10,
      adminCleaned: new Set()
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
      itemStats: {},
      userVotes: [1, 2, 3],
      userTrashItems: [],
      totalUsers: 10,
      adminCleaned: new Set()
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
    const mockMutate = vi.fn().mockResolvedValue({ success: true })
    const mockInvalidate = vi.fn()
    
    // Mock the mutation with onSuccess callback that gets called
    trpc.trash.markItem.useMutation.mockImplementation((options) => ({
      mutateAsync: async (...args) => {
        const result = await mockMutate(...args)
        if (options.onSuccess) {
          options.onSuccess(result)
        }
        return result
      },
      isLoading: false
    }))
    
    trpc.trash.unmarkItem.useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    })

    trpc.useContext.mockReturnValue({
      trash: {
        invalidate: mockInvalidate
      }
    })

    const mockData = {
      itemStats: {},
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10,
      adminCleaned: new Set()
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
      itemStats: {},
      userVotes: [],
      userTrashItems: [],
      totalUsers: 10,
      adminCleaned: new Set()
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
    const mockUnmark = vi.fn().mockResolvedValue({ success: true })
    const mockInvalidate = vi.fn()
    
    trpc.trash.markItem.useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    })
    
    // Mock the unmark mutation with onSuccess callback
    trpc.trash.unmarkItem.useMutation.mockImplementation((options) => ({
      mutateAsync: async (...args) => {
        const result = await mockUnmark(...args)
        if (options.onSuccess) {
          options.onSuccess(result)
        }
        return result
      },
      isLoading: false
    }))

    trpc.useContext.mockReturnValue({
      trash: {
        invalidate: mockInvalidate
      }
    })

    const mockData = {
      itemStats: {},
      userVotes: [123], // Item is already marked
      userTrashItems: [],
      totalUsers: 10,
      adminCleaned: new Set()
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