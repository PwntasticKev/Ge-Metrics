import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useFavorites as useFavoritesQuery, useAddFavorite, useRemoveFavorite } from '../services/favoritesApi'
import { notifications } from '@mantine/notifications'

const FavoritesContext = createContext()

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

export const FavoritesProvider = ({ children, itemType }) => {
  const { user, isAuthenticated } = useAuth()
  const [localFavorites, setLocalFavorites] = useState(() => {
    try {
      const storedFavorites = localStorage.getItem(`${itemType}Favorites`)
      return storedFavorites ? JSON.parse(storedFavorites) : []
    } catch (error) {
      console.error('Failed to parse favorites from localStorage', error)
      return []
    }
  })

  const { data: dbFavorites, isLoading, isError } = useFavoritesQuery(
    itemType,
    { enabled: isAuthenticated }
  )

  const addFavoriteMutation = useAddFavorite()
  const removeFavoriteMutation = useRemoveFavorite()

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(`${itemType}Favorites`, JSON.stringify(localFavorites))
    }
  }, [localFavorites, isAuthenticated, itemType])

  const favorites = isAuthenticated ? (dbFavorites || []).map(fav => fav.itemId) : localFavorites

  const isFavorite = (itemId) => favorites.includes(itemId)

  const handleToggleFavorite = (itemId, itemType) => {
    if (!isAuthenticated) {
      const isFav = localFavorites.includes(itemId)
      const newLocalFavorites = isFav
        ? localFavorites.filter(id => id !== itemId)
        : [...localFavorites, itemId]
      setLocalFavorites(newLocalFavorites)
      return
    }

    const isFav = isFavorite(itemId)
    const mutation = isFav ? removeFavoriteMutation : addFavoriteMutation

    mutation.mutate({ itemId, itemType }, {
      onSuccess: () => {
        notifications.show({
          title: 'Success',
          message: `Favorite ${isFav ? 'removed' : 'added'} successfully.`,
          color: 'green'
        })
      },
      onError: (error) => {
        notifications.show({
          title: 'Error',
          message: error.message || `Failed to ${isFav ? 'remove' : 'add'} favorite.`,
          color: 'red'
        })
      }
    })
  }

  const value = {
    favorites,
    isFavorite,
    toggleFavorite: handleToggleFavorite,
    isLoading,
    isError,
    isToggling: addFavoriteMutation.isLoading || removeFavoriteMutation.isLoading
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
