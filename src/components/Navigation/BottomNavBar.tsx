import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Group, UnstyledButton, ThemeIcon, Text, Box, Transition, Badge } from '@mantine/core'
import {
  IconHome,
  IconChartLine,
  IconFlask,
  IconCalculator,
  IconUser,
  IconMenu2,
  IconX
} from '@tabler/icons-react'
import { useAuth } from '../../contexts/AuthContext'
import { formatNumber } from '../../utils/formatters'
import './BottomNavBar.css'

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  requiresAuth?: boolean
  badge?: string | number
}

interface BottomNavBarProps {
  onMenuToggle?: () => void
  isMenuOpen?: boolean
  hideOnScroll?: boolean
  alwaysShow?: boolean
  notifications?: {
    flips?: number
    alerts?: number
  }
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onMenuToggle,
  isMenuOpen = false,
  hideOnScroll = true,
  alwaysShow = false,
  notifications = {}
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isLandscape, setIsLandscape] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTouchY = useRef<number>(0)

  const navItems: NavItem[] = [
    {
      icon: IconHome,
      label: 'Home',
      path: '/'
    },
    {
      icon: IconChartLine,
      label: 'Flips',
      path: '/flip-history',
      requiresAuth: true,
      badge: notifications.flips
    },
    {
      icon: IconFlask,
      label: 'Potions',
      path: '/potion-combinations'
    },
    {
      icon: IconCalculator,
      label: 'Calc',
      path: '/calculators'
    },
    {
      icon: user ? IconUser : IconMenu2,
      label: user ? 'Profile' : 'Menu',
      path: user ? '/profile' : '#',
      badge: user && notifications.alerts ? notifications.alerts : undefined
    }
  ]

  // Detect landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.matchMedia('(orientation: landscape) and (max-height: 600px)').matches)
    }

    checkOrientation()
    window.addEventListener('orientationchange', checkOrientation)
    window.addEventListener('resize', checkOrientation)

    return () => {
      window.removeEventListener('orientationchange', checkOrientation)
      window.removeEventListener('resize', checkOrientation)
    }
  }, [])

  // Handle scroll-based visibility
  const handleScroll = useCallback(() => {
    if (!hideOnScroll || alwaysShow) return

    const currentScrollY = window.scrollY
    const scrollingUp = currentScrollY < lastScrollY
    const scrollDelta = Math.abs(currentScrollY - lastScrollY)

    // Show when scrolling up or at top
    if (scrollingUp || currentScrollY < 10) {
      setIsVisible(true)
      // Clear any pending hide
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    } else if (scrollDelta > 50) {
      // Hide when scrolling down with significant movement
      setIsVisible(false)
    }

    // Auto-hide after inactivity in landscape mode
    if (isLandscape && !scrollingUp) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, 3000)
    }

    setLastScrollY(currentScrollY)
  }, [lastScrollY, hideOnScroll, alwaysShow, isLandscape])

  // Touch handling for better mobile experience
  const handleTouchStart = useCallback((e: TouchEvent) => {
    lastTouchY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!hideOnScroll || alwaysShow) return

    const currentTouchY = e.touches[0].clientY
    const touchDelta = currentTouchY - lastTouchY.current

    // Show navbar when swiping up from bottom
    if (currentTouchY > window.innerHeight - 100 && touchDelta < -20) {
      setIsVisible(true)
    }

    lastTouchY.current = currentTouchY
  }, [hideOnScroll, alwaysShow])

  // Setup scroll and touch listeners
  useEffect(() => {
    if (hideOnScroll && !alwaysShow) {
      window.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('touchstart', handleTouchStart, { passive: true })
      window.addEventListener('touchmove', handleTouchMove, { passive: true })

      return () => {
        window.removeEventListener('scroll', handleScroll)
        window.removeEventListener('touchstart', handleTouchStart)
        window.removeEventListener('touchmove', handleTouchMove)
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }
      }
    }
  }, [handleScroll, handleTouchStart, handleTouchMove, hideOnScroll, alwaysShow])

  const handleNavClick = (item: NavItem) => {
    if (item.path === '#') {
      onMenuToggle?.()
    } else if (!item.requiresAuth || user) {
      navigate(item.path)
    } else {
      navigate('/login')
    }

    // Show navbar after navigation
    setIsVisible(true)
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  // Don't render on desktop
  const isMobile = window.matchMedia('(max-width: 768px)').matches
  if (!isMobile) return null

  return (
    <>
      <Transition
        mounted={isVisible || alwaysShow}
        transition="slide-up"
        duration={200}
        timingFunction="ease"
      >
        {(styles) => (
          <Box
            className={`bottom-nav ${isLandscape ? 'bottom-nav-landscape' : ''}`}
            style={styles}
          >
            <Group className="bottom-nav-content" spacing={0}>
              {navItems.map((item) => {
                const active = isActive(item.path)
                const Icon = item.icon

                return (
                  <UnstyledButton
                    key={item.path}
                    className={`bottom-nav-item ${active ? 'active' : ''}`}
                    onClick={() => handleNavClick(item)}
                    aria-label={item.label}
                  >
                    <Box className="bottom-nav-item-content">
                      <Box className="bottom-nav-icon-wrapper">
                        <ThemeIcon
                          variant={active ? 'filled' : 'subtle'}
                          size={isLandscape ? 24 : 28}
                          radius="md"
                          color={active ? 'blue' : 'gray'}
                        >
                          <Icon size={isLandscape ? 16 : 18} />
                        </ThemeIcon>
                        {item.badge && (
                          <Badge
                            className="bottom-nav-badge"
                            size="xs"
                            color="red"
                            variant="filled"
                            circle
                          >
                            {typeof item.badge === 'number' 
                              ? formatNumber(item.badge, { compact: true })
                              : item.badge
                            }
                          </Badge>
                        )}
                      </Box>
                      <Text
                        className="bottom-nav-label"
                        size={isLandscape ? 10 : 11}
                        weight={active ? 600 : 400}
                        color={active ? 'blue' : 'dimmed'}
                      >
                        {item.label}
                      </Text>
                    </Box>
                  </UnstyledButton>
                )
              })}
            </Group>
          </Box>
        )}
      </Transition>

      {/* Swipe indicator for hidden navbar */}
      <Transition
        mounted={!isVisible && !alwaysShow && isLandscape}
        transition="fade"
        duration={200}
      >
        {(styles) => (
          <Box
            className="bottom-nav-indicator"
            style={styles}
            onClick={() => setIsVisible(true)}
          >
            <Box className="swipe-indicator" />
          </Box>
        )}
      </Transition>
    </>
  )
}

export default BottomNavBar