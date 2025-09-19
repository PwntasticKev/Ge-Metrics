const API_BASE_URL = 'http://localhost:4000/api'

// Get all cached potion volumes
export const getAllPotionVolumes = async () => {
  const response = await fetch(`${API_BASE_URL}/potion-volumes`)
  if (!response.ok) {
    throw new Error(`Failed to fetch potion volumes: ${response.status}`)
  }
  const data = await response.json()
  return data.data // Return just the data array
}

// Get cache status
export const getVolumesCacheStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/potion-volumes/status`)
  if (!response.ok) {
    throw new Error(`Failed to fetch cache status: ${response.status}`)
  }
  const data = await response.json()
  return data.data // Return just the status object
}

// Get volume for specific item
export const getPotionVolumeById = async (itemId) => {
  const response = await fetch(`${API_BASE_URL}/potion-volumes/item/${itemId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch potion volume for item ${itemId}: ${response.status}`)
  }
  const data = await response.json()
  return data.data // Return just the volume object
}

// Get all doses for a potion family
export const getPotionVolumesByBaseName = async (baseName) => {
  const encodedBaseName = encodeURIComponent(baseName)
  const response = await fetch(`${API_BASE_URL}/potion-volumes/potion/${encodedBaseName}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch potion volumes for ${baseName}: ${response.status}`)
  }
  const data = await response.json()
  return data.data // Return just the volumes array
}

// Manually trigger cache refresh
export const refreshPotionVolumes = async () => {
  const response = await fetch(`${API_BASE_URL}/potion-volumes/refresh`, {
    method: 'POST'
  })
  if (!response.ok) {
    throw new Error(`Failed to refresh potion volumes: ${response.status}`)
  }
  const data = await response.json()
  return data
}
