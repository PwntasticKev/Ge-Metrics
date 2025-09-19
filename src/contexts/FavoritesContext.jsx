import React, { createContext, useContext, useState, useEffect } from 'react'

const FavoritesContext = createContext()

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([])

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('potionFavorites')
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('potionFavorites', JSON.stringify(favorites))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }, [favorites])

  const addFavorite = (potionName) => {
    setFavorites(prev => {
      if (prev.includes(potionName)) {
        return prev // Already favorited
      }
      return [...prev, potionName]
    })
  }

  const removeFavorite = (potionName) => {
    setFavorites(prev => prev.filter(name => name !== potionName))
  }

  const toggleFavorite = (potionName) => {
    if (favorites.includes(potionName)) {
      removeFavorite(potionName)
    } else {
      addFavorite(potionName)
    }
  }

  const isFavorite = (potionName) => {
    return favorites.includes(potionName)
  }

  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}
