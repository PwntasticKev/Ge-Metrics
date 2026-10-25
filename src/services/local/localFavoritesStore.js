// Device-local replacement for the server's `favorites.*` procedures.
// Stores `{ itemId, itemType, createdAt }` records in localStorage.

const STORAGE_KEY = 'geMetrics.favorites.v1'

function isValidFavorite (fav) {
  return fav !== null &&
    typeof fav === 'object' &&
    Number.isInteger(fav.itemId) &&
    typeof fav.itemType === 'string' &&
    fav.itemType.length > 0
}

function validateInput (input) {
  const itemId = Number(input?.itemId)
  const itemType = input?.itemType
  if (!Number.isInteger(itemId) || typeof itemType !== 'string' || itemType.length === 0) {
    throw new Error('Invalid favorite: itemId (integer) and itemType (string) are required')
  }
  return { itemId, itemType }
}

export function createLocalFavoritesStore ({ storage = globalThis.localStorage, now = () => new Date() } = {}) {
  const read = () => {
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter(isValidFavorite) : []
    } catch (error) {
      console.error('[localFavoritesStore] Corrupt favorites data, resetting', error)
      return []
    }
  }

  const write = (favorites) => {
    storage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    return favorites
  }

  const getAll = async (input) => {
    const all = read()
    return input?.itemType ? all.filter(fav => fav.itemType === input.itemType) : all
  }

  const add = async (input) => {
    const { itemId, itemType } = validateInput(input)
    const all = read()
    const existing = all.find(fav => fav.itemId === itemId && fav.itemType === itemType)
    if (existing) return existing
    const favorite = { itemId, itemType, createdAt: now().toISOString() }
    write([...all, favorite])
    return favorite
  }

  const remove = async (input) => {
    const { itemId, itemType } = validateInput(input)
    write(read().filter(fav => !(fav.itemId === itemId && fav.itemType === itemType)))
    return { success: true }
  }

  return { getAll, add, remove }
}

export const localFavoritesStore = createLocalFavoritesStore()
