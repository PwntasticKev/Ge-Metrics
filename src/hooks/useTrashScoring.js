import { useMemo } from 'react'
import { trpc } from '../utils/trpc.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { notifications } from '@mantine/notifications'

/**
 * Hook for managing trash scoring system
 * Provides functions to mark items as trash, get trash weights, and manage user's trash list
 */
export function useTrashScoring() {
  const { user } = useAuth()
  const utils = trpc.useContext() // Get utils at the top level
  
  // Get all trash data (votes, total users, user's votes)
  const { data: trashData, isLoading } = trpc.trash.getAllTrashData.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false
  })

  // Mutations for voting
  const markAsTrash = trpc.trash.markItem.useMutation({
    onSuccess: () => {
      // Invalidate all queries to refresh data
      utils.trash.invalidate()
    }
  })

  const unmarkAsTrash = trpc.trash.unmarkItem.useMutation({
    onSuccess: () => {
      utils.trash.invalidate()
    }
  })

  // Calculate trash weight penalty based on percentage of users who marked as trash
  const getTrashWeight = useMemo(() => {
    return (itemId) => {
      if (!trashData?.itemStats[itemId]) return 1.0

      const { trashCount, totalUsers } = trashData.itemStats[itemId]
      const percentage = totalUsers > 0 ? (trashCount / totalUsers) * 100 : 0

      if (percentage === 0) return 1.0

      // Exponential penalty - heavily bury suspected trash
      // 20% marked = 0.3x weight (significant penalty)
      // 40% marked = 0.09x weight (heavily buried)  
      // 60% marked = 0.027x weight (essentially hidden)
      return Math.max(0.01, Math.pow(0.3, percentage / 20))
    }
  }, [trashData])

  // Get trash percentage for an item
  const getTrashPercentage = useMemo(() => {
    return (itemId) => {
      if (!trashData?.itemStats[itemId]) return 0
      
      const { trashCount, totalUsers } = trashData.itemStats[itemId]
      return totalUsers > 0 ? (trashCount / totalUsers) * 100 : 0
    }
  }, [trashData])

  // Get trash vote count for an item
  const getTrashCount = useMemo(() => {
    return (itemId) => {
      return trashData?.itemStats[itemId]?.trashCount || 0
    }
  }, [trashData])

  // Check if user has voted this item as trash
  const hasUserVoted = useMemo(() => {
    return (itemId) => {
      // userVotes comes as an array from TRPC (Sets don't serialize to JSON)
      if (!trashData?.userVotes) return false
      
      // Convert to Set if it's an array, or use directly if already a Set
      const votesSet = Array.isArray(trashData.userVotes) 
        ? new Set(trashData.userVotes)
        : trashData.userVotes
      
      return votesSet.has ? votesSet.has(itemId) : false
    }
  }, [trashData])

  // Check if item is considered trash (>25% voted)
  const isTrash = useMemo(() => {
    return (itemId) => {
      return getTrashPercentage(itemId) > 25
    }
  }, [getTrashPercentage])

  // Get user's complete trash list
  const userTrashItems = trashData?.userTrashItems || []

  // Toggle trash vote for an item
  const toggleTrashVote = async (itemId, itemName) => {
    if (!user) {
      console.warn('User must be logged in to vote')
      notifications.show({
        title: 'Login Required',
        message: 'You must be logged in to vote on items',
        color: 'yellow'
      })
      return
    }

    try {
      if (hasUserVoted(itemId)) {
        await unmarkAsTrash.mutateAsync({ itemId })
        notifications.show({
          title: 'Vote Removed',
          message: `Removed trash vote for ${itemName}`,
          color: 'blue'
        })
      } else {
        const result = await markAsTrash.mutateAsync({ itemId, itemName })
        
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
            message: `Marked ${itemName} as unreliable`,
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
    userTrashItems,
    isLoading,
    
    // Calculations
    getTrashWeight,
    getTrashPercentage,
    getTrashCount,
    hasUserVoted,
    isTrash,
    
    // Actions
    toggleTrashVote,
    markAsTrash,
    unmarkAsTrash,
    
    // Loading states
    isMarkingTrash: markAsTrash.isLoading,
    isUnmarkingTrash: unmarkAsTrash.isLoading
  }
}