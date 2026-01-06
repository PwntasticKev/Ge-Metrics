import React, { useState } from 'react'
import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Button,
  Alert,
  ActionIcon,
  Tooltip,
  Select,
  TextInput,
  Table,
  ScrollArea,
  Paper,
  Stack,
  Image
} from '@mantine/core'
import {
  IconClock,
  IconRefresh,
  IconInfoCircle,
  IconEdit,
  IconTrash,
  IconSearch,
  IconFilter
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { formatNumber, getRelativeTime } from '../../utils/utils.jsx'

function AdminRecipeRow({ recipe, onEdit, onDelete, isDeleting, allItems }) {
  // Calculate recipe profitability
  const calculateProfit = () => {
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

  const profit = calculateProfit()

  const getItemImageUrl = (itemId) => {
    return `https://oldschool.runescape.wiki/images/c/c1/${itemId}.png`
  }

  return (
    <tr>
      <td>
        <Group spacing="xs">
          <Image
            src={getItemImageUrl(recipe.outputItemId)}
            width={32}
            height={32}
            fit="contain"
            withPlaceholder
            style={{ imageRendering: 'pixelated' }}
          />
          <div>
            <Text size="sm" weight={500}>
              {recipe.outputItemName}
            </Text>
            <Text size="xs" color="dimmed">
              ID: {recipe.outputItemId}
            </Text>
          </div>
        </Group>
      </td>
      
      <td>
        <div>
          <Text size="sm" weight={500}>
            {recipe.username}
          </Text>
          <Text size="xs" color="dimmed">
            {recipe.userEmail}
          </Text>
        </div>
      </td>

      <td>
        <Stack spacing={2}>
          {recipe.ingredients?.slice(0, 2).map((ingredient, index) => (
            <Group key={index} spacing="xs">
              <Image
                src={getItemImageUrl(ingredient.itemId)}
                width={16}
                height={16}
                fit="contain"
                withPlaceholder
                style={{ imageRendering: 'pixelated' }}
              />
              <Text size="xs">
                {ingredient.quantity}x {ingredient.itemName}
              </Text>
            </Group>
          ))}
          {recipe.ingredients && recipe.ingredients.length > 2 && (
            <Text size="xs" color="dimmed">
              +{recipe.ingredients.length - 2} more...
            </Text>
          )}
        </Stack>
      </td>

      <td>
        {profit && profit.netProfit !== null ? (
          <Group spacing="xs">
            <Text
              size="sm"
              weight={600}
              color={profit.netProfit > 0 ? 'green' : profit.netProfit < 0 ? 'red' : 'gray'}
            >
              {profit.netProfit > 0 ? '+' : ''}{formatNumber(profit.netProfit)} GP
            </Text>
            <Badge
              size="xs"
              color={profit.marginPercentage > 0 ? 'green' : 'red'}
              variant="outline"
            >
              {profit.marginPercentage.toFixed(1)}%
            </Badge>
          </Group>
        ) : (
          <Text size="sm" color="dimmed">N/A</Text>
        )}
      </td>

      <td>
        <Text size="xs" color="dimmed">
          {new Date(recipe.createdAt).toLocaleDateString()}
        </Text>
      </td>

      <td>
        <Group spacing="xs">
          <Tooltip label="Edit Recipe Globally">
            <ActionIcon
              size="sm"
              color="blue"
              onClick={() => onEdit(recipe)}
            >
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Recipe Globally">
            <ActionIcon
              size="sm"
              color="red"
              loading={isDeleting}
              onClick={() => onDelete(recipe.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </td>
    </tr>
  )
}

export default function GlobalRecipes() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Fetch all recipes (admin only)
  const { 
    data: allRecipes, 
    isLoading, 
    error, 
    refetch: refetchRecipes 
  } = trpc.recipes.getAllRecipes.useQuery({
    limit: 100,
    offset: 0,
    sortBy,
    sortOrder
  })

  // Get global recipe stats
  const { data: globalStats } = trpc.recipes.getGlobalRecipeStats.useQuery()

  // Get current items data for profit calculations
  const { data: allItems } = trpc.items.getAllItems.useQuery()

  // Delete recipe mutation (admin)
  const deleteRecipeGloballyMutation = trpc.recipes.deleteRecipeGlobally.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'Recipe deleted globally',
        color: 'green'
      })
      refetchRecipes()
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  })

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe globally? This will remove it for all users and cannot be undone.')) {
      await deleteRecipeGloballyMutation.mutateAsync({ id: recipeId })
    }
  }

  const handleEditRecipe = (recipe) => {
    // For now, show notification that edit is not implemented in this version
    showNotification({
      title: 'Feature Coming Soon',
      message: 'Global recipe editing will be available in a future update',
      color: 'blue'
    })
  }

  // Filter recipes based on search
  const filteredRecipes = allRecipes?.filter(recipe =>
    recipe.outputItemName.toLowerCase().includes(search.toLowerCase()) ||
    recipe.username.toLowerCase().includes(search.toLowerCase()) ||
    recipe.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    recipe.ingredients?.some(ingredient =>
      ingredient.itemName.toLowerCase().includes(search.toLowerCase())
    )
  ) || []

  if (isLoading) {
    return (
      <Center maw={400} h={300} mx="auto">
        <Loader />
      </Center>
    )
  }

  if (error) {
    return (
      <Alert color="red" icon={<IconInfoCircle size={16} />}>
        Error loading global recipes: {error.message}
      </Alert>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      <Group position="apart" mb="md">
        <div>
          <Text size="xl" weight={700} color="white">Global Recipes</Text>
          <Text size="sm" color="rgba(255, 255, 255, 0.7)">
            Monitor and manage all user-created recipes across the platform.
          </Text>
        </div>
        <Group spacing="md">
          <Badge color="blue" size="lg">
            <Group spacing="xs">
              <IconClock size={14} />
              <span>{getRelativeTime(new Date(), currentTime)}</span>
            </Group>
          </Badge>
          <Badge
            color={filteredRecipes?.length > 0 ? 'green' : 'orange'}
            size="lg"
          >
            {filteredRecipes?.length || 0} Recipes
          </Badge>
        </Group>
      </Group>

      {/* Stats Cards */}
      <Group mb="md" grow>
        <Card withBorder p="md" style={{ backgroundColor: 'rgba(25, 113, 194, 0.1)' }}>
          <Group position="apart">
            <div>
              <Text weight={500} size="sm" color="white">Total Recipes</Text>
              <Text size="xl" weight={700} color="white">
                {globalStats?.totalRecipes || 0}
              </Text>
            </div>
            <Badge color="green">
              <Group spacing="xs">
                <IconRefresh size={12} />
                <span>Live Data</span>
              </Group>
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md" style={{ backgroundColor: 'rgba(25, 113, 194, 0.1)' }}>
          <div>
            <Text weight={500} size="sm" color="white">Unique Output Items</Text>
            <Text size="xl" weight={700} color="white">
              {globalStats?.uniqueOutputItems || 0}
            </Text>
          </div>
        </Card>

        <Card withBorder p="md" style={{ backgroundColor: 'rgba(25, 113, 194, 0.1)' }}>
          <div>
            <Text weight={500} size="sm" color="white">Active Contributors</Text>
            <Text size="xl" weight={700} color="white">
              {globalStats?.totalUsers || 0}
            </Text>
          </div>
        </Card>
      </Group>

      {/* Filters and Search */}
      <Group mb="md">
        <TextInput
          placeholder="Search recipes, users, or items..."
          icon={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ minWidth: 300 }}
        />
        <Select
          placeholder="Sort by"
          icon={<IconFilter size={16} />}
          data={[
            { value: 'createdAt', label: 'Date Created' },
            { value: 'outputItemName', label: 'Recipe Name' },
            { value: 'username', label: 'Creator' }
          ]}
          value={sortBy}
          onChange={setSortBy}
        />
        <Select
          data={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' }
          ]}
          value={sortOrder}
          onChange={setSortOrder}
        />
      </Group>

      {/* Recipes Table */}
      {filteredRecipes && filteredRecipes.length > 0 ? (
        <Paper withBorder style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <ScrollArea>
            <Table sx={{ minWidth: 800 }} verticalSpacing="sm">
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ color: 'white', fontWeight: 600 }}>Recipe</th>
                  <th style={{ color: 'white', fontWeight: 600 }}>Creator</th>
                  <th style={{ color: 'white', fontWeight: 600 }}>Ingredients</th>
                  <th style={{ color: 'white', fontWeight: 600 }}>Profit</th>
                  <th style={{ color: 'white', fontWeight: 600 }}>Created</th>
                  <th style={{ color: 'white', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((recipe) => (
                  <AdminRecipeRow
                    key={recipe.id}
                    recipe={recipe}
                    onEdit={handleEditRecipe}
                    onDelete={handleDeleteRecipe}
                    isDeleting={deleteRecipeGloballyMutation.isLoading}
                    allItems={allItems}
                  />
                ))}
              </tbody>
            </Table>
          </ScrollArea>
        </Paper>
      ) : (
        <Card withBorder p="xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <Center>
            <div style={{ textAlign: 'center' }}>
              <Text size="lg" weight={600} color="white" mb="sm">
                {search ? 'No Matching Recipes' : 'No Recipes Found'}
              </Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                {search 
                  ? 'Try adjusting your search criteria.'
                  : 'Users haven\'t created any recipes yet.'
                }
              </Text>
            </div>
          </Center>
        </Card>
      )}
    </Box>
  )
}