import React, { useState, useMemo } from 'react'
import {
  Table,
  ScrollArea,
  Group,
  Text,
  ActionIcon,
  Image,
  Badge,
  Tooltip,
  TextInput,
  Box,
  Stack,
  Paper,
  Select,
  Switch,
  createStyles,
  rem,
  Center,
  UnstyledButton,
  useMantineTheme
} from '@mantine/core'
import {
  IconEdit,
  IconTrash,
  IconSearch,
  IconCoins,
  IconArrowRight,
  IconSortAscending,
  IconSortDescending,
  IconFilter,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconSelector,
  IconChartHistogram,
  IconHeartFilled,
  IconHeart
} from '@tabler/icons-react'
import MiniChart from '../../../components/charts/MiniChart.jsx'
import { formatNumber } from '../../../utils/utils.jsx'
import { trpc } from '../../../utils/trpc.jsx'

const useStyles = createStyles((theme) => ({
  th: {
    padding: '0 !important'
  },

  control: {
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    transition: 'background-color 0.2s ease-out',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
    }
  },

  icon: {
    width: rem(21),
    height: rem(21),
    borderRadius: rem(21)
  },

  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease',
    zIndex: 2,

    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderBottom: `${rem(1)} solid ${
        theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[2]
      }`
    }
  },

  scrolled: {
    boxShadow: theme.shadows.sm
  }
}))

function Th({ children, reversed, sorted, onSort }) {
  const { classes } = useStyles()
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector
  return (
    <th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group position="apart">
          <Text fz="sm">
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon size="0.9rem" stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </th>
  )
}

function RecipeRow({ recipe, onEdit, onDelete, isDeleting, allItems, items, onToggleFavorite, favoriteItemIds = new Set() }) {
  const theme = useMantineTheme()
  const isFavorite = favoriteItemIds.has(recipe.id)
  
  const calculateProfit = () => {
    if (!allItems || !recipe.ingredients) return null
    
    let totalCost = recipe.conversionCost || 0
    
    recipe.ingredients.forEach(ingredient => {
      const item = allItems[ingredient.itemId]
      if (item && item.low) {
        totalCost += (item.low * ingredient.quantity)
      }
    })
    
    const outputItem = allItems[recipe.outputItemId]
    const sellPrice = outputItem?.high || 0
    
    const grossProfit = sellPrice - totalCost
    const netProfit = Math.floor(grossProfit * 0.99)
    
    return {
      totalCost,
      sellPrice,
      grossProfit,
      netProfit,
      marginPercentage: totalCost > 0 ? (grossProfit / totalCost) * 100 : 0
    }
  }

  const profit = calculateProfit()

  const getItemImageUrl = (itemId) => {
    const item = items?.find(item => item.id === itemId)
    if (item?.icon) {
      return `https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`
    }
    return `https://oldschool.runescape.wiki/images/c/c1/${itemId}.png`
  }

  return (
    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
        <Center>
          <Image
            height={32}
            width={32}
            src={getItemImageUrl(recipe.outputItemId)}
            withPlaceholder
            style={{ imageRendering: 'pixelated' }}
          />
        </Center>
      </td>

      <td style={{ padding: '12px 8px' }}>
        <Text size="sm" weight={500} color="white">
          {recipe.outputItemName}
        </Text>
        <Text size="xs" color="dimmed" lineClamp={1}>
          Recipe with {recipe.ingredients?.length || 0} ingredient{(recipe.ingredients?.length || 0) !== 1 ? 's' : ''}
        </Text>
      </td>
      
      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
        <Text size="sm" weight={500} color="white">
          {profit ? formatNumber(profit.totalCost) : 'N/A'}
        </Text>
        <Text size="xs" color="dimmed">
          GP
        </Text>
      </td>

      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
        <Text size="sm" weight={500} color="white">
          {profit && profit.sellPrice > 0 ? formatNumber(profit.sellPrice) : 'N/A'}
        </Text>
        <Text size="xs" color="dimmed">
          GP
        </Text>
      </td>
      
      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
        <Group spacing={4} position="right" noWrap>
          <IconCoins size={14} color={profit?.netProfit > 0 ? theme.colors.green[5] : theme.colors.red[5]} />
          <Text
            size="sm"
            weight={600}
            color={profit?.netProfit > 0 ? 'green' : 'red'}
          >
            {profit ? formatNumber(profit.netProfit) : 'N/A'}
          </Text>
        </Group>
        <Text size="xs" color="dimmed">
          {profit ? `${profit.marginPercentage.toFixed(1)}%` : '0%'}
        </Text>
      </td>
      
      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
        <MiniChart itemId={recipe.outputItemId} width={120} height={40} currentPrice={profit?.sellPrice || 0} />
      </td>
      
      <td style={{ padding: '12px 8px' }}>
        <Group spacing="xs" noWrap>
          <ActionIcon
            size="sm"
            color="red"
            variant={isFavorite ? 'filled' : 'subtle'}
            onClick={() => onToggleFavorite?.(recipe.id)}
          >
            {isFavorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="blue"
            size="sm"
          >
            <IconChartHistogram size={16} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            color="blue"
            variant="subtle"
            onClick={() => onEdit(recipe)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            color="red"
            variant="subtle"
            loading={isDeleting}
            onClick={() => onDelete(recipe.id)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </td>
    </tr>
  )
}

export default function RecipesTable({ recipes, items, onEdit, onDelete, isDeleting }) {
  const { classes, cx } = useStyles()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('profit')
  const [reverseSortDirection, setReverseSortDirection] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  
  // Fetch current items data for profit calculations
  const { data: allItems } = trpc.items.getAllItems.useQuery()

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    setSortBy('profit')
    setReverseSortDirection(true)
  }

  // Check if any filters are active
  const hasActiveFilters = search || sortBy !== 'profit'

  // Calculate profit for a recipe
  const calculateRecipeProfit = (recipe) => {
    if (!allItems || !recipe.ingredients) return null
    
    let totalCost = recipe.conversionCost || 0
    
    // Add up ingredient costs (using low price to buy)
    recipe.ingredients.forEach(ingredient => {
      const item = allItems[ingredient.itemId]
      if (item && item.low) {
        totalCost += (item.low * ingredient.quantity)
      }
    })
    
    // Get output item sell price (using high price to sell)
    const outputItem = allItems[recipe.outputItemId]
    const sellPrice = outputItem?.high || 0
    
    // Calculate profit after 1% GE tax
    const grossProfit = sellPrice - totalCost
    const netProfit = Math.floor(grossProfit * 0.99) // 1% GE tax
    
    return {
      totalCost,
      sellPrice,
      grossProfit,
      netProfit,
      marginPercentage: totalCost > 0 ? (grossProfit / totalCost) * 100 : 0
    }
  }

  // Sorting function
  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false
    setReverseSortDirection(reversed)
    setSortBy(field)
  }

  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    if (!recipes) return []

    // Filter by search
    let filtered = recipes.filter(recipe =>
      recipe.outputItemName.toLowerCase().includes(search.toLowerCase()) ||
      recipe.ingredients?.some(ingredient =>
        ingredient.itemName.toLowerCase().includes(search.toLowerCase())
      )
    )

    // Sort recipes
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'profit':
          const aProfitData = calculateRecipeProfit(a)
          const bProfitData = calculateRecipeProfit(b)
          aValue = aProfitData?.netProfit || 0
          bValue = bProfitData?.netProfit || 0
          break
        case 'sellPrice':
          const aSellPrice = calculateRecipeProfit(a)?.sellPrice || 0
          const bSellPrice = calculateRecipeProfit(b)?.sellPrice || 0
          aValue = aSellPrice
          bValue = bSellPrice
          break
        case 'name':
          aValue = a.outputItemName.toLowerCase()
          bValue = b.outputItemName.toLowerCase()
          break
        default:
          return 0
      }

      if (reverseSortDirection) {
        return aValue < bValue ? 1 : -1
      } else {
        return aValue > bValue ? 1 : -1
      }
    })

    return filtered
  }, [recipes, search, sortBy, reverseSortDirection, allItems])

  return (
    <Paper withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
      {/* Filters and Search */}
      <Box p="md" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Stack spacing="md">
          {/* Search and Sort Row */}
          <Group spacing="md" sx={(theme) => ({
            [theme.fn.smallerThan('sm')]: {
              flexDirection: 'column',
              alignItems: 'stretch'
            }
          })}>
            <TextInput
              placeholder="Search recipes..."
              icon={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              sx={(theme) => ({
                minWidth: 300,
                maxWidth: 400,
                [theme.fn.smallerThan('sm')]: {
                  minWidth: 'unset',
                  maxWidth: 'unset',
                  width: '100%'
                }
              })}
            />
            <Group spacing="xs" sx={(theme) => ({
              [theme.fn.smallerThan('sm')]: {
                width: '100%'
              }
            })}>
              <Select
                placeholder="Sort by"
                icon={<IconFilter size={16} />}
                data={[
                  { value: 'profit', label: 'Profit' },
                  { value: 'name', label: 'Recipe Name' },
                  { value: 'sellPrice', label: 'Sell Price' }
                ]}
                value={sortBy}
                onChange={setSortBy}
                sx={(theme) => ({
                  minWidth: 150,
                  [theme.fn.smallerThan('sm')]: {
                    flex: 1,
                    minWidth: 'unset'
                  }
                })}
              />
            </Group>
          </Group>
          
          {/* Filters Row */}
          <Group spacing="md" sx={(theme) => ({
            [theme.fn.smallerThan('sm')]: {
              flexDirection: 'column',
              alignItems: 'stretch'
            }
          })}>
            <Badge variant="outline" size="sm" sx={(theme) => ({
              [theme.fn.smallerThan('sm')]: {
                alignSelf: 'flex-start'
              }
            })}>
              {filteredAndSortedRecipes.length} {filteredAndSortedRecipes.length === 1 ? 'recipe' : 'recipes'}
            </Badge>
            {hasActiveFilters && (
              <Tooltip label="Clear all filters">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={clearFilters}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Stack>
      </Box>

      {/* Table */}
      <ScrollArea 
        h={600}
        onScrollPositionChange={({ y }) => setScrolled(y !== 0)}
      >
        <Table sx={{ minWidth: 800 }} verticalSpacing="xs">
          <thead className={cx(classes.header, { [classes.scrolled]: scrolled })}>
            <tr>
              <th className={classes.th}><Text fz="sm">Item</Text></th>
              <Th 
                sorted={sortBy === 'name'} 
                reversed={reverseSortDirection} 
                onSort={() => setSorting('name')}
              >
                Name
              </Th>
              <th className={classes.th}><Text fz="sm">Buy Price</Text></th>
              <Th 
                sorted={sortBy === 'sellPrice'} 
                reversed={reverseSortDirection} 
                onSort={() => setSorting('sellPrice')}
              >
                Sell Price
              </Th>
              <Th 
                sorted={sortBy === 'profit'} 
                reversed={reverseSortDirection} 
                onSort={() => setSorting('profit')}
              >
                Profit
              </Th>
              <th className={classes.th}><Text fz="sm">Chart</Text></th>
              <th className={classes.th}><Text fz="sm">Actions</Text></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRecipes.map((recipe) => (
              <RecipeRow
                key={recipe.id}
                recipe={recipe}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={isDeleting}
                allItems={allItems}
                items={items}
              />
            ))}
          </tbody>
        </Table>
      </ScrollArea>

      {filteredAndSortedRecipes.length === 0 && (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text color="dimmed">
            {search ? 'No recipes match your filters.' : 'No recipes found.'}
          </Text>
        </Box>
      )}
    </Paper>
  )
}