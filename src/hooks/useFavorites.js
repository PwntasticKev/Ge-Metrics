import { trpc } from '../utils/trpc.jsx'

export function useFavorites () {
  const utils = trpc.useContext()
  const { data: favoriteItems, isLoading: isLoadingFavorites } = trpc.favorites.getAll.useQuery(undefined, {
    initialData: []
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
