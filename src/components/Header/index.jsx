import {
  Badge,
  Burger,
  Button,
  Flex,
  Group,
  Header,
  MediaQuery,
  Switch,
  Text,
  useMantineTheme,
  ActionIcon,
  TextInput,
  Image,
  ScrollArea,
  Stack,
  Box,
  UnstyledButton,
  Paper,
  Tooltip
} from '@mantine/core'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { IconCoins, IconCrown, IconCreditCard, IconSearch } from '@tabler/icons-react'
import AvatarMenu from './components/avatar-menu.jsx'
import SubscriptionModal, { useSubscription } from '../Subscription/index.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { trpc } from '../../utils/trpc.jsx'

export default function HeaderNav ({ opened, setOpened, user, onLogout }) {
  const theme = useMantineTheme()
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)
  const [subscriptionModalOpened, setSubscriptionModalOpened] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)
  const { data: subscription } = trpc.billing.getSubscription.useQuery()
  const isSubscribed = subscription && subscription.status === 'active'
  const isPremiumUser = user?.role === 'premium' || user?.role === 'admin' || isSubscribed


  // Fetch items for search
  const { data: itemMapping } = trpc.items.getItemMapping.useQuery()
  const { data: allItems } = trpc.items.getAllItems.useQuery(undefined, {
    refetchInterval: 60000,
    staleTime: 0
  })

  useEffect(() => {
    const gameMode = localStorage.getItem('gameMode')
    setChecked(gameMode ? JSON.parse(gameMode) === 'dmm' : false)
  }, [])

  const setGameMode = (e) => {
    const newChecked = e.currentTarget.checked ?? false
    setChecked(newChecked)
    localStorage.setItem('gameMode', newChecked ? JSON.stringify('dmm') : JSON.stringify(''))
  }


  // Helper function to get proper image URL (matches AllItems pattern)
  const getItemImageUrl = (item) => {
    if (item.icon) {
      // If icon is already a full URL, use it
      if (item.icon.startsWith('http://') || item.icon.startsWith('https://')) {
        return item.icon
      }
      // Otherwise, construct URL from relative path (same pattern as AllItems)
      // item.icon is typically like "c/c1/Item_name.png"
      return `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_')
    }
    // Fallback to default wiki image based on item name
    const itemName = item.name?.replace(/\s+/g, '_') || `item_${item.id}`
    return `https://oldschool.runescape.wiki/images/c/c1/${itemName}.png`
  }

  // Filter items for search
  const filteredItems = useMemo(() => {
    if (!searchQuery || !itemMapping || !allItems) return []
    
    // Convert object to array if needed (itemMapping can be an object or array)
    const itemMappingArray = Array.isArray(itemMapping) 
      ? itemMapping 
      : Object.values(itemMapping || {})
    
    if (!Array.isArray(itemMappingArray) || itemMappingArray.length === 0) return []
    
    const query = searchQuery.toLowerCase()
    const matching = itemMappingArray
      .filter(item => 
        item?.name?.toLowerCase().includes(query) ||
        item?.id?.toString().includes(query)
      )
      .slice(0, 10) // Limit to 10 results
    
    return matching.map(item => {
      const priceData = allItems[item.id]
      const highPrice = priceData?.high ? Number(priceData.high) : 0
      const lowPrice = priceData?.low ? Number(priceData.low) : 0
      // Calculate profit: high * 0.99 (1% tax) - low
      const profit = highPrice && lowPrice ? Math.floor(highPrice * 0.99 - lowPrice) : 0
      return {
        ...item,
        img: getItemImageUrl(item),
        high: highPrice,
        low: lowPrice,
        profit
      }
    })
  }, [searchQuery, itemMapping, allItems])

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    // If dropdown is open, handle navigation
    if (searchQuery && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        )
        return
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        )
        return
      } else if (e.key === 'Enter') {
        e.preventDefault()
        // If an item is selected, navigate to it
        if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
          handleItemSelect(filteredItems[selectedIndex])
        } else if (filteredItems.length > 0) {
          // If no item selected but results exist, select first item
          handleItemSelect(filteredItems[0])
        }
        return
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSearchQuery('')
        setSelectedIndex(-1)
        searchInputRef.current?.blur()
        return
      }
    }
  }

  // Cmd+K / Ctrl+K hotkey handler
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(`[data-item-index="${selectedIndex}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleItemSelect = (item) => {
    if (item) {
      navigate(`/item/${item.id}`)
      setSearchQuery('')
    }
  }

  return (
    <Header
      height={70}
      sx={(theme) => ({
        background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
        borderBottom: `1px solid ${theme.colors.dark[5]}`
      })}
      p="md"
    >
      <Group sx={{ height: '100%' }} px={20} position="apart" noWrap>
        {/* Logo Section */}
        <Link to={'/all-items'} style={{ textDecoration: 'none', color: 'white', flexShrink: 0 }}>
          <Flex align="center">
            <div style={{ marginLeft: 0, transition: 'transform 0.2s ease, filter 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.4))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.filter = 'none'
              }}
            >
              <Text size="xl" weight={700} style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2
              }}>
                GE Metrics
              </Text>
              <Text size="xs" color="dimmed" style={{ lineHeight: 1 }}>
                Live Market Data
              </Text>
            </div>
          </Flex>
        </Link>

        {/* Item Search */}
        <MediaQuery smallerThan="md" styles={{ display: 'none' }}>
          <Box style={{ flex: 1, maxWidth: '400px', margin: '0 20px', position: 'relative' }}>
            <TextInput
              ref={searchInputRef}
              placeholder="Search items... (⌘K or Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              icon={<IconSearch size={16} />}
              styles={{
                input: {
                  backgroundColor: theme.colors.dark[6],
                  border: `1px solid ${theme.colors.dark[4]}`,
                  color: theme.colors.gray[0],
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    borderColor: '#667eea',
                    boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)'
                  },
                  '&:hover': {
                    borderColor: '#228be6',
                    backgroundColor: theme.colors.dark[5]
                  }
                }
              }}
            />
            {searchQuery && filteredItems.length > 0 && (
              <Paper
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: theme.colors.dark[7],
                  border: `1px solid ${theme.colors.dark[4]}`,
                  borderRadius: '4px',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflow: 'hidden'
                }}
              >
                <ScrollArea style={{ maxHeight: '300px' }}>
                  <Stack spacing="xs" p="xs">
                    {filteredItems.map((item, index) => {
                      const isSelected = index === selectedIndex
                      return (
                        <UnstyledButton
                          key={item.id}
                          data-item-index={index}
                          onClick={() => handleItemSelect(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          style={{
                            padding: '8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor: isSelected ? theme.colors.dark[6] : 'transparent',
                            border: isSelected ? `1px solid ${theme.colors.blue[6]}` : '1px solid transparent'
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          <Group spacing="sm" noWrap>
                            <Box
                              style={{
                                width: 32,
                                height: 32,
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: theme.colors.dark[5],
                                borderRadius: '2px'
                              }}
                            >
                              <Image
                                src={item.img}
                                width={32}
                                height={32}
                                fit="contain"
                                withPlaceholder
                                onError={(e) => {
                                  // Fallback to default image on error
                                  const fallbackUrl = `https://oldschool.runescape.wiki/images/c/c1/${item.name?.replace(/\s+/g, '_') || `item_${item.id}`}.png`
                                  e.target.src = fallbackUrl
                                }}
                                alt={item.name || `Item ${item.id}`}
                                style={{
                                  imageRendering: 'pixelated',
                                  maxWidth: '100%',
                                  maxHeight: '100%'
                                }}
                              />
                            </Box>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text size="sm" weight={500} truncate>{item.name}</Text>
                              <Group spacing={4} noWrap>
                                <Text size="xs" color="dimmed">
                                  Buy: {item.low?.toLocaleString() || 'N/A'} GP
                                </Text>
                                <Text size="xs" color="dimmed">|</Text>
                                <Text size="xs" color="dimmed">
                                  Sell: {item.high?.toLocaleString() || 'N/A'} GP
                                </Text>
                                {item.profit !== undefined && (
                                  <>
                                    <Text size="xs" color="dimmed">|</Text>
                                    <Text size="xs" weight={600} style={{ color: item.profit > 0 ? theme.colors.green[5] : item.profit < 0 ? theme.colors.red[5] : theme.colors.gray[5] }}>
                                      Profit: {item.profit > 0 ? '+' : ''}{item.profit.toLocaleString()} GP
                                    </Text>
                                  </>
                                )}
                              </Group>
                            </div>
                          </Group>
                        </UnstyledButton>
                      )
                    })}
                  </Stack>
                </ScrollArea>
              </Paper>
            )}
          </Box>
        </MediaQuery>


        {/* Right Section */}
        <Group spacing="sm" noWrap>
          {/* Premium/Subscription Button */}
          {!isPremiumUser
            ? (
            <>
              {/* Desktop Button */}
              <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
                <Button
                  component={Link}
                  to="/billing"
                  variant="gradient"
                  gradient={{ from: 'gold', to: 'orange' }}
                  leftIcon={<IconCrown size={16} />}
                  size="sm"
                  style={{ 
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    transform: 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  Upgrade to Premium
                </Button>
              </MediaQuery>
              {/* Mobile Button */}
              <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                <ActionIcon 
                  component={Link} 
                  to="/billing" 
                  variant="gradient" 
                  gradient={{ from: 'gold', to: 'orange' }} 
                  size={36}
                  style={{
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'
                    e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
                    e.currentTarget.style.filter = 'none'
                  }}
                >
                  <IconCrown size={20} />
                </ActionIcon>
              </MediaQuery>
            </>
              )
            : (
            <>
              <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
                <Button
                  component={Link}
                  to="/billing"
                  variant="gradient"
                  gradient={{ from: 'gold', to: 'orange' }}
                  leftIcon={<IconCrown size={12} />}
                  size="xs"
                  compact
                  style={{
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 215, 0, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  Premium
                </Button>
              </MediaQuery>
              <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                <ActionIcon 
                  component={Link} 
                  to="/billing" 
                  variant="gradient" 
                  gradient={{ from: 'gold', to: 'orange' }} 
                  size={36}
                  style={{
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'
                    e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
                    e.currentTarget.style.filter = 'none'
                  }}
                >
                  <IconCrown size={20} />
                </ActionIcon>
              </MediaQuery>
            </>
              )}


          {/* Billing Icon */}
          <ActionIcon
            component={Link}
            to="/billing"
            variant="subtle"
            color="gray"
            size={36}
            style={{
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(5deg) scale(1.1)'
              e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.6))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
              e.currentTarget.style.filter = 'none'
            }}
          >
            <IconCreditCard size={18} />
          </ActionIcon>

          {/* Avatar Menu */}
          <Box
            style={{
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <AvatarMenu user={user} onLogout={onLogout} size={36} checked={checked} setChecked={setChecked}/>
          </Box>

          {/* Mobile Menu */}
          <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
              color={theme.colors.gray[6]}
              sx={{
                height: 36,
                width: 36,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'rotate(180deg)'
                }
              }}
            />
          </MediaQuery>
        </Group>
      </Group>

      {/* Subscription Modal */}
      <SubscriptionModal
        opened={subscriptionModalOpened}
        onClose={() => setSubscriptionModalOpened(false)}
        currentPlan={subscription?.stripePriceId || 'free'}
      />
    </Header>
  )
}
