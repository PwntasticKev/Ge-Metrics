import { trpc } from '../utils/trpc.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useFavorites (itemType) {
  const { user } = useAuth()
  const utils = trpc.useContext()
  const { data: favoriteItems, isLoading: isLoadingFavorites, error } = trpc.favorites.getAll.useQuery({ itemType }, {
    initialData: [],
    retry: false,
    enabled: !!user,
    onError: (error) => {
      console.error('useFavorites error:', error)
    }
  })

  const addFavorite = trpc.favorites.add.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate()
    }
  })

  const removeFavorite = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate()
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
