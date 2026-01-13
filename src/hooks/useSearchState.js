import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Custom hook for managing search state with URL and localStorage persistence
 * @param {string} storageKey - Optional key for localStorage (defaults to page path)
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns {Object} - { search, setSearch, debouncedSearch }
 */
export function useSearchState(storageKey = null, debounceMs = 300) {
  const location = useLocation()
  const key = storageKey || `search-${location.pathname}`
  
  // Initialize search state from URL params or localStorage
  const [search, setSearch] = useState(() => {
    // Try to get search from URL params first
    const urlParams = new URLSearchParams(window.location.search)
    const urlSearch = urlParams.get('search')
    if (urlSearch) return urlSearch
    
    // Fallback to localStorage
    const stored = localStorage.getItem(key)
    return stored || ''
  })

  // Debounced search for performance
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, debounceMs)
    
    return () => clearTimeout(timer)
  }, [search, debounceMs])

  // Persist search state to localStorage and URL
  useEffect(() => {
    // Save to localStorage
    if (search) {
      localStorage.setItem(key, search)
    } else {
      localStorage.removeItem(key)
    }
    
    // Update URL without causing navigation
    const url = new URL(window.location)
    if (search) {
      url.searchParams.set('search', search)
    } else {
      url.searchParams.delete('search')
    }
    
    // Only update if URL actually changed to avoid infinite loops
    const newSearch = url.search
    if (window.location.search !== newSearch) {
      window.history.replaceState({}, '', url)
    }
  }, [search, key])

  // Restore search from URL when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlSearch = urlParams.get('search')
    if (urlSearch && urlSearch !== search) {
      setSearch(urlSearch)
    }
  }, [location.search])

  return {
    search,
    setSearch,
    debouncedSearch
  }
}