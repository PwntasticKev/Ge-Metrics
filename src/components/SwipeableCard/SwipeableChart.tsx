import React, { useRef, useState, useEffect } from 'react'
import { Card, Title, Text, Group, Select, Box, Badge } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useSwipeGestures } from '../../hooks/useSwipeGestures'
import './SwipeableCard.css'

interface ChartData {
  id: string
  title: string
  subtitle?: string
  component: React.ReactNode
  badge?: string
  badgeColor?: string
}

interface SwipeableChartProps {
  charts: ChartData[]
  initialChart?: number
  onChartChange?: (index: number, chart: ChartData) => void
  showDots?: boolean
  showHints?: boolean
  autoRotate?: boolean
  autoRotateDelay?: number
  height?: number | string
}

export const SwipeableChart: React.FC<SwipeableChartProps> = ({
  charts,
  initialChart = 0,
  onChartChange,
  showDots = true,
  showHints = true,
  autoRotate = false,
  autoRotateDelay = 5000,
  height = 300
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(initialChart)
  const [touchOffset, setTouchOffset] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const autoRotateTimer = useRef<NodeJS.Timeout>()

  // Validate initial chart index
  useEffect(() => {
    if (initialChart >= 0 && initialChart < charts.length) {
      setCurrentIndex(initialChart)
    }
  }, [initialChart, charts.length])

  // Auto-rotate functionality
  useEffect(() => {
    if (autoRotate && charts.length > 1) {
      const startAutoRotate = () => {
        autoRotateTimer.current = setTimeout(() => {
          handleNext()
        }, autoRotateDelay)
      }

      startAutoRotate()

      return () => {
        if (autoRotateTimer.current) {
          clearTimeout(autoRotateTimer.current)
        }
      }
    }
  }, [currentIndex, autoRotate, autoRotateDelay, charts.length])

  // Stop auto-rotate on user interaction
  const stopAutoRotate = () => {
    if (autoRotateTimer.current) {
      clearTimeout(autoRotateTimer.current)
    }
  }

  // Navigate to previous chart
  const handlePrevious = () => {
    stopAutoRotate()
    setIsTransitioning(true)
    const newIndex = currentIndex > 0 ? currentIndex - 1 : charts.length - 1
    setCurrentIndex(newIndex)
    onChartChange?.(newIndex, charts[newIndex])
    
    setTimeout(() => setIsTransitioning(false), 300)
  }

  // Navigate to next chart
  const handleNext = () => {
    stopAutoRotate()
    setIsTransitioning(true)
    const newIndex = currentIndex < charts.length - 1 ? currentIndex + 1 : 0
    setCurrentIndex(newIndex)
    onChartChange?.(newIndex, charts[newIndex])
    
    setTimeout(() => setIsTransitioning(false), 300)
  }

  // Handle dot navigation
  const handleDotClick = (index: number) => {
    if (index !== currentIndex) {
      stopAutoRotate()
      setIsTransitioning(true)
      setCurrentIndex(index)
      onChartChange?.(index, charts[index])
      
      setTimeout(() => setIsTransitioning(false), 300)
    }
  }

  // Swipe gesture handlers
  const swipeHandlers = {
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    onTap: () => {
      // Optional: Could toggle fullscreen or show details
    }
  }

  // Track touch movement for visual feedback
  const gestureControls = useSwipeGestures(containerRef, swipeHandlers, {
    threshold: 50,
    velocity: 0.3,
    preventDefaultTouchmove: true,
    enableMouse: true // Enable for desktop testing
  })

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious()
          break
        case 'ArrowRight':
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex])

  if (charts.length === 0) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text color="dimmed" align="center">No charts available</Text>
      </Card>
    )
  }

  const currentChart = charts[currentIndex]

  return (
    <Card 
      withBorder 
      radius="md" 
      p="lg" 
      className="swipeable-chart-card"
      style={{ height }}
    >
      {/* Header */}
      <Group position="apart" mb="md">
        <div>
          <Group spacing="xs">
            <Title order={4}>{currentChart.title}</Title>
            {currentChart.badge && (
              <Badge 
                color={currentChart.badgeColor || 'blue'} 
                variant="light"
                size="sm"
              >
                {currentChart.badge}
              </Badge>
            )}
          </Group>
          {currentChart.subtitle && (
            <Text size="sm" color="dimmed" mt={4}>
              {currentChart.subtitle}
            </Text>
          )}
        </div>

        {/* Chart selector for desktop */}
        {charts.length > 1 && (
          <Select
            className="desktop-only"
            size="xs"
            value={currentIndex.toString()}
            onChange={(value) => value && handleDotClick(parseInt(value))}
            data={charts.map((chart, index) => ({
              value: index.toString(),
              label: chart.title
            }))}
            styles={{ input: { width: 150 } }}
          />
        )}
      </Group>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="swipeable-chart-container"
        tabIndex={0}
        role="region"
        aria-label="Swipeable chart area"
        style={{ height: `calc(${typeof height === 'number' ? `${height}px` : height} - 80px)` }}
      >
        <div
          className="swipeable-chart-wrapper"
          style={{
            transform: `translateX(${-currentIndex * 100 + touchOffset}%)`,
            transition: isTransitioning ? 'transform 0.3s ease' : 'none'
          }}
        >
          {charts.map((chart, index) => (
            <div
              key={chart.id}
              className="swipeable-chart-slide"
              aria-hidden={index !== currentIndex}
            >
              {chart.component}
            </div>
          ))}
        </div>

        {/* Navigation hints */}
        {showHints && charts.length > 1 && (
          <>
            <Box 
              className="chart-swipe-hint left"
              onClick={handlePrevious}
              role="button"
              aria-label="Previous chart"
            >
              <IconChevronLeft size={20} />
            </Box>
            <Box 
              className="chart-swipe-hint right"
              onClick={handleNext}
              role="button"
              aria-label="Next chart"
            >
              <IconChevronRight size={20} />
            </Box>
          </>
        )}

        {/* Navigation dots */}
        {showDots && charts.length > 1 && (
          <div className="chart-dots" role="tablist">
            {charts.map((_, index) => (
              <button
                key={index}
                className={`chart-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => handleDotClick(index)}
                aria-label={`Go to chart ${index + 1}`}
                aria-selected={index === currentIndex}
                role="tab"
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile swipe indicator */}
      <Text 
        size="xs" 
        color="dimmed" 
        align="center" 
        mt="xs"
        className="mobile-only"
      >
        {charts.length > 1 && 'Swipe to navigate charts'}
      </Text>
    </Card>
  )
}

export default SwipeableChart