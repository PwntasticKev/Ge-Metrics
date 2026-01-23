import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebouncedValue } from '@mantine/hooks'
import {
  Box,
  Card,
  Center,
  Group,
  Loader,
  Text,
  Badge,
  Tabs,
  NumberInput,
  Button,
  Alert,
  Stack,
  Select,
  Checkbox,
  Collapse
} from '@mantine/core'
import {
  IconClock,
  IconTarget,
  IconTrendingUp,
  IconVolume,
  IconAlertTriangle,
  IconRefresh,
  IconCoin,
  IconFilter,
  IconFilterOff,
  IconTrash
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useTrashScoring } from '../../hooks/useTrashScoring.js'
import SuggestedItemsTable from './components/SuggestedItemsTable.jsx'

export default function SuggestedItems() {
  const [activeTab, setActiveTab] = useState('global')
  const [capitalInput, setCapitalInput] = useState(() => {
    const saved = localStorage.getItem('suggestedItems_capital')
    return saved ? parseInt(saved) : 1000000 // Default 1M GP
  })
  
  // Debounce capital input to prevent excessive API calls
  const [debouncedCapital] = useDebouncedValue(capitalInput, 800) // 800ms delay
  
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites('item')
  const { 
    userTrashItems, 
    toggleTrashVote, 
    getTrashPercentage, 
    getTrashWeight,
    isTrash 
  } = useTrashScoring()
  const [showTrashItems, setShowTrashItems] = useState(false) // Hide trash by default

  // Filter states
  const [showFilters, setShowFilters] = useState(true)
  const [minMargin, setMinMargin] = useState('')
  const [maxMargin, setMaxMargin] = useState('')
  const [minVolume, setMinVolume] = useState('')
  const [maxVolume, setMaxVolume] = useState('')
  const [profitThreshold, setProfitThreshold] = useState('')
  const [showManipulated, setShowManipulated] = useState(true)

  // Save capital to localStorage when debounced value changes
  useEffect(() => {
    if (debouncedCapital > 0) {
      localStorage.setItem('suggestedItems_capital', debouncedCapital.toString())
    }
  }, [debouncedCapital])

  // Get suggested items based on current filters  
  const queryParams = useMemo(() => ({
    capital: debouncedCapital > 0 ? debouncedCapital : undefined,
    volumeType: activeTab
  }), [debouncedCapital, activeTab])

  const {
    data: suggestedItems = [],
    isLoading: itemsLoading,
    refetch: refetchItems,
    dataUpdatedAt
  } = trpc.suggestedItems.getItems.useQuery(
    queryParams,
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: debouncedCapital > 0
    }
  )

  // Get statistics
  const { data: stats } = trpc.suggestedItems.getStats.useQuery(undefined, {
    staleTime: 300_000, // 5 minutes
    refetchOnWindowFocus: false
  })

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'item')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastFetchTime(new Date(dataUpdatedAt))
    }
  }, [dataUpdatedAt])

  // Update current time every 30 seconds to refresh relative time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleFavorite = (itemId) => {
    toggleFavorite(itemId, 'item')
  }

  const handleRefresh = useCallback(() => {
    refetchItems()
  }, [refetchItems])

  const isLoading = itemsLoading

  // Filter items by tab and filters
  const filteredItems = useMemo(() => {
    let filtered = suggestedItems

    // Apply tab-based filters first
    switch (activeTab) {
      case 'high':
        filtered = filtered.filter(item => item.volume24h >= 1000)
        break
      case 'low':
        filtered = filtered.filter(item => item.volume24h < 1000)
        break
      default:
        // Global tab shows all
        break
    }

    // Apply trash filtering - hide heavily voted trash items unless user wants to see them
    if (!showTrashItems) {
      filtered = filtered.filter(item => {
        const trashPercentage = getTrashPercentage(item.itemId)
        return trashPercentage < 60 // Hide items with 60%+ trash votes
      })
    }
    
    // Apply trash weight penalties to suggestion scores for sorting
    filtered = filtered.map(item => {
      const trashWeight = getTrashWeight(item.itemId)
      return {
        ...item,
        // Adjust suggestion score based on trash weight
        adjustedScore: Math.round(item.suggestionScore * trashWeight),
        trashPercentage: getTrashPercentage(item.itemId)
      }
    }).sort((a, b) => b.adjustedScore - a.adjustedScore) // Re-sort by adjusted score

    // Apply additional filters
    if (!showManipulated) {
      filtered = filtered.filter(item => !item.manipulationWarning)
    }

    if (minMargin !== '') {
      filtered = filtered.filter(item => item.marginPercentage >= parseFloat(minMargin))
    }

    if (maxMargin !== '') {
      filtered = filtered.filter(item => item.marginPercentage <= parseFloat(maxMargin))
    }

    if (minVolume !== '') {
      filtered = filtered.filter(item => item.volume24h >= parseInt(minVolume))
    }

    if (maxVolume !== '') {
      filtered = filtered.filter(item => item.volume24h <= parseInt(maxVolume))
    }

    if (profitThreshold !== '') {
      filtered = filtered.filter(item => item.profitPerFlip >= parseInt(profitThreshold))
    }

    return filtered
  }, [suggestedItems, activeTab, minMargin, maxMargin, minVolume, maxVolume, profitThreshold, showManipulated, showTrashItems, getTrashPercentage, getTrashWeight])

  return (
    <>
      {isLoading && (
        <Center maw={400} h={300} mx="auto">
          <Loader />
        </Center>
      )}

      {!isLoading && (
        <Box sx={{ py: 4 }}>
          {/* Status Card */}
          <Card withBorder radius="md" mb="md" sx={(theme) => ({
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1]
          })}>
            <Group position="apart">
              <Group>
                <IconTarget size={16} />
                <Text size="sm">
                  Suggested Items - {getRelativeTime(lastFetchTime)}
                </Text>
                <Text size="sm" color="dimmed">
                  ({filteredItems.length} items)
                </Text>
              </Group>
              <Group>
                <Badge color="blue" variant="light">Smart Analysis</Badge>
                <Button
                  variant="light"
                  size="xs"
                  leftIcon={<IconRefresh size={14} />}
                  onClick={handleRefresh}
                  loading={itemsLoading}
                >
                  Refresh
                </Button>
              </Group>
            </Group>
          </Card>


          {/* Capital Input and Filters */}
          <Card withBorder mb="md" p="md">
            <Stack spacing="md">
              <Group>
                <NumberInput
                  label="Your Capital (GP)"
                  placeholder="Enter your available GP"
                  value={capitalInput}
                  onChange={setCapitalInput}
                  min={0}
                  max={2147483647} // Max int32
                  formatter={(value) => value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => value.replace(/,/g, '')}
                  icon={<IconCoin size={16} />}
                  sx={{ minWidth: 200 }}
                />
                <div>
                  <Text size="sm" color="dimmed">
                    Only items within your budget will be shown
                  </Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftIcon={<IconFilter size={14} />}
                    onClick={() => setShowFilters(!showFilters)}
                    mt="xs"
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                </div>
              </Group>
              
              {/* Filters */}
              <Collapse in={showFilters}>
                <Card.Section withBorder inheritPadding py="xs">
                  <Stack spacing="xs">
                    <Group>
                      <NumberInput
                        placeholder="Min margin %"
                        value={minMargin}
                        onChange={setMinMargin}
                        size="xs"
                        style={{ width: 120 }}
                      />
                      <NumberInput
                        placeholder="Max margin %"
                        value={maxMargin}
                        onChange={setMaxMargin}
                        size="xs"
                        style={{ width: 120 }}
                      />
                      <NumberInput
                        placeholder="Min volume"
                        value={minVolume}
                        onChange={setMinVolume}
                        size="xs"
                        style={{ width: 120 }}
                      />
                      <NumberInput
                        placeholder="Max volume"
                        value={maxVolume}
                        onChange={setMaxVolume}
                        size="xs"
                        style={{ width: 120 }}
                      />
                      <Select
                        placeholder="Min profit"
                        value={profitThreshold}
                        onChange={setProfitThreshold}
                        data={[
                          { value: '500000', label: '500K+ GP' },
                          { value: '100000', label: '100K+ GP' },
                          { value: '50000', label: '50K+ GP' },
                          { value: '10000', label: '10K+ GP' }
                        ]}
                        size="xs"
                        style={{ width: 120 }}
                        clearable
                      />
                    </Group>
                    <Group>
                      <Checkbox
                        label="Show potentially manipulated items"
                        checked={showManipulated}
                        onChange={(event) => setShowManipulated(event.currentTarget.checked)}
                      />
                      <Checkbox
                        label="Show heavily trashed items (60%+ votes)"
                        checked={showTrashItems}
                        onChange={(event) => setShowTrashItems(event.currentTarget.checked)}
                      />
                      <Button 
                        variant="subtle" 
                        size="xs" 
                        onClick={() => {
                          setMinMargin('')
                          setMaxMargin('')
                          setMinVolume('')
                          setMaxVolume('')
                          setProfitThreshold('')
                          setShowManipulated(true)
                        }} 
                        leftIcon={<IconFilterOff size={14} />}
                      >
                        Clear Filters
                      </Button>
                    </Group>
                  </Stack>
                </Card.Section>
              </Collapse>
            </Stack>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onTabChange={setActiveTab} mb="md">
            <Tabs.List>
              <Tabs.Tab value="global" icon={<IconTarget size={14} />}>
                Global Suggested ({suggestedItems.length})
              </Tabs.Tab>
              <Tabs.Tab value="high" icon={<IconVolume size={14} />}>
                High Volume ({suggestedItems.filter(item => item.volume24h >= 1000).length})
              </Tabs.Tab>
              <Tabs.Tab value="low" icon={<IconTrendingUp size={14} />}>
                Low Volume ({suggestedItems.filter(item => item.volume24h < 1000).length})
              </Tabs.Tab>
              <Tabs.Tab value="trash" icon={<IconTrash size={14} />} color="orange">
                My Trash ({userTrashItems?.length || 0})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="global" pt="xs">
              {filteredItems.length > 0 ? (
                <SuggestedItemsTable
                  data={filteredItems}
                  favoriteItems={favoriteItemIds}
                  onToggleFavorite={handleToggleFavorite}
                  showFavoriteColumn={true}
                />
              ) : (
                <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
                  No items match your current filters. Try increasing your capital or adjusting the volume type.
                </Alert>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="high" pt="xs">
              {filteredItems.length > 0 ? (
                <SuggestedItemsTable
                  data={filteredItems}
                  favoriteItems={favoriteItemIds}
                  onToggleFavorite={handleToggleFavorite}
                  showFavoriteColumn={true}
                />
              ) : (
                <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
                  No high volume items match your capital. Try increasing your budget.
                </Alert>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="low" pt="xs">
              {filteredItems.length > 0 ? (
                <SuggestedItemsTable
                  data={filteredItems}
                  favoriteItems={favoriteItemIds}
                  onToggleFavorite={handleToggleFavorite}
                  showFavoriteColumn={true}
                />
              ) : (
                <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
                  No low volume items match your capital. Try increasing your budget.
                </Alert>
              )}
            </Tabs.Panel>
            
            <Tabs.Panel value="trash" pt="xs">
              {userTrashItems && userTrashItems.length > 0 ? (
                <Card withBorder>
                  <Stack>
                    <Group position="apart">
                      <Text size="lg" weight={500}>Your Trash List</Text>
                      <Text size="sm" color="dimmed">
                        Items you've marked as unreliable or trash
                      </Text>
                    </Group>
                    <Alert icon={<IconAlertTriangle size={16} />} color="orange">
                      These items are hidden from your suggested items view. Click the trash button again to restore them.
                    </Alert>
                    <SuggestedItemsTable
                      data={userTrashItems.map(item => ({
                        ...item,
                        suggestionScore: 0,
                        manipulationWarning: false,
                        affordable: true
                      }))}
                      favoriteItems={favoriteItemIds}
                      onToggleFavorite={handleToggleFavorite}
                      showFavoriteColumn={true}
                    />
                  </Stack>
                </Card>
              ) : (
                <Alert icon={<IconTrash size={16} />} color="gray">
                  You haven't marked any items as trash yet. Use the trash button on items you want to hide.
                </Alert>
              )}
            </Tabs.Panel>
          </Tabs>
        </Box>
      )}
    </>
  )
}