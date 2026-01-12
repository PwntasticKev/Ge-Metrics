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
  Tooltip,
  Pagination
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
  IconUsers
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import MoneyMakingMethodsTable from '../MoneyMakingMethods/components/MoneyMakingMethodsTable.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Fetch global methods (approved methods visible to all users)
  const { 
    data: globalMethods, 
    isLoading, 
    error, 
    refetch: refetchMethods 
  } = trpc.moneyMakingMethods.getGlobalMethods.useQuery({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    category: selectedCategory || undefined,
    difficulty: selectedDifficulty || undefined,
    sortBy: sortBy,
    sortOrder: 'desc'
  })

  // Get global stats
  const { data: globalStats } = trpc.moneyMakingMethods.getAdminStats.useQuery()

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedDifficulty, sortBy, searchQuery])

  const handleRefresh = () => {
    refetchMethods()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedDifficulty('')
    setSortBy('profitPerHour')
    setCurrentPage(1)
  }

  // Filter methods locally by search query
  const filteredMethods = React.useMemo(() => {
    if (!globalMethods || !searchQuery) return globalMethods || []
    
    const query = searchQuery.toLowerCase()
    return globalMethods.filter(method => 
      method.methodName.toLowerCase().includes(query) ||
      method.description.toLowerCase().includes(query) ||
      method.username.toLowerCase().includes(query)
    )
  }, [globalMethods, searchQuery])

  const totalMethods = globalStats?.approved || 0
  const totalPages = Math.ceil(totalMethods / itemsPerPage)

  if (isLoading) {
    return (
      <PremiumPageWrapper>
        <Container size="xl" py="md">
          <Center style={{ height: '50vh' }}>
            <Loader size="lg" />
          </Center>
        </Container>
      </PremiumPageWrapper>
    )
  }

  if (error) {
    return (
      <PremiumPageWrapper>
        <Container size="xl" py="md">
          <Alert color="red" icon={<IconInfoCircle size={16} />}>
            Error loading global money making methods: {error.message}
          </Alert>
        </Container>
      </PremiumPageWrapper>
    )
  }

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
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={handleRefresh}
                loading={isLoading}
              >
                <IconRefresh size={16} />
              </ActionIcon>
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
            
            <Card withBorder>
              <Group spacing="xs">
                <IconTarget size={20} color="blue" />
                <div>
                  <Text size="sm" color="dimmed">Skilling Methods</Text>
                  <Text weight={600} size="lg">
                    {filteredMethods?.filter(m => m.category === 'skilling').length || 0}
                  </Text>
                </div>
              </Group>
            </Card>

            <Card withBorder>
              <Group spacing="xs">
                <IconSword size={20} color="red" />
                <div>
                  <Text size="sm" color="dimmed">PvM Methods</Text>
                  <Text weight={600} size="lg">
                    {filteredMethods?.filter(m => m.category === 'pvm').length || 0}
                  </Text>
                </div>
              </Group>
            </Card>

            <Card withBorder>
              <Group spacing="xs">
                <IconCoin size={20} color="orange" />
                <div>
                  <Text size="sm" color="dimmed">Trading Methods</Text>
                  <Text weight={600} size="lg">
                    {filteredMethods?.filter(m => m.category === 'merching').length || 0}
                  </Text>
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

          {/* Methods Table */}
          {filteredMethods && filteredMethods.length > 0 ? (
            <Stack spacing="md">
              <MoneyMakingMethodsTable
                methods={filteredMethods}
                onEdit={() => {}} // No edit for global methods
                onDelete={() => {}} // No delete for global methods
                showActions={false}
                showUser={true}
              />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Center>
                  <Pagination
                    value={currentPage}
                    onChange={setCurrentPage}
                    total={totalPages}
                    size="md"
                    withEdges
                  />
                </Center>
              )}
            </Stack>
          ) : (
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