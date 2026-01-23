import { useState, useEffect, useCallback, useRef } from 'react'

interface UseBottomNavOptions {
  autoHide?: boolean
  autoHideDelay?: number
  showOnScrollUp?: boolean
  scrollThreshold?: number
  landscapeMode?: boolean
}

interface UseBottomNavReturn {
  isVisible: boolean
  isLandscape: boolean
  show: () => void
  hide: () => void
  toggle: () => void
  setAutoHide: (enabled: boolean) => void
}

export function useBottomNav(options: UseBottomNavOptions = {}): UseBottomNavReturn {
  const {
    autoHide = true,
    autoHideDelay = 3000,
    showOnScrollUp = true,
    scrollThreshold = 50,
    landscapeMode = true
  } = options

  const [isVisible, setIsVisible] = useState(true)
  const [isLandscape, setIsLandscape] = useState(false)
  const [autoHideEnabled, setAutoHideEnabled] = useState(autoHide)
  
  const lastScrollY = useRef(0)
  const scrollDirection = useRef<'up' | 'down'>('up')
  const hideTimer = useRef<NodeJS.Timeout>()
  const lastInteraction = useRef(Date.now())

  // Check if in landscape mode
  useEffect(() => {
    const checkLandscape = () => {
      const landscape = window.matchMedia('(orientation: landscape) and (max-height: 600px)').matches
      setIsLandscape(landscape)
      
      // Show navbar when switching orientation
      if (!landscape) {
        setIsVisible(true)
      }
    }

    checkLandscape()
    window.addEventListener('resize', checkLandscape)
    window.addEventListener('orientationchange', checkLandscape)

    return () => {
      window.removeEventListener('resize', checkLandscape)
      window.removeEventListener('orientationchange', checkLandscape)
    }
  }, [])

  // Handle scroll detection
  const handleScroll = useCallback(() => {
    if (!autoHideEnabled) return

    const currentScrollY = window.scrollY
    const delta = currentScrollY - lastScrollY.current

    // Determine scroll direction
    if (Math.abs(delta) > scrollThreshold) {
      scrollDirection.current = delta > 0 ? 'down' : 'up'
      
      if (showOnScrollUp) {
        if (scrollDirection.current === 'up' || currentScrollY < 10) {
          setIsVisible(true)
          lastInteraction.current = Date.now()
        } else {
          setIsVisible(false)
        }
      }
      
      lastScrollY.current = currentScrollY
    }

    // Auto-hide in landscape after delay
    if (isLandscape && landscapeMode) {
      clearTimeout(hideTimer.current)
      
      if (scrollDirection.current === 'down') {
        hideTimer.current = setTimeout(() => {
          const timeSinceInteraction = Date.now() - lastInteraction.current
          if (timeSinceInteraction > autoHideDelay) {
            setIsVisible(false)
          }
        }, autoHideDelay)
      }
    }
  }, [autoHideEnabled, showOnScrollUp, scrollThreshold, isLandscape, landscapeMode, autoHideDelay])

  // Set up scroll listener
  useEffect(() => {
    if (autoHideEnabled) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', handleScroll)
        clearTimeout(hideTimer.current)
      }
    }
  }, [handleScroll, autoHideEnabled])

  // Touch gesture support
  useEffect(() => {
    let touchStartY = 0
    let touchEndY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY
      
      // Swipe up from bottom edge to show navbar
      if (touchStartY > window.innerHeight - 100 && touchEndY < touchStartY - 50) {
        setIsVisible(true)
        lastInteraction.current = Date.now()
      }
      
      // Swipe down at bottom to hide navbar
      if (touchEndY > touchStartY + 50 && touchEndY > window.innerHeight - 100) {
        if (autoHideEnabled && isLandscape) {
          setIsVisible(false)
        }
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [autoHideEnabled, isLandscape])

  // Visibility helpers
  const show = useCallback(() => {
    setIsVisible(true)
    lastInteraction.current = Date.now()
  }, [])

  const hide = useCallback(() => {
    setIsVisible(false)
  }, [])

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev)
    lastInteraction.current = Date.now()
  }, [])

  const setAutoHide = useCallback((enabled: boolean) => {
    setAutoHideEnabled(enabled)
    if (!enabled) {
      setIsVisible(true)
      clearTimeout(hideTimer.current)
    }
  }, [])

  // Add body class for styling adjustments
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('has-bottom-nav')
    } else {
      document.body.classList.remove('has-bottom-nav')
    }
    
    if (isLandscape) {
      document.body.classList.add('landscape')
    } else {
      document.body.classList.remove('landscape')
    }

    return () => {
      document.body.classList.remove('has-bottom-nav', 'landscape')
    }
  }, [isVisible, isLandscape])

  return {
    isVisible,
    isLandscape,
    show,
    hide,
    toggle,
    setAutoHide
  }
}

export default useBottomNav