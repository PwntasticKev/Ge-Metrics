import { useRef, useEffect, useCallback, useState } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  resistance?: number
  disabled?: boolean
  refreshIndicatorHeight?: number
}

interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
  canRefresh: boolean
}

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement>,
  options: PullToRefreshOptions
): PullToRefreshState {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 150,
    resistance = 2.5,
    disabled = false,
    refreshIndicatorHeight = 50
  } = options

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false
  })

  const startY = useRef(0)
  const currentY = useRef(0)
  const isDragging = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return

    const container = containerRef.current
    if (!container) return

    // Only start pull if at top of scroll
    if (container.scrollTop > 0) return

    startY.current = e.touches[0].pageY
    isDragging.current = true
  }, [disabled, state.isRefreshing, containerRef])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || disabled || state.isRefreshing) return

    const container = containerRef.current
    if (!container) return

    currentY.current = e.touches[0].pageY
    const diff = currentY.current - startY.current

    // Only pull down
    if (diff < 0) return

    // Apply resistance
    const pullDistance = Math.min(diff / resistance, maxPull)
    const canRefresh = pullDistance > threshold

    // Prevent default scrolling when pulling
    if (pullDistance > 0) {
      e.preventDefault()
      e.stopPropagation()
    }

    setState(prev => ({
      ...prev,
      isPulling: true,
      pullDistance,
      canRefresh
    }))

    // Apply transform to container
    if (container) {
      container.style.transform = `translateY(${pullDistance}px)`
      container.style.transition = 'none'
    }

    // Haptic feedback at threshold
    if (pullDistance > threshold && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }, [disabled, state.isRefreshing, containerRef, resistance, maxPull, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return

    isDragging.current = false
    const container = containerRef.current

    if (state.canRefresh && !state.isRefreshing) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: refreshIndicatorHeight
      }))

      if (container) {
        container.style.transform = `translateY(${refreshIndicatorHeight}px)`
        container.style.transition = 'transform 0.2s ease'
      }

      try {
        await onRefresh()
      } finally {
        // Reset after refresh
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false
        })

        if (container) {
          container.style.transform = 'translateY(0)'
          container.style.transition = 'transform 0.3s ease'
        }
      }
    } else {
      // Cancel pull
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false
      })

      if (container) {
        container.style.transform = 'translateY(0)'
        container.style.transition = 'transform 0.3s ease'
      }
    }
  }, [state.canRefresh, state.isRefreshing, containerRef, refreshIndicatorHeight, onRefresh])

  // Mouse support for desktop testing
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (disabled || state.isRefreshing) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    startY.current = e.pageY
    isDragging.current = true
  }, [disabled, state.isRefreshing, containerRef])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || disabled || state.isRefreshing) return

    const container = containerRef.current
    if (!container) return

    currentY.current = e.pageY
    const diff = currentY.current - startY.current

    if (diff < 0) return

    const pullDistance = Math.min(diff / resistance, maxPull)
    const canRefresh = pullDistance > threshold

    if (pullDistance > 0) {
      e.preventDefault()
    }

    setState(prev => ({
      ...prev,
      isPulling: true,
      pullDistance,
      canRefresh
    }))

    if (container) {
      container.style.transform = `translateY(${pullDistance}px)`
      container.style.transition = 'none'
    }
  }, [disabled, state.isRefreshing, containerRef, resistance, maxPull, threshold])

  const handleMouseUp = useCallback(() => {
    handleTouchEnd()
  }, [handleTouchEnd])

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    // Mouse events for desktop testing
    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)

      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    containerRef,
    disabled,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  ])

  return state
}

export default usePullToRefresh