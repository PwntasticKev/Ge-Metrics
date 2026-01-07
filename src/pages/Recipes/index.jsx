import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card,
  Button,
  Modal,
  Alert,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import { IconClock, IconRefresh, IconPlus, IconInfoCircle, IconEdit, IconTrash } from '@tabler/icons-react'
import React, { useState } from 'react'
import { trpc } from '../../utils/trpc.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'
import { showNotification } from '@mantine/notifications'
import { getRelativeTime, formatNumber } from '../../utils/utils.jsx'
import ItemData from '../../utils/item-data.jsx'
import RecipeCreationModal from './components/RecipeCreationModal.jsx'
import RecipeEditModal from './components/RecipeEditModal.jsx'
import RecipesTable from './components/RecipesTable.jsx'
import GraphModal from '../../shared/modals/graph-modal.jsx'

export default function UserRecipes() {
  const { items, mapStatus, priceStatus } = ItemData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [creationModalOpen, setCreationModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  
  // Fetch user's own recipes
  const { 
    data: userRecipes, 
    isLoading, 
    error, 
    refetch: refetchRecipes 
  } = trpc.recipes.getUserRecipes.useQuery({
    limit: 30, // Optimized limit from 100 to 30
    offset: 0
  })

  // Get user recipe count for limit display
  const { data: recipeCount } = trpc.recipes.getUserRecipeCount.useQuery()

  // Delete recipe mutation
  const deleteRecipeMutation = trpc.recipes.deleteRecipe.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'Recipe deleted successfully',
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

  const handleEditRecipe = (recipe) => {
    setSelectedRecipe(recipe)
    setEditModalOpen(true)
  }

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      await deleteRecipeMutation.mutateAsync({ id: recipeId })
    }
  }

  const handleCreationSuccess = () => {
    setCreationModalOpen(false)
    refetchRecipes()
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setSelectedRecipe(null)
    refetchRecipes()
  }

  if (isLoading) {
    return (
      <PremiumPageWrapper>
        <Center maw={400} h={300} mx="auto">
          <Loader />
        </Center>
      </PremiumPageWrapper>
    )
  }

  if (error) {
    return (
      <PremiumPageWrapper>
        <Alert color="red" icon={<IconInfoCircle size={16} />}>
          Error loading recipes: {error.message}
        </Alert>
      </PremiumPageWrapper>
    )
  }

  return (
    <PremiumPageWrapper>
      <Box sx={{ py: 4 }}>
        <Group position="apart" mb="md">
          <div>
            <Text size="xl" weight={700} color="white">My Recipes</Text>
            <Text size="sm" color="rgba(255, 255, 255, 0.7)">
              Manage your custom item combinations. Track profit opportunities for your recipes.
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
              color={userRecipes?.length > 0 ? 'green' : 'orange'}
              size="lg"
            >
              {userRecipes?.length || 0} / 300 Recipes
            </Badge>
            <Button
              leftIcon={<IconPlus size={16} />}
              onClick={() => setCreationModalOpen(true)}
              disabled={(recipeCount || 0) >= 300}
            >
              Create Recipe
            </Button>
          </Group>
        </Group>

        <Card withBorder p="md" mb="md" style={{ backgroundColor: 'rgba(25, 113, 194, 0.1)' }}>
          <Group position="apart">
            <div>
              <Text weight={500} size="sm" color="white">Recipe Status</Text>
              <Text size="xs" color="rgba(255, 255, 255, 0.7)">
                {userRecipes?.length || 0} custom recipes created •
                {300 - (recipeCount || 0)} slots remaining
              </Text>
            </div>
            <Badge color="green">
              <Group spacing="xs">
                <IconRefresh size={12} />
                <span>Live Pricing</span>
              </Group>
            </Badge>
          </Group>
        </Card>

        {(recipeCount || 0) >= 300 && (
          <Alert color="yellow" icon={<IconInfoCircle size={16} />} mb="md">
            You have reached the maximum limit of 300 recipes. Delete some recipes to create new ones.
          </Alert>
        )}

        {userRecipes && userRecipes.length > 0 ? (
          <RecipesTable
            recipes={userRecipes}
            items={items}
            onEdit={handleEditRecipe}
            onDelete={handleDeleteRecipe}
            isDeleting={deleteRecipeMutation.isLoading}
            setGraphInfo={setGraphInfo}
            showUserColumn={false}
          />
        ) : (
          <Card withBorder p="xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <Center>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={600} color="white" mb="sm">
                  No Recipes Created
                </Text>
                <Text size="sm" color="rgba(255, 255, 255, 0.7)" mb="lg">
                  Create your first custom recipe to track profit opportunities for item combinations you discover.
                </Text>
                <Button
                  leftIcon={<IconPlus size={16} />}
                  onClick={() => setCreationModalOpen(true)}
                >
                  Create Your First Recipe
                </Button>
              </div>
            </Center>
          </Card>
        )}
      </Box>

      {/* Recipe Creation Modal */}
      <RecipeCreationModal
        opened={creationModalOpen}
        onClose={() => setCreationModalOpen(false)}
        onSuccess={handleCreationSuccess}
        items={items}
      />

      {/* Recipe Edit Modal */}
      {selectedRecipe && (
        <RecipeEditModal
          opened={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedRecipe(null)
          }}
          recipe={selectedRecipe}
          onSuccess={handleEditSuccess}
          items={items}
        />
      )}
      
      {/* Graph Modal */}
      <GraphModal
        opened={graphInfo.open}
        onClose={() => setGraphInfo({ open: false, item: null })}
        item={graphInfo.item}
      />
    </PremiumPageWrapper>
  )
}