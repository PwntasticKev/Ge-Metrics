import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../hooks/useAuth'
import { getPotionFavorites, togglePotionFavorite } from '../services/favoritesApi'
import { notifications } from '@mantine/notifications'

const FavoritesContext = createContext()

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

export const FavoritesProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [localFavorites, setLocalFavorites] = useState(() => {
    // Fallback to localStorage for unauthenticated users
    try {
      const localFavorites = localStorage.getItem('potionFavorites')
      return localFavorites ? JSON.parse(localFavorites) : []
    } catch (error) {
      console.error('Failed to parse favorites from localStorage', error)
      return []
    }
  })

  // Check if user is a mock/public user
  const isMockUser = user?.id === 'public-user-id' || user?.id?.startsWith('mock-') || user?.id?.startsWith('public-')

  // Fetch favorites from database if authenticated and not a mock user
  const { data: dbFavorites = [], isLoading } = useQuery(
    ['potionFavorites', user?.id],
    () => getPotionFavorites(user.id.toString()),
    {
      enabled: isAuthenticated && !!user?.id && !isMockUser,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        console.error('Failed to fetch favorites from database:', error)
        // Don't show error notification for mock users
        if (!isMockUser) {
          notifications.show({
            title: 'Error',
            message: 'Failed to load your favorites. Using local storage as fallback.',
            color: 'red'
          })
        }
      }
    }
  )

  // Toggle favorite mutation (only for real users, not mock users)
  const toggleMutation = useMutation(
    ({ potionName }) => togglePotionFavorite(user.id.toString(), potionName),
    {
      enabled: !isMockUser, // Disable for mock users
      onSuccess: (isFavorited, { potionName }) => {
        // Update the cache immediately
        queryClient.setQueryData(['potionFavorites', user?.id], (old = []) => {
          if (isFavorited) {
            return [...old, potionName]
          } else {
            return old.filter(name => name !== potionName)
          }
        })
      },
      onError: (error, { potionName }) => {
        console.error('Failed to toggle favorite:', error)
        // Don't show error for mock users (expected to fail)
        if (!isMockUser) {
          notifications.show({
            title: 'Error',
            message: `Failed to ${isFavorite(potionName) ? 'remove' : 'add'} favorite. Please try again.`,
            color: 'red'
          })
        }
      }
    }
  )

  // Use database favorites if authenticated and not mock user, otherwise use localStorage
  const favorites = isAuthenticated && user?.id && !isMockUser ? dbFavorites : localFavorites

  // Update localStorage for unauthenticated users or mock users
  useEffect(() => {
    if (!isAuthenticated || isMockUser) {
      try {
        localStorage.setItem('potionFavorites', JSON.stringify(localFavorites))
      } catch (error) {
        console.error('Failed to save favorites to localStorage', error)
      }
    }
  }, [localFavorites, isAuthenticated, isMockUser])

  const addFavorite = (potionName) => {
    if (isAuthenticated && user?.id && !isMockUser) {
      // Use database for real authenticated users
      if (!isFavorite(potionName)) {
        toggleMutation.mutate({ potionName })
      }
    } else {
      // Use localStorage for unauthenticated users or mock users
      setLocalFavorites(prev => {
        if (prev.includes(potionName)) {
          return prev // Already favorited
        }
        return [...prev, potionName]
      })
    }
  }

  const removeFavorite = (potionName) => {
    if (isAuthenticated && user?.id) {
      // Use database for authenticated users
      if (isFavorite(potionName)) {
        toggleMutation.mutate({ potionName })
      }
    } else {
      // Use localStorage for unauthenticated users
      setLocalFavorites(prev => prev.filter(name => name !== potionName))
    }
  }

  const toggleFavorite = (potionName) => {
    if (isAuthenticated && user?.id) {
      // Use database for authenticated users
      toggleMutation.mutate({ potionName })
    } else {
      // Use localStorage for unauthenticated users
      setLocalFavorites((prevFavorites) => {
        if (prevFavorites.includes(potionName)) {
          return prevFavorites.filter((name) => name !== potionName)
        } else {
          return [...prevFavorites, potionName]
        }
      })
    }
  }

  const isFavorite = (potionName) => favorites.includes(potionName)

  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    isLoading: isAuthenticated ? isLoading : false,
    isToggling: toggleMutation.isLoading
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
