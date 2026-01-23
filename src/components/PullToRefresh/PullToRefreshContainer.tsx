import React, { useRef } from 'react'
import { Box, Loader, Text, Transition } from '@mantine/core'
import { IconRefresh, IconCheck } from '@tabler/icons-react'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import './PullToRefresh.css'

interface PullToRefreshContainerProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  disabled?: boolean
  threshold?: number
  refreshText?: string
  pullingText?: string
  releaseText?: string
}

export const PullToRefreshContainer: React.FC<PullToRefreshContainerProps> = ({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  refreshText = 'Refreshing...',
  pullingText = 'Pull to refresh',
  releaseText = 'Release to refresh'
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { isPulling, pullDistance, isRefreshing, canRefresh } = usePullToRefresh(
    containerRef,
    {
      onRefresh,
      threshold,
      disabled
    }
  )

  const getIndicatorContent = () => {
    if (isRefreshing) {
      return (
        <>
          <Loader size="sm" />
          <Text size="sm" ml="xs">{refreshText}</Text>
        </>
      )
    }

    if (canRefresh) {
      return (
        <>
          <IconRefresh 
            size={20} 
            style={{ 
              transform: `rotate(${180}deg)`,
              transition: 'transform 0.3s ease'
            }} 
          />
          <Text size="sm" ml="xs">{releaseText}</Text>
        </>
      )
    }

    if (isPulling) {
      const rotation = Math.min((pullDistance / threshold) * 180, 180)
      return (
        <>
          <IconRefresh 
            size={20} 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: 'none'
            }} 
          />
          <Text size="sm" ml="xs">{pullingText}</Text>
        </>
      )
    }

    return null
  }

  return (
    <Box className="pull-to-refresh-wrapper">
      {/* Pull indicator */}
      <Transition
        mounted={isPulling || isRefreshing}
        transition="fade"
        duration={200}
      >
        {(styles) => (
          <Box
            className="pull-to-refresh-indicator"
            style={{
              ...styles,
              height: `${Math.min(pullDistance, 100)}px`,
              opacity: Math.min(pullDistance / threshold, 1)
            }}
          >
            <Box className="pull-indicator-content">
              {getIndicatorContent()}
            </Box>
          </Box>
        )}
      </Transition>

      {/* Main content */}
      <Box
        ref={containerRef}
        className="pull-to-refresh-container"
        style={{
          willChange: isPulling ? 'transform' : 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default PullToRefreshContainer