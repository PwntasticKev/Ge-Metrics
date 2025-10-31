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
    const isFavorite = favoriteItems?.some(fav => fav.itemId === itemId && fav.itemType === itemType)
    if (isFavorite) {
      removeFavorite.mutate({ itemId, itemType })
    } else {
      addFavorite.mutate({ itemId, itemType })
    }
  }

  return {
    favoriteItems: favoriteItems || [],
    toggleFavorite,
    isLoadingFavorites
  }
}
