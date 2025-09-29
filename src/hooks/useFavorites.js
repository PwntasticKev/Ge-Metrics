import { trpc } from '../utils/trpc.jsx'

export function useFavorites () {
  const utils = trpc.useContext()
  const { data: favoriteItemIds, isLoading: isLoadingFavorites } = trpc.favorites.getAll.useQuery()

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

  const favoriteItemsSet = new Set(favoriteItemIds || [])

  const toggleFavorite = (itemId) => {
    if (favoriteItemsSet.has(itemId)) {
      removeFavorite.mutate({ itemId })
    } else {
      addFavorite.mutate({ itemId })
    }
  }

  return {
    favoriteItemsSet,
    toggleFavorite,
    isLoadingFavorites
  }
}
