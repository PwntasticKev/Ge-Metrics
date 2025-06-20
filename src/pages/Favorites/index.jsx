import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Table,
  Tabs,
  Grid,
  ActionIcon,
  ScrollArea,
  Alert,
  Tooltip,
  ThemeIcon,
  Center,
  Stack,
  Select,
  TextInput,
  Switch
} from '@mantine/core'
import {
  IconHeart,
  IconHeartFilled,
  IconTrendingUp,
  IconTrendingDown,
  IconActivity,
  IconCoins,
  IconStar,
  IconEye,
  IconSearch,
  IconFilter,
  IconRefresh,
  IconSortAscending,
  IconSortDescending
} from '@tabler/icons-react'

export default function Favorites () {
  const [favoriteItems, setFavoriteItems] = useState([])
  const [favoriteCombinations, setFavoriteCombinations] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showOnlyProfitable, setShowOnlyProfitable] = useState(false)

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = () => {
    // Load from localStorage
    const storedItemFavorites = JSON.parse(localStorage.getItem('favoriteItems') || '[]')
    const storedCombinationFavorites = JSON.parse(localStorage.getItem('favoriteCombinations') || '[]')

    // Simulate item data for favorites
    const itemData = [
      { id: 1, name: 'Dragon Bones', currentPrice: 2850, avgPrice: 2800, profit: 150, volume: 12500, change: 5.2 },
      { id: 2, name: 'Ranarr Weed', currentPrice: 7200, avgPrice: 7100, profit: 300, volume: 8900, change: -2.1 },
      { id: 3, name: 'Magic Logs', currentPrice: 1250, avgPrice: 1200, profit: 80, volume: 15600, change: 8.3 },
      { id: 4, name: 'Rune Ore', currentPrice: 11500, avgPrice: 11200, profit: 450, volume: 3200, change: 12.1 },
      { id: 5, name: 'Shark', currentPrice: 890, avgPrice: 850, profit: 65, volume: 22000, change: -1.8 }
    ]

    const combinationData = [
      {
        id: 1,
        name: 'Ranarr Potion',
        ingredients: ['Ranarr Weed', 'Vial of Water'],
        cost: 7300,
        sellPrice: 8200,
        profit: 900,
        volume: 4500,
        change: 3.2
      },
      {
        id: 2,
        name: 'Magic Longbow',
        ingredients: ['Magic Logs', 'Bowstring'],
        cost: 1400,
        sellPrice: 1850,
        profit: 450,
        volume: 2800,
        change: -0.5
      },
      {
        id: 3,
        name: 'Rune Platebody',
        ingredients: ['Rune Bar x5'],
        cost: 57500,
        sellPrice: 62000,
        profit: 4500,
        volume: 890,
        change: 6.7
      }
    ]

    // Filter by favorites
    const favoriteItemsData = itemData.filter(item => storedItemFavorites.includes(item.id))
    const favoriteCombinationsData = combinationData.filter(combo => storedCombinationFavorites.includes(combo.id))

    setFavoriteItems(favoriteItemsData)
    setFavoriteCombinations(favoriteCombinationsData)
  }

  const toggleItemFavorite = (itemId) => {
    const currentFavorites = JSON.parse(localStorage.getItem('favoriteItems') || '[]')
    let newFavorites

    if (currentFavorites.includes(itemId)) {
      newFavorites = currentFavorites.filter(id => id !== itemId)
    } else {
      newFavorites = [...currentFavorites, itemId]
    }

    localStorage.setItem('favoriteItems', JSON.stringify(newFavorites))
    loadFavorites()
  }

  const toggleCombinationFavorite = (comboId) => {
    const currentFavorites = JSON.parse(localStorage.getItem('favoriteCombinations') || '[]')
    let newFavorites

    if (currentFavorites.includes(comboId)) {
      newFavorites = currentFavorites.filter(id => id !== comboId)
    } else {
      newFavorites = [...currentFavorites, comboId]
    }

    localStorage.setItem('favoriteCombinations', JSON.stringify(newFavorites))
    loadFavorites()
  }

  const getAllFavorites = () => {
    const allItems = favoriteItems.map(item => ({ ...item, type: 'item' }))
    const allCombos = favoriteCombinations.map(combo => ({ ...combo, type: 'combination' }))
    return [...allItems, ...allCombos]
  }

  const getFilteredData = (data) => {
    let filtered = data

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Profitability filter
    if (showOnlyProfitable) {
      filtered = filtered.filter(item => item.profit > 0)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }

  const getProfitColor = (profit) => {
    if (profit > 0) return 'green'
    if (profit < 0) return 'red'
    return 'gray'
  }

  const getChangeColor = (change) => {
    if (change > 0) return 'green'
    if (change < 0) return 'red'
    return 'gray'
  }

  const getTotalStats = () => {
    const allFavorites = getAllFavorites()
    return {
      totalItems: favoriteItems.length,
      totalCombinations: favoriteCombinations.length,
      totalProfitPotential: allFavorites.reduce((sum, item) => sum + (item.profit || 0), 0),
      avgProfit: allFavorites.length > 0 ? Math.round(allFavorites.reduce((sum, item) => sum + (item.profit || 0), 0) / allFavorites.length) : 0
    }
  }

  const stats = getTotalStats()

  return (
    <Container size="xl" py="md">
      <Group position="apart" mb="lg">
        <div>
          <Title order={1} gradient={{ from: 'red', to: 'pink' }} variant="gradient">
            <Group spacing="xs">
              <IconHeart size={32} />
              My Favorites
            </Group>
          </Title>
          <Text color="dimmed" size="lg" mt="xs">
            Track your favorite items and combinations for easy access
          </Text>
        </div>
        <Group>
          <ActionIcon
            variant="gradient"
            gradient={{ from: 'red', to: 'pink' }}
            size="lg"
            onClick={loadFavorites}
          >
            <IconRefresh size={20} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Overview Cards */}
      <Grid mb="lg">
        <Grid.Col span={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Favorite Items
                </Text>
                <Text size="xl" weight={700}>
                  {stats.totalItems}
                </Text>
              </div>
              <ThemeIcon color="blue" variant="light" size="lg">
                <IconActivity size={20} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Combinations
                </Text>
                <Text size="xl" weight={700}>
                  {stats.totalCombinations}
                </Text>
              </div>
              <ThemeIcon color="purple" variant="light" size="lg">
                <IconStar size={20} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Total Profit Potential
                </Text>
                <Text size="xl" weight={700}>
                  {stats.totalProfitPotential.toLocaleString()}gp
                </Text>
              </div>
              <ThemeIcon color="green" variant="light" size="lg">
                <IconCoins size={20} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Group position="apart">
              <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                  Average Profit
                </Text>
                <Text size="xl" weight={700}>
                  {stats.avgProfit.toLocaleString()}gp
                </Text>
              </div>
              <ThemeIcon color="yellow" variant="light" size="lg">
                <IconTrendingUp size={20} />
              </ThemeIcon>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Card withBorder mb="md">
        <Grid>
          <Grid.Col span={4}>
            <TextInput
              placeholder="Search favorites..."
              icon={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <Select
              placeholder="Sort by"
              icon={<IconFilter size={16} />}
              value={sortBy}
              onChange={setSortBy}
              data={[
                { value: 'name', label: 'Name' },
                { value: 'profit', label: 'Profit' },
                { value: 'currentPrice', label: 'Price' },
                { value: 'volume', label: 'Volume' },
                { value: 'change', label: 'Change %' }
              ]}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <Button
              variant="outline"
              fullWidth
              leftIcon={sortOrder === 'asc' ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </Grid.Col>
          <Grid.Col span={2}>
            <Switch
              label="Profitable only"
              checked={showOnlyProfitable}
              onChange={(e) => setShowOnlyProfitable(e.currentTarget.checked)}
            />
          </Grid.Col>
          <Grid.Col span={2}>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setSearchQuery('')
                setSortBy('name')
                setSortOrder('asc')
                setShowOnlyProfitable(false)
              }}
            >
              Clear Filters
            </Button>
          </Grid.Col>
        </Grid>
      </Card>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all" icon={<IconHeart size={14} />}>
            All Favorites ({favoriteItems.length + favoriteCombinations.length})
          </Tabs.Tab>
          <Tabs.Tab value="items" icon={<IconActivity size={14} />}>
            Items ({favoriteItems.length})
          </Tabs.Tab>
          <Tabs.Tab value="combinations" icon={<IconStar size={14} />}>
            Combinations ({favoriteCombinations.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="all" pt="md">
          <Card withBorder>
            {getAllFavorites().length === 0
              ? (
              <Center py="xl">
                <Stack align="center" spacing="md">
                  <ThemeIcon size="xl" color="gray" variant="light">
                    <IconHeart size={32} />
                  </ThemeIcon>
                  <div style={{ textAlign: 'center' }}>
                    <Text size="lg" weight={500} color="dimmed">No favorites yet</Text>
                    <Text size="sm" color="dimmed">
                      Start adding items and combinations to your favorites to track them here
                    </Text>
                  </div>
                </Stack>
              </Center>
                )
              : (
              <ScrollArea>
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Price/Cost</th>
                      <th>Profit</th>
                      <th>Volume</th>
                      <th>Change</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(getAllFavorites()).map((item) => (
                      <tr key={`${item.type}-${item.id}`}>
                        <td>
                          <Badge color={item.type === 'item' ? 'blue' : 'purple'} size="sm">
                            {item.type === 'item' ? 'Item' : 'Combination'}
                          </Badge>
                        </td>
                        <td>
                          <div>
                            <Text size="sm" weight={500}>{item.name}</Text>
                            {item.type === 'combination' && item.ingredients && (
                              <Text size="xs" color="dimmed">
                                {item.ingredients.join(', ')}
                              </Text>
                            )}
                          </div>
                        </td>
                        <td>
                          <Text size="sm">
                            {item.type === 'item' ? item.currentPrice?.toLocaleString() : item.cost?.toLocaleString()}gp
                          </Text>
                        </td>
                        <td>
                          <Text size="sm" color={getProfitColor(item.profit)} weight={500}>
                            {item.profit > 0 ? '+' : ''}{item.profit?.toLocaleString()}gp
                          </Text>
                        </td>
                        <td>
                          <Text size="sm">{item.volume?.toLocaleString()}</Text>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <Text size="sm" color={getChangeColor(item.change)}>
                              {item.change > 0 ? '+' : ''}{item.change?.toFixed(1)}%
                            </Text>
                            {item.change > 0
                              ? <IconTrendingUp size={14} color="green" />
                              : <IconTrendingDown size={14} color="red" />
                            }
                          </Group>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="light"
                              onClick={() => item.type === 'item' ? toggleItemFavorite(item.id) : toggleCombinationFavorite(item.id)}
                            >
                              <IconHeartFilled size={14} />
                            </ActionIcon>
                            <ActionIcon size="sm" color="blue" variant="light">
                              <IconEye size={14} />
                            </ActionIcon>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
                )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="items" pt="md">
          <Card withBorder>
            {favoriteItems.length === 0
              ? (
              <Center py="xl">
                <Stack align="center" spacing="md">
                  <ThemeIcon size="xl" color="gray" variant="light">
                    <IconActivity size={32} />
                  </ThemeIcon>
                  <div style={{ textAlign: 'center' }}>
                    <Text size="lg" weight={500} color="dimmed">No favorite items</Text>
                    <Text size="sm" color="dimmed">
                      Visit the All Items page to add items to your favorites
                    </Text>
                  </div>
                </Stack>
              </Center>
                )
              : (
              <ScrollArea>
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Current Price</th>
                      <th>Average Price</th>
                      <th>Profit</th>
                      <th>Volume</th>
                      <th>Change</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(favoriteItems).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Text size="sm" weight={500}>{item.name}</Text>
                        </td>
                        <td>
                          <Text size="sm">{item.currentPrice?.toLocaleString()}gp</Text>
                        </td>
                        <td>
                          <Text size="sm" color="dimmed">{item.avgPrice?.toLocaleString()}gp</Text>
                        </td>
                        <td>
                          <Text size="sm" color={getProfitColor(item.profit)} weight={500}>
                            {item.profit > 0 ? '+' : ''}{item.profit?.toLocaleString()}gp
                          </Text>
                        </td>
                        <td>
                          <Text size="sm">{item.volume?.toLocaleString()}</Text>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <Text size="sm" color={getChangeColor(item.change)}>
                              {item.change > 0 ? '+' : ''}{item.change?.toFixed(1)}%
                            </Text>
                            {item.change > 0
                              ? <IconTrendingUp size={14} color="green" />
                              : <IconTrendingDown size={14} color="red" />
                            }
                          </Group>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="light"
                              onClick={() => toggleItemFavorite(item.id)}
                            >
                              <IconHeartFilled size={14} />
                            </ActionIcon>
                            <ActionIcon size="sm" color="blue" variant="light">
                              <IconEye size={14} />
                            </ActionIcon>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
                )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="combinations" pt="md">
          <Card withBorder>
            {favoriteCombinations.length === 0
              ? (
              <Center py="xl">
                <Stack align="center" spacing="md">
                  <ThemeIcon size="xl" color="gray" variant="light">
                    <IconStar size={32} />
                  </ThemeIcon>
                  <div style={{ textAlign: 'center' }}>
                    <Text size="lg" weight={500} color="dimmed">No favorite combinations</Text>
                    <Text size="sm" color="dimmed">
                      Visit the Combination Items page to add combinations to your favorites
                    </Text>
                  </div>
                </Stack>
              </Center>
                )
              : (
              <ScrollArea>
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Ingredients</th>
                      <th>Cost</th>
                      <th>Sell Price</th>
                      <th>Profit</th>
                      <th>Volume</th>
                      <th>Change</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredData(favoriteCombinations).map((combo) => (
                      <tr key={combo.id}>
                        <td>
                          <Text size="sm" weight={500}>{combo.name}</Text>
                        </td>
                        <td>
                          <Text size="xs" color="dimmed">
                            {combo.ingredients?.join(', ')}
                          </Text>
                        </td>
                        <td>
                          <Text size="sm">{combo.cost?.toLocaleString()}gp</Text>
                        </td>
                        <td>
                          <Text size="sm">{combo.sellPrice?.toLocaleString()}gp</Text>
                        </td>
                        <td>
                          <Text size="sm" color={getProfitColor(combo.profit)} weight={500}>
                            {combo.profit > 0 ? '+' : ''}{combo.profit?.toLocaleString()}gp
                          </Text>
                        </td>
                        <td>
                          <Text size="sm">{combo.volume?.toLocaleString()}</Text>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <Text size="sm" color={getChangeColor(combo.change)}>
                              {combo.change > 0 ? '+' : ''}{combo.change?.toFixed(1)}%
                            </Text>
                            {combo.change > 0
                              ? <IconTrendingUp size={14} color="green" />
                              : <IconTrendingDown size={14} color="red" />
                            }
                          </Group>
                        </td>
                        <td>
                          <Group spacing="xs">
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="light"
                              onClick={() => toggleCombinationFavorite(combo.id)}
                            >
                              <IconHeartFilled size={14} />
                            </ActionIcon>
                            <ActionIcon size="sm" color="blue" variant="light">
                              <IconEye size={14} />
                            </ActionIcon>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
                )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {getAllFavorites().length > 0 && (
        <Alert color="blue" mt="md">
          <Text size="sm">
            💡 <strong>Tip:</strong> Your favorites are automatically saved and will persist between sessions.
            Use the heart icon on any item or combination page to add/remove favorites.
          </Text>
        </Alert>
      )}
    </Container>
  )
}
