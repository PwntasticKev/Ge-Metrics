import { useMemo } from 'react'
import { trpc } from '../utils/trpc.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { notifications } from '@mantine/notifications'

/**
 * Hook for managing method trash scoring system
 * Provides functions to mark methods as trash, get trash weights, and manage user's trash list
 */
export function useMethodTrashScoring() {
  const { user } = useAuth()
  const utils = trpc.useContext()
  
  // Get all method trash data (votes, total users, user's votes)
  const { data: trashData, isLoading, error } = trpc.methodTrash.getAllMethodTrashData.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false
  })

  // Mutations for voting
  const markAsTrash = trpc.methodTrash.markMethod.useMutation({
    onSuccess: () => {
      utils.methodTrash.invalidate()
    }
  })

  const unmarkAsTrash = trpc.methodTrash.unmarkMethod.useMutation({
    onSuccess: () => {
      utils.methodTrash.invalidate()
    }
  })

  // Calculate trash weight penalty based on percentage of users who marked as trash
  const getTrashWeight = useMemo(() => {
    return (methodId) => {
      if (!trashData?.methodStats[methodId]) return 1.0

      const { trashCount, totalUsers } = trashData.methodStats[methodId]
      const percentage = totalUsers > 0 ? (trashCount / totalUsers) * 100 : 0

      if (percentage === 0) return 1.0

      // Much more aggressive exponential penalty - heavily bury suspected trash
      // 10% marked = 0.1x weight (90% reduction)
      // 20% marked = 0.01x weight (99% reduction) 
      // 30% marked = 0.001x weight (99.9% reduction)
      // 40%+ marked = essentially hidden (0.0001x weight)
      return Math.max(0.0001, Math.pow(0.1, percentage / 10))
    }
  }, [trashData])

  // Get trash percentage for a method
  const getTrashPercentage = useMemo(() => {
    return (methodId) => {
      if (!trashData?.methodStats[methodId]) return 0
      
      const { trashCount, totalUsers } = trashData.methodStats[methodId]
      return totalUsers > 0 ? (trashCount / totalUsers) * 100 : 0
    }
  }, [trashData])

  // Get trash vote count for a method
  const getTrashCount = useMemo(() => {
    return (methodId) => {
      return trashData?.methodStats[methodId]?.trashCount || 0
    }
  }, [trashData])

  // Check if user has voted this method as trash
  const hasUserVoted = useMemo(() => {
    return (methodId) => {
      if (!trashData?.userVotes) return false
      
      // userVotes comes as an array from TRPC (Set gets serialized to array)
      const votesArray = Array.isArray(trashData.userVotes) 
        ? trashData.userVotes
        : Array.from(trashData.userVotes || [])
      
      return votesArray.includes(methodId)
    }
  }, [trashData])

  // Check if method is considered trash (>25% voted)
  const isTrash = useMemo(() => {
    return (methodId) => {
      return getTrashPercentage(methodId) > 25
    }
  }, [getTrashPercentage])

  // Get user's complete trash list
  const userTrashMethods = trashData?.userTrashMethods || []

  // Toggle trash vote for a method
  const toggleTrashVote = async (methodId, methodName) => {
    if (!user) {
      console.warn('User must be logged in to vote')
      notifications.show({
        title: 'Login Required',
        message: 'You must be logged in to vote on methods',
        color: 'yellow'
      })
      return
    }

    try {
      if (hasUserVoted(methodId)) {
        await unmarkAsTrash.mutateAsync({ methodId })
        notifications.show({
          title: 'Vote Removed',
          message: `Removed trash vote for ${methodName}`,
          color: 'blue'
        })
      } else {
        const result = await markAsTrash.mutateAsync({ methodId, methodName })
        
        if (result?.wasAdminCleaned) {
          notifications.show({
            title: 'Vote Recorded with Note',
            message: result.message,
            color: 'orange',
            autoClose: 6000
          })
        } else {
          notifications.show({
            title: 'Vote Recorded',
            message: `Marked ${methodName} as unreliable`,
            color: 'red'
          })
        }
      }
    } catch (error) {
      console.error('Failed to toggle trash vote:', error)
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to toggle trash vote',
        color: 'red'
      })
    }
  }

  return {
    // Data
    trashData,
    userTrashMethods,
    isLoading,
    totalUsers: trashData?.totalUsers || 0,
    error,
    
    // Calculations
    getTrashWeight,
    getTrashPercentage,
    getTrashCount,
    hasUserVoted,
    isTrash,
    isUserTrashVoted: hasUserVoted, // Alias for backwards compatibility
    
    // Actions
    toggleTrashVote,
    markAsTrash,
    unmarkAsTrash,
    
    // Loading states
    isMarkingTrash: markAsTrash.isLoading,
    isUnmarkingTrash: unmarkAsTrash.isLoading
  }
}