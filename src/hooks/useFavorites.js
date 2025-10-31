import { trpc } from '../utils/trpc.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useFavorites (itemType) {
  const { user } = useAuth()
  const utils = trpc.useContext()
  // Only include itemType in query input if it's defined
  const queryInput = itemType ? { itemType } : undefined
  const { data: favoriteItems, isLoading: isLoadingFavorites, error } = trpc.favorites.getAll.useQuery(queryInput, {
    initialData: [],
    retry: false,
    enabled: !!user,
    onError: (error) => {
      console.error('useFavorites error:', error)
    }
  })

  const addFavorite = trpc.favorites.add.useMutation({
    onSuccess: () => {
      // Invalidate all favorite queries - this will refresh all pages
      // Invalidate without input (for queries called without itemType)
      utils.favorites.getAll.invalidate()
      // Invalidate with undefined (explicit)
      utils.favorites.getAll.invalidate(undefined)
      // Invalidate common item types
      utils.favorites.getAll.invalidate({ itemType: 'item' })
      utils.favorites.getAll.invalidate({ itemType: 'combination' })
      utils.favorites.getAll.invalidate({ itemType: 'potion' })
      utils.favorites.getAll.invalidate({ itemType: 'sapling' })
      utils.favorites.getAll.invalidate({ itemType: 'herb' })
    }
  })

  const removeFavorite = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      // Invalidate all favorite queries - this will refresh all pages
      // Invalidate without input (for queries called without itemType)
      utils.favorites.getAll.invalidate()
      // Invalidate with undefined (explicit)
      utils.favorites.getAll.invalidate(undefined)
      // Invalidate common item types
      utils.favorites.getAll.invalidate({ itemType: 'item' })
      utils.favorites.getAll.invalidate({ itemType: 'combination' })
      utils.favorites.getAll.invalidate({ itemType: 'potion' })
      utils.favorites.getAll.invalidate({ itemType: 'sapling' })
      utils.favorites.getAll.invalidate({ itemType: 'herb' })
    }
  })

  const toggleFavorite = (itemId, itemType) => {
    if (!user) {
      console.warn('[useFavorites] Cannot toggle favorite - user not logged in')
      return
    }
    
    // Validate inputs
    if (itemId === undefined || itemId === null) {
      console.error('[useFavorites] Cannot toggle favorite: itemId is undefined or null', { itemId, itemType })
      return
    }
    
    if (!itemType) {
      console.error('[useFavorites] Cannot toggle favorite: itemType is undefined or null', { itemId, itemType })
      return
    }
    
    // Ensure itemId is a number
    const numericItemId = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId
    if (isNaN(numericItemId)) {
      console.error('[useFavorites] Cannot toggle favorite: itemId is not a valid number', { itemId, itemType, numericItemId })
      return
    }
    
    const isFavorite = favoriteItems?.some(fav => fav.itemId === numericItemId && fav.itemType === itemType)
    console.log('[useFavorites] Toggling favorite:', { itemId: numericItemId, itemType, isFavorite, currentFavorites: favoriteItems?.length })
    
    if (isFavorite) {
      removeFavorite.mutate({ itemId: numericItemId, itemType }, {
        onError: (error) => {
          console.error('[useFavorites] Failed to remove favorite:', error)
        },
        onSuccess: () => {
          console.log('[useFavorites] Successfully removed favorite')
        }
      })
    } else {
      addFavorite.mutate({ itemId: numericItemId, itemType }, {
        onError: (error) => {
          console.error('[useFavorites] Failed to add favorite:', error)
        },
        onSuccess: () => {
          console.log('[useFavorites] Successfully added favorite')
        }
      })
    }
  }

  return {
    favoriteItems: favoriteItems || [],
    toggleFavorite,
    isLoadingFavorites
  }
}
