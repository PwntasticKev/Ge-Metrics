import React, { useState } from 'react'
import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Alert
} from '@mantine/core'
import {
  IconClock,
  IconRefresh,
  IconInfoCircle
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { getRelativeTime } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import RecipesTable from '../Recipes/components/RecipesTable.jsx'
import GraphModal from '../../shared/modals/graph-modal.jsx'

export default function GlobalRecipes() {
  const { items } = ItemData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  
  // Fetch all recipes (admin only)
  const { 
    data: allRecipes, 
    isLoading, 
    error, 
    refetch: refetchRecipes 
  } = trpc.recipes.getAllRecipes.useQuery({
    limit: 30, // Optimized from 1000
    offset: 0
  })

  // Get global recipe stats
  const { data: globalStats } = trpc.recipes.getGlobalRecipeStats.useQuery()

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
            color={allRecipes?.length > 0 ? 'green' : 'orange'}
            size="lg"
          >
            {allRecipes?.length || 0} Recipes
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

      <RecipesTable
        recipes={allRecipes || []}
        items={items}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
        isDeleting={deleteRecipeGloballyMutation.isLoading}
        setGraphInfo={setGraphInfo}
        showUserColumn={true}
      />

      <GraphModal
        opened={graphInfo.open}
        onClose={() => setGraphInfo({ open: false, item: null })}
        item={graphInfo.item}
      />
    </Box>
  )
}