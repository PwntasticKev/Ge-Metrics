import { trpc } from '../utils/trpc'

export const useFavorites = (itemType, options = {}) => {
  return trpc.favorites.getAll.useQuery({ itemType }, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    ...options // Spread additional options like { enabled: isAuthenticated }
  })
}

export const useAddFavorite = () => {
  const queryClient = trpc.useContext()
  return trpc.favorites.add.useMutation({
    onSuccess: () => {
      queryClient.favorites.getAll.invalidate()
    }
  })
}

export const useRemoveFavorite = () => {
  const queryClient = trpc.useContext()
  return trpc.favorites.remove.useMutation({
    onSuccess: () => {
      queryClient.favorites.getAll.invalidate()
    }
  })
}
