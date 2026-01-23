import React, { useRef, useState } from 'react'
import { Card, Group, Text, Badge, ActionIcon, Box, Transition } from '@mantine/core'
import { IconHeart, IconHeartOff, IconTrash, IconStar, IconArrowRight } from '@tabler/icons-react'
import { useSwipeGestures } from '../../hooks/useSwipeGestures'
import { formatNumber } from '../../utils/formatters'
import './SwipeableCard.css'

interface SwipeableFavoriteCardProps {
  item: {
    id: number
    name: string
    price?: number
    profit?: number
    change?: number
    volume?: number
    isFavorite?: boolean
    rating?: number
  }
  onToggleFavorite: (id: number) => void
  onDelete?: (id: number) => void
  onView: (id: number) => void
  showActions?: boolean
  compact?: boolean
}

export const SwipeableFavoriteCard: React.FC<SwipeableFavoriteCardProps> = ({
  item,
  onToggleFavorite,
  onDelete,
  onView,
  showActions = true,
  compact = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Configure swipe handlers
  const swipeHandlers = {
    onSwipeLeft: () => {
      if (showActions && onDelete) {
        setShowDeleteConfirm(true)
        setTimeout(() => setShowDeleteConfirm(false), 3000)
      }
    },
    onSwipeRight: () => {
      onToggleFavorite(item.id)
      // Visual feedback
      setSwipeOffset(50)
      setTimeout(() => setSwipeOffset(0), 300)
    },
    onTap: () => {
      onView(item.id)
    },
    onDoubleTap: () => {
      onToggleFavorite(item.id)
    },
    onLongPress: () => {
      if (showActions) {
        setShowDeleteConfirm(true)
        setTimeout(() => setShowDeleteConfirm(false), 3000)
      }
    }
  }

  useSwipeGestures(cardRef, swipeHandlers, {
    threshold: 40,
    velocity: 0.3,
    preventDefaultTouchmove: true,
    disableOnScroll: true
  })

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => {
      onDelete?.(item.id)
    }, 300)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const profitColor = (item.profit ?? 0) > 0 ? 'green' : 'red'
  const changeColor = (item.change ?? 0) > 0 ? 'green' : 'red'

  return (
    <Transition
      mounted={!isDeleting}
      transition="slide-left"
      duration={300}
      timingFunction="ease"
    >
      {(styles) => (
        <div 
          ref={cardRef}
          className={`swipeable-card-wrapper ${compact ? 'compact' : ''}`}
          style={{
            ...styles,
            transform: `translateX(${swipeOffset}px)`,
            transition: swipeOffset !== 0 ? 'transform 0.3s ease' : undefined
          }}
        >
          <Card 
            className="swipeable-favorite-card"
            withBorder
            radius="md"
            p={compact ? 'xs' : 'sm'}
          >
            {/* Delete confirmation overlay */}
            <Transition
              mounted={showDeleteConfirm}
              transition="fade"
              duration={200}
            >
              {(overlayStyles) => (
                <Box
                  className="delete-confirm-overlay"
                  style={overlayStyles}
                >
                  <Group spacing="xs">
                    <Text size="sm" weight={500}>Delete this item?</Text>
                    <ActionIcon
                      color="red"
                      variant="filled"
                      size="sm"
                      onClick={handleDelete}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                    <ActionIcon
                      variant="default"
                      size="sm"
                      onClick={handleCancelDelete}
                    >
                      <IconArrowRight size={14} />
                    </ActionIcon>
                  </Group>
                </Box>
              )}
            </Transition>

            {/* Main card content */}
            <Group position="apart" noWrap>
              <Box style={{ flex: 1 }}>
                <Group spacing="xs" noWrap>
                  <ActionIcon
                    size={compact ? 'sm' : 'md'}
                    color={item.isFavorite ? 'red' : 'gray'}
                    variant="subtle"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(item.id)
                    }}
                  >
                    {item.isFavorite ? (
                      <IconHeart size={compact ? 16 : 18} fill="currentColor" />
                    ) : (
                      <IconHeartOff size={compact ? 16 : 18} />
                    )}
                  </ActionIcon>

                  <Box style={{ flex: 1 }}>
                    <Text 
                      size={compact ? 'xs' : 'sm'} 
                      weight={500}
                      lineClamp={1}
                    >
                      {item.name}
                    </Text>

                    {!compact && (
                      <Group spacing={4} mt={2}>
                        {item.price && (
                          <Badge size="xs" variant="light">
                            {formatNumber(item.price, { compact: true, isGP: true })}
                          </Badge>
                        )}
                        {item.volume && (
                          <Badge size="xs" variant="light" color="blue">
                            Vol: {formatNumber(item.volume, { compact: true })}
                          </Badge>
                        )}
                        {item.rating && (
                          <Group spacing={2}>
                            <IconStar size={12} />
                            <Text size="xs">{item.rating.toFixed(1)}</Text>
                          </Group>
                        )}
                      </Group>
                    )}
                  </Box>
                </Group>
              </Box>

              {/* Right side metrics */}
              <Box className="card-metrics">
                {item.profit !== undefined && (
                  <Text
                    size={compact ? 'xs' : 'sm'}
                    color={profitColor}
                    weight={600}
                    align="right"
                  >
                    {formatNumber(item.profit, { 
                      compact: true, 
                      isGP: true,
                      showSign: true 
                    })}
                  </Text>
                )}
                {item.change !== undefined && !compact && (
                  <Text
                    size="xs"
                    color={changeColor}
                    align="right"
                  >
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </Text>
                )}
              </Box>
            </Group>

            {/* Visual swipe indicators */}
            <Box className="swipe-indicator swipe-left">
              <IconTrash size={16} />
            </Box>
            <Box className="swipe-indicator swipe-right">
              <IconHeart size={16} />
            </Box>
          </Card>
        </div>
      )}
    </Transition>
  )
}

export default SwipeableFavoriteCard