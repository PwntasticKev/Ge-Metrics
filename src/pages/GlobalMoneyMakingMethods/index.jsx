import React, { useState } from 'react'
import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Alert,
  Button,
  Select,
  TextInput,
  Stack,
  Title,
  Container,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import {
  IconClock,
  IconRefresh,
  IconInfoCircle,
  IconSearch,
  IconFilter,
  IconTarget,
  IconSword,
  IconCoin,
  IconUsers,
  IconTrashFilled
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import MoneyMakingMethodsTable from '../MoneyMakingMethods/components/MoneyMakingMethodsTable.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'
import { InfiniteScrollTable } from '../../components/InfiniteScroll/InfiniteScrollTable'
import { formatNumber } from '../../utils/formatters'
import { useMethodTrashScoring } from '../../hooks/useMethodTrashScoring.js'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'skilling', label: 'Skilling' },
  { value: 'pvm', label: 'Player vs Monster' },
  { value: 'merching', label: 'Merching/Trading' }
]

const DIFFICULTIES = [
  { value: '', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'elite', label: 'Elite' }
]

const SORT_OPTIONS = [
  { value: 'profitPerHour', label: 'Highest Profit/Hour' },
  { value: 'createdAt', label: 'Newest First' },
  { value: 'methodName', label: 'Name (A-Z)' }
]

export default function GlobalMoneyMakingMethods() {
  const { items } = ItemData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [sortBy, setSortBy] = useState('profitPerHour')

  // Get TRPC utils for queries
  const trpcUtils = trpc.useUtils()
  
  // Get global stats - using a public endpoint
  const { data: globalStats } = trpc.moneyMakingMethods.getGlobalStats.useQuery()
  
  // Get method trash scoring functionality
  const { toggleTrashVote, hasUserVoted } = useMethodTrashScoring()
  
  // Fetch data function for infinite scroll
  const fetchGlobalMethods = React.useCallback(async ({ offset, limit, search, filters, sortBy: sortByParam, sortOrder }) => {
    try {
      const result = await trpcUtils.moneyMakingMethods.getGlobalMethods.fetch({
        limit,
        offset,
        category: selectedCategory || undefined,
        difficulty: selectedDifficulty || undefined,
        sortBy: sortByParam || sortBy,
        sortOrder: sortOrder || 'desc',
        search: searchQuery
      })
      
      // Filter out methods that the user has voted as trash
      const filteredResult = result?.filter(method => 
        !hasUserVoted(method.id) && !isTrash(method.id)
      ) || []

      return {
        data: filteredResult,
        totalCount: filteredResult.length,
        hasMore: filteredResult.length >= limit
      }
    } catch (error) {
      console.error('Error fetching global methods:', error)
      throw error
    }
  }, [selectedCategory, selectedDifficulty, sortBy, searchQuery, trpcUtils.moneyMakingMethods.getGlobalMethods, hasUserVoted, isTrash])

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])



  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedDifficulty('')
    setSortBy('profitPerHour')
  }

  // Render individual method card
  const renderMethodCard = React.useCallback((method, index) => {
    const DIFFICULTY_COLORS = {
      easy: 'green',
      medium: 'orange', 
      hard: 'red',
      elite: 'violet'
    }
    
    const CATEGORY_COLORS = {
      skilling: 'blue',
      pvm: 'red',
      merching: 'orange'
    }
    
    const formatProfitPerHour = (profit) => {
      if (!profit || profit === 0) return 'Calculating...'
      return formatNumber(profit) + ' gp/hr'
    }
    
    return (
      <Card key={method.id} withBorder p="md" style={{ marginBottom: '8px' }}>
        <Group position="apart" align="flex-start">
          <Stack spacing={4} style={{ flex: 1 }}>
            <Group spacing="xs">
              <Text weight={600} size="sm">{method.methodName}</Text>
              <Badge color="green" variant="filled" size="sm">Global</Badge>
            </Group>
            
            <Text size="xs" color="dimmed" lineClamp={2}>
              {method.description}
            </Text>
            
            <Group spacing="md">
              <Group spacing="xs">
                <Badge 
                  color={CATEGORY_COLORS[method.category]} 
                  variant="light" 
                  size="sm"
                  style={{ textTransform: 'capitalize' }}
                >
                  {method.category}
                </Badge>
                <Badge 
                  color={DIFFICULTY_COLORS[method.difficulty]} 
                  variant="light" 
                  size="sm"
                  style={{ textTransform: 'capitalize' }}
                >
                  {method.difficulty}
                </Badge>
              </Group>
              
              <Text size="xs" color="dimmed">by @{method.username}</Text>
              
              <Group spacing="xs">
                <IconClock size={12} />
                <Text size="xs" color="dimmed">
                  {getRelativeTime(method.createdAt)}
                </Text>
              </Group>
            </Group>
          </Stack>
          
          <Group spacing="xs" align="center">
            <Tooltip label={hasUserVoted(method.id) ? "Remove trash vote" : "Mark as unreliable"}>
              <ActionIcon
                size="sm"
                variant={hasUserVoted(method.id) ? 'filled' : 'subtle'}
                color="orange"
                onClick={() => toggleTrashVote(method.id, method.methodName)}
              >
                <IconTrashFilled size={14} />
              </ActionIcon>
            </Tooltip>
            <IconCoin size={14} color="gold" />
            <Text size="sm" weight={600} color="green">
              {formatProfitPerHour(method.profitPerHour)}
            </Text>
          </Group>
        </Group>
      </Card>
    )
  }, [toggleTrashVote, hasUserVoted])


  return (
    <PremiumPageWrapper>
      <Container size="xl" py="md">
        <Stack spacing="lg">
          {/* Header */}
          <Group position="apart">
            <div>
              <Title order={2}>Global Money Making Methods</Title>
              <Text color="dimmed" size="sm">
                Discover community-approved OSRS profit strategies
              </Text>
            </div>
            <Group>
              <Badge color="blue" size="lg">
                <Group spacing="xs">
                  <IconClock size={14} />
                  <span>{getRelativeTime(new Date(), currentTime)}</span>
                </Group>
              </Badge>
            </Group>
          </Group>

          {/* Stats Cards */}
          <Group>
            <Card withBorder>
              <Group spacing="xs">
                <IconUsers size={20} color="green" />
                <div>
                  <Text size="sm" color="dimmed">Approved Methods</Text>
                  <Text weight={600} size="lg">{globalStats?.approved || 0}</Text>
                </div>
              </Group>
            </Card>
            
          </Group>

          {/* Filters */}
          <Card withBorder p="md">
            <Stack spacing="md">
              <Group position="apart">
                <Text weight={500} size="sm">Filter & Search</Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={handleClearFilters}
                >
                  Clear All
                </Button>
              </Group>
              
              <Group grow>
                <TextInput
                  placeholder="Search methods, descriptions, or creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<IconSearch size={16} />}
                />
                
                <Select
                  placeholder="Category"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  data={CATEGORIES}
                  icon={<IconFilter size={16} />}
                />
                
                <Select
                  placeholder="Difficulty"
                  value={selectedDifficulty}
                  onChange={setSelectedDifficulty}
                  data={DIFFICULTIES}
                />
                
                <Select
                  placeholder="Sort By"
                  value={sortBy}
                  onChange={setSortBy}
                  data={SORT_OPTIONS}
                />
              </Group>
            </Stack>
          </Card>

          {/* Infinite Scroll Methods */}
          <InfiniteScrollTable
            fetchData={fetchGlobalMethods}
            renderItem={renderMethodCard}
            initialLoadSize={30}
            loadMoreSize={20}
            searchQuery={searchQuery}
            filters={{ category: selectedCategory, difficulty: selectedDifficulty }}
            sortBy={sortBy}
            sortOrder="desc"
            itemHeight={120}
            showStats={true}
            showScrollToTop={true}
            ariaLabel="Global money making methods"
            containerHeight="600px"
            renderEmpty={() => (
              <Card withBorder py="xl">
                <Center>
                  <Stack align="center" spacing="md">
                    <IconInfoCircle size={48} color="gray" />
                    <div style={{ textAlign: 'center' }}>
                      <Text weight={600} size="lg">
                        {searchQuery || selectedCategory || selectedDifficulty
                          ? 'No methods match your filters'
                          : 'No approved methods yet'
                        }
                      </Text>
                      <Text color="dimmed" size="sm">
                        {searchQuery || selectedCategory || selectedDifficulty
                          ? 'Try adjusting your search criteria'
                          : 'Be the first to contribute! Create methods in "My Money Making Methods"'
                        }
                      </Text>
                    </div>
                    {(searchQuery || selectedCategory || selectedDifficulty) && (
                      <Button onClick={handleClearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </Stack>
                </Center>
              </Card>
            )}
            renderError={(error, retry) => (
              <Alert color="red" icon={<IconInfoCircle size={16} />}>
                <Group position="apart">
                  <Text>Error loading global money making methods: {error.message}</Text>
                  <Button size="xs" onClick={retry}>Retry</Button>
                </Group>
              </Alert>
            )}
          />

          {/* Help Card */}
          <Card withBorder style={{ backgroundColor: 'rgba(34, 139, 34, 0.1)' }}>
            <Stack spacing="xs">
              <Group>
                <IconInfoCircle size={16} color="green" />
                <Text size="sm" weight={500} color="green">Community Guidelines</Text>
              </Group>
              <Text size="xs" color="dimmed">
                All methods shown here have been reviewed and approved by our moderation team. 
                Methods include detailed requirements, expected profit rates, and community feedback. 
                Want to contribute? Create your own methods and submit them for review!
              </Text>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </PremiumPageWrapper>
  )
}