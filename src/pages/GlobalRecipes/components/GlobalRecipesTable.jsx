import { useEffect, useState } from 'react'
import {
  Center,
  createStyles,
  Flex,
  Group,
  Image,
  rem,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
  ActionIcon
} from '@mantine/core'
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconSelector,
  IconChartHistogram,
  IconEdit
} from '@tabler/icons-react'
import MiniChart from '../../../components/charts/MiniChart.jsx'
import { useMediaQuery } from '@mantine/hooks'
import { formatNumber, calculateGETax } from '../../../utils/utils.jsx'
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
  },

  image: {
    maxWidth: '40%',

    [theme.fn.smallerThan('sm')]: {
      maxWidth: '100%'
    }
  }
}))

function Th ({ children, reversed, sorted, onSort }) {
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
            <Icon size="0.9rem" stroke={1.5}/>
          </Center>
        </Group>
      </UnstyledButton>
    </th>
  )
}

function filterData (data, search) {
  const query = search.toLowerCase().trim()
  return data.filter((recipe) =>
    recipe && Object.keys(recipe).some((key) => {
      const value = recipe[key]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query)
      }
      return false
    })
  )
}

function sortData (data, payload) {
  const { sortBy, reversed, search } = payload

  if (!sortBy) {
    return filterData(data, search)
  }

  return filterData(
    [...data].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Handle profit and sellPrice specifically for numeric sorting
      if (sortBy === 'profit' || sortBy === 'sellPrice') {
        aValue = parseFloat(String(aValue ?? '0').replace(/,/g, '')) || 0
        bValue = parseFloat(String(bValue ?? '0').replace(/,/g, '')) || 0
      }

      // Handle username sorting
      if (sortBy === 'username') {
        aValue = String(aValue || '').toLowerCase()
        bValue = String(bValue || '').toLowerCase()
        if (reversed) {
          return bValue.localeCompare(aValue)
        }
        return aValue.localeCompare(bValue)
      }

      // Handle numeric comparisons
      if (reversed) {
        return bValue - aValue // Descending
      }
      return aValue - bValue // Ascending
    }),
    search
  )
}

export function GlobalRecipesTable({ data, items, setGraphInfo, onEdit }) {
  const theme = useMantineTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  const { classes, cx } = useStyles()
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data || [])
  const [sortBy, setSortBy] = useState(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)

  // No pagination - show all data

  // Get current items data for profit calculations
  const { data: allItems } = trpc.items.getAllItems.useQuery()

  const calculateRecipeProfit = (recipe) => {
    if (!allItems || !recipe.ingredients) return { profit: 0, sellPrice: 0 }
    
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
    
    // Calculate profit after GE tax
    const tax = calculateGETax(sellPrice)
    const grossProfit = sellPrice - totalCost
    const netProfit = grossProfit - tax
    
    return {
      profit: netProfit,
      sellPrice
    }
  }

  const currentPageData = sortedData

  useEffect(() => {
    if (data) {
      // Keep the search term intact when new data is grabbed
      setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search }))
    }
  }, [data, sortBy, reverseSortDirection, search])

  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : field !== 'profit'
    setReverseSortDirection(reversed)
    setSortBy(field)
    setSortedData(sortData(sortedData, { sortBy: field, reversed, search }))
  }

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget
    const searchValue = value || ''
    setSearch(searchValue)
    setSortedData(sortData(data || [], { sortBy, reversed: reverseSortDirection, search: searchValue }))
  }

  const shouldResetField = () => {
    setSearch('')
  }

  const getItemImageUrl = (itemId) => {
    const item = items?.find(item => item.id === itemId)
    if (item?.icon) {
      return `https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`
    }
    return `https://oldschool.runescape.wiki/images/c/c1/${itemId}.png`
  }

  const rows = currentPageData
    .filter(recipe => recipe && typeof recipe.profit !== 'undefined' && Array.isArray(recipe.ingredients))
    .map((recipe, idx) => {
      const { profit, sellPrice } = calculateRecipeProfit(recipe)
      const profitValue = Number(profit)
      
      return (
        <tr key={recipe.id || idx} style={{ verticalAlign: 'middle' }}>
          <td colSpan={1} style={{ verticalAlign: 'middle', padding: '8px' }}>
            <Image
              className={classes.image}
              fit="contain"
              height={32}
              width={32}
              placeholder={
                <Text align="center">Not available</Text>
              }
              src={getItemImageUrl(recipe.outputItemId)}
              withPlaceholder
              style={{ 
                imageRendering: 'pixelated',
                objectFit: 'contain'
              }}
            />
          </td>

          <td style={{ verticalAlign: 'middle', padding: '8px' }}>
            <div>
              <Text size="xs" color="white" weight={500}>
                {new Intl.NumberFormat().format(allItems?.[recipe.outputItemId]?.low || 0)}
              </Text>
              <Text size="sm" weight={500}>
                {recipe.outputItemName}
              </Text>
            </div>
          </td>

          <td colSpan={2} style={{ verticalAlign: 'middle', padding: '8px' }}>
            {recipe.ingredients.filter(Boolean).map((ingredient, idx) => (
              <Flex key={idx}>
                <Tooltip label={
                  ingredient.quantity
                    ? `${ingredient.itemName} (${ingredient.quantity})`
                    : ingredient.itemName
                } position="left">
                  <div>
                    <Image 
                      fit="contain" 
                      width={25} 
                      height={25} 
                      src={getItemImageUrl(ingredient.itemId)}
                      style={{ 
                        marginRight: '8px',
                        imageRendering: 'pixelated',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </Tooltip>
                <div>
                  {new Intl.NumberFormat().format(allItems?.[ingredient.itemId]?.low || 0)}
                  {ingredient.quantity > 1 && (
                    <Text component="span" size="6px" color="dimmed" style={{ marginLeft: '4px' }}>({ingredient.quantity})</Text>
                  )}
                </div>
              </Flex>
            ))}
          </td>

          <td style={{ verticalAlign: 'middle', padding: '8px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {new Intl.NumberFormat().format(allItems?.[recipe.outputItemId]?.high || 0)}
              <Text 
                size="xs" 
                color="red" 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: '0', 
                  whiteSpace: 'nowrap',
                  fontSize: '9px',
                  pointerEvents: 'none'
                }}
              >
                (-{new Intl.NumberFormat().format(calculateGETax(allItems?.[recipe.outputItemId]?.high || 0))} tax)
              </Text>
            </div>
          </td>

          <td style={{
            color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
            fontWeight: 'bold',
            verticalAlign: 'middle',
            padding: '8px'
          }}>
            {new Intl.NumberFormat().format(profit)}
          </td>

          <td style={{ verticalAlign: 'middle', padding: '8px' }}>
            <MiniChart itemId={recipe.outputItemId} width={120} height={40} currentPrice={allItems?.[recipe.outputItemId]?.high || 0} />
          </td>

          <td style={{ verticalAlign: 'middle', padding: '8px' }}>
            <Text size="sm" weight={500}>
              {recipe.username || 'Unknown'}
            </Text>
          </td>

          <td style={{ verticalAlign: 'middle', padding: '8px' }}>
            <Flex gap="xs">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => setGraphInfo?.({ open: true, item: { id: recipe.outputItemId, items } })}
                size={isMobile ? 'sm' : 'md'}
              >
                <IconChartHistogram size={isMobile ? 14 : 16} />
              </ActionIcon>
              {onEdit && (
                <ActionIcon
                  variant="light"
                  color="yellow"
                  onClick={() => onEdit(recipe)}
                  size={isMobile ? 'sm' : 'md'}
                >
                  <IconEdit size={isMobile ? 14 : 16} />
                </ActionIcon>
              )}
            </Flex>
          </td>
        </tr>
      )
    })

  return (
    <>
      <TextInput
        placeholder="Search by any field"
        mb="md"
        icon={<IconSearch size="0.9rem" stroke={1.5}/>}
        value={search}
        onChange={handleSearchChange}
        onClick={shouldResetField}
      />
      <ScrollArea>
        <Table sx={{ minWidth: 800 }} verticalSpacing="xs" highlightOnHover>
          <thead className={cx(classes.header, classes.scrolled)}>
            <tr>
              <th colSpan={1}>Img</th>
              <th>Name</th>
              <th colSpan={2}>Items</th>
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
              <th>Chart</th>
              <Th
                sorted={sortBy === 'username'}
                reversed={reverseSortDirection}
                onSort={() => setSorting('username')}
              >
                User
              </Th>
              <th>Settings</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0
              ? (
                  rows
                )
              : (
                <tr>
                  <td colSpan={9}>
                    <Text weight={500} align="center">
                      Nothing found
                    </Text>
                  </td>
                </tr>
              )}
          </tbody>
        </Table>
      </ScrollArea>
    </>
  )
}

export default GlobalRecipesTable