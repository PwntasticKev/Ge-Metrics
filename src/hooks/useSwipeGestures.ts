import { useRef, useEffect, useCallback } from 'react'

export interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
}

export interface SwipeConfig {
  threshold?: number           // Minimum distance for swipe (default: 50px)
  velocity?: number            // Minimum velocity for swipe (default: 0.3)
  longPressDelay?: number      // Delay for long press (default: 500ms)
  doubleTapDelay?: number      // Max delay between taps (default: 300ms)
  preventDefaultTouchmove?: boolean
  disableOnScroll?: boolean
  enableMouse?: boolean        // Enable mouse events for desktop testing
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
  isMoving: boolean
  isSwiping: boolean
}

export function useSwipeGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    velocity = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
    preventDefaultTouchmove = true,
    disableOnScroll = false,
    enableMouse = false
  } = config

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isMoving: false,
    isSwiping: false
  })

  const lastTap = useRef<number>(0)
  const longPressTimer = useRef<NodeJS.Timeout>()
  const isScrolling = useRef(false)

  // Detect scroll to disable swipes when scrolling
  useEffect(() => {
    if (!disableOnScroll) return

    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      isScrolling.current = true
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isScrolling.current = false
      }, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [disableOnScroll])

  // Calculate swipe direction and velocity
  const calculateSwipe = useCallback(() => {
    const state = touchState.current
    const deltaX = state.currentX - state.startX
    const deltaY = state.currentY - state.startY
    const deltaTime = Date.now() - state.startTime
    const velocityX = Math.abs(deltaX / deltaTime)
    const velocityY = Math.abs(deltaY / deltaTime)

    // Check if movement meets threshold and velocity
    const isValidSwipe = (
      (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) &&
      (velocityX > velocity || velocityY > velocity)
    )

    if (!isValidSwipe) return null

    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }, [threshold, velocity])

  // Handle touch/mouse start
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (isScrolling.current && disableOnScroll) return

    const state = touchState.current
    state.startX = clientX
    state.startY = clientY
    state.currentX = clientX
    state.currentY = clientY
    state.startTime = Date.now()
    state.isMoving = false
    state.isSwiping = false

    // Start long press timer
    if (handlers.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        if (!state.isMoving) {
          handlers.onLongPress?.()
        }
      }, longPressDelay)
    }
  }, [handlers, longPressDelay, disableOnScroll])

  // Handle touch/mouse move
  const handleMove = useCallback((clientX: number, clientY: number, event: TouchEvent | MouseEvent) => {
    const state = touchState.current
    
    if (!state.startTime) return

    state.currentX = clientX
    state.currentY = clientY

    // Check if movement threshold exceeded
    const deltaX = Math.abs(state.currentX - state.startX)
    const deltaY = Math.abs(state.currentY - state.startY)

    if (deltaX > 10 || deltaY > 10) {
      state.isMoving = true
      state.isSwiping = true
      
      // Cancel long press
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }

      // Prevent default scrolling if configured
      if (preventDefaultTouchmove) {
        event.preventDefault()
      }
    }
  }, [preventDefaultTouchmove])

  // Handle touch/mouse end
  const handleEnd = useCallback(() => {
    const state = touchState.current
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    if (!state.startTime) return

    const now = Date.now()
    const timeSinceStart = now - state.startTime

    // Check for swipe
    if (state.isSwiping) {
      const direction = calculateSwipe()
      
      if (direction) {
        switch (direction) {
          case 'left':
            handlers.onSwipeLeft?.()
            break
          case 'right':
            handlers.onSwipeRight?.()
            break
          case 'up':
            handlers.onSwipeUp?.()
            break
          case 'down':
            handlers.onSwipeDown?.()
            break
        }
      }
    } else if (timeSinceStart < 200 && !state.isMoving) {
      // Check for tap or double tap
      const timeSinceLastTap = now - lastTap.current

      if (timeSinceLastTap < doubleTapDelay && handlers.onDoubleTap) {
        handlers.onDoubleTap()
        lastTap.current = 0
      } else {
        handlers.onTap?.()
        lastTap.current = now
      }
    }

    // Reset state
    state.startX = 0
    state.startY = 0
    state.startTime = 0
    state.currentX = 0
    state.currentY = 0
    state.isMoving = false
    state.isSwiping = false
  }, [calculateSwipe, handlers, doubleTapDelay])

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY, e)
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enableMouse) return
    handleStart(e.clientX, e.clientY)
  }, [handleStart, enableMouse])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enableMouse || !touchState.current.startTime) return
    handleMove(e.clientX, e.clientY, e)
  }, [handleMove, enableMouse])

  const handleMouseUp = useCallback(() => {
    if (!enableMouse) return
    handleEnd()
  }, [handleEnd, enableMouse])

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefaultTouchmove })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmove })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    // Mouse events (optional)
    if (enableMouse) {
      element.addEventListener('mousedown', handleMouseDown)
      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseup', handleMouseUp)
      element.addEventListener('mouseleave', handleMouseUp)
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)

      if (enableMouse) {
        element.removeEventListener('mousedown', handleMouseDown)
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseup', handleMouseUp)
        element.removeEventListener('mouseleave', handleMouseUp)
      }

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [
    elementRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    enableMouse,
    preventDefaultTouchmove
  ])

  // Return control functions
  return {
    reset: () => {
      touchState.current = {
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        currentY: 0,
        isMoving: false,
        isSwiping: false
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }
}

export default useSwipeGestures