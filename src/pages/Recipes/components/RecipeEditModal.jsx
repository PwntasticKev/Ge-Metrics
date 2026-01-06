import React, { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Group,
  Text,
  NumberInput,
  Button,
  ActionIcon,
  Paper,
  Alert,
  Badge,
  Divider,
  Image
} from '@mantine/core'
import {
  IconTrash,
  IconInfoCircle
} from '@tabler/icons-react'
import { trpc } from '../../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { formatNumber } from '../../../utils/utils.jsx'

export default function RecipeEditModal({ opened, onClose, recipe, onSuccess, items }) {
  const [ingredients, setIngredients] = useState([])
  const [conversionCost, setConversionCost] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update recipe mutation
  const updateRecipeMutation = trpc.recipes.updateRecipe.useMutation({
    onSuccess: () => {
      showNotification({
        title: 'Success',
        message: 'Recipe updated successfully',
        color: 'green'
      })
      onSuccess()
    },
    onError: (error) => {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  // Get current items data for pricing
  const { data: allItems } = trpc.items.getAllItems.useQuery()

  // Initialize form with recipe data
  useEffect(() => {
    if (recipe) {
      setConversionCost(recipe.conversionCost || 0)
      
      // Map ingredients with current pricing data
      if (recipe.ingredients && (items || allItems)) {
        const enrichedIngredients = recipe.ingredients.map(ingredient => {
          // Find item in items array for proper image URL
          const itemData = items?.find(item => item.id === ingredient.itemId)
          const priceData = allItems?.[ingredient.itemId]
          
          return {
            ...ingredient,
            img: itemData?.icon 
              ? `https://oldschool.runescape.wiki/images/${itemData.icon.replace(/ /g, '_')}`
              : `https://oldschool.runescape.wiki/images/c/c1/${ingredient.itemId}.png`,
            low: priceData?.low || itemData?.low || 0,
            high: priceData?.high || itemData?.high || 0
          }
        })
        setIngredients(enrichedIngredients)
      } else if (recipe.ingredients) {
        setIngredients(recipe.ingredients.map(ingredient => ({
          ...ingredient,
          img: `https://oldschool.runescape.wiki/images/c/c1/${ingredient.itemId}.png`,
          low: 0,
          high: 0
        })))
      }
    }
  }, [recipe, allItems, items])

  const handleUpdateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setIngredients(prev => prev.filter(ing => ing.itemId !== itemId))
      return
    }
    setIngredients(prev => 
      prev.map(ing => 
        ing.itemId === itemId 
          ? { ...ing, quantity }
          : ing
      )
    )
  }

  const handleRemoveIngredient = (itemId) => {
    setIngredients(prev => prev.filter(ing => ing.itemId !== itemId))
  }

  const handleSubmit = async () => {
    if (ingredients.length === 0) {
      showNotification({
        title: 'Error',
        message: 'Recipe must have at least one ingredient',
        color: 'red'
      })
      return
    }

    setIsSubmitting(true)

    await updateRecipeMutation.mutateAsync({
      id: recipe.id,
      conversionCost: conversionCost || 0,
      ingredients: ingredients.map(ing => ({
        itemId: ing.itemId,
        itemName: ing.itemName,
        quantity: ing.quantity
      }))
    })
  }

  const calculatePreviewProfit = () => {
    if (!recipe || ingredients.length === 0 || !allItems) return null

    const outputItem = allItems[recipe.outputItemId]
    const totalCost = conversionCost + ingredients.reduce((sum, ing) => 
      sum + ((allItems[ing.itemId]?.low || 0) * ing.quantity), 0
    )
    const sellPrice = outputItem?.high || 0
    const grossProfit = sellPrice - totalCost
    const netProfit = Math.floor(grossProfit * 0.99) // 1% GE tax

    return {
      totalCost,
      sellPrice,
      netProfit,
      marginPercentage: totalCost > 0 ? (grossProfit / totalCost) * 100 : 0
    }
  }

  const previewProfit = calculatePreviewProfit()

  if (!recipe) return null

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Recipe"
      size="lg"
      centered
    >
      <Stack spacing="md">
        {/* Output Item Display (read-only) */}
        <div>
          <Text size="sm" weight={500} mb="xs">Output Item</Text>
          <Paper withBorder p="sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <Group spacing="sm">
              <Image
                src={(() => {
                  const itemData = items?.find(item => item.id === recipe.outputItemId)
                  return itemData?.icon 
                    ? `https://oldschool.runescape.wiki/images/${itemData.icon.replace(/ /g, '_')}`
                    : `https://oldschool.runescape.wiki/images/c/c1/${recipe.outputItemId}.png`
                })()}
                width={32}
                height={32}
                fit="contain"
                withPlaceholder
                style={{ imageRendering: 'pixelated' }}
              />
              <div>
                <Text size="sm" weight={500}>{recipe.outputItemName}</Text>
                <Text size="xs" color="dimmed">
                  Sell: {allItems?.[recipe.outputItemId]?.high?.toLocaleString() || items?.find(item => item.id === recipe.outputItemId)?.high?.toLocaleString() || 'N/A'} GP
                </Text>
              </div>
            </Group>
          </Paper>
          <Text size="xs" color="dimmed" mt="xs">
            Output item cannot be changed after creation
          </Text>
        </div>

        {/* Ingredients */}
        <div>
          <Text size="sm" weight={500} mb="xs">Ingredients *</Text>
          
          {ingredients.length > 0 ? (
            <Stack spacing="xs">
              {ingredients.map((ingredient) => (
                <Paper key={ingredient.itemId} withBorder p="sm">
                  <Group spacing="sm" position="apart">
                    <Group spacing="sm">
                      <Image
                        src={ingredient.img}
                        width={32}
                        height={32}
                        fit="contain"
                        withPlaceholder
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div>
                        <Text size="sm" weight={500}>{ingredient.itemName}</Text>
                        <Text size="xs" color="dimmed">
                          Buy: {ingredient.low?.toLocaleString() || 'N/A'} GP each
                        </Text>
                      </div>
                    </Group>
                    <Group spacing="sm">
                      <NumberInput
                        value={ingredient.quantity}
                        onChange={(value) => handleUpdateQuantity(ingredient.itemId, value)}
                        min={1}
                        max={1000000}
                        style={{ width: 80 }}
                      />
                      <ActionIcon 
                        color="red" 
                        onClick={() => handleRemoveIngredient(ingredient.itemId)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Alert color="yellow" icon={<IconInfoCircle size={16} />}>
              This recipe has no ingredients. Add at least one ingredient to save.
            </Alert>
          )}
        </div>

        {/* Conversion Cost */}
        <div>
          <Text size="sm" weight={500} mb="xs">
            Conversion Cost (optional)
          </Text>
          <NumberInput
            value={conversionCost}
            onChange={setConversionCost}
            min={0}
            placeholder="Enter additional costs (e.g., smithing fees)"
            rightSection={<Text size="xs" color="dimmed">GP</Text>}
          />
        </div>

        {/* Profit Preview */}
        {previewProfit && (
          <>
            <Divider />
            <div>
              <Text size="sm" weight={500} mb="xs">Profit Preview</Text>
              <Paper withBorder p="sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <Group spacing="lg">
                  <div>
                    <Text size="xs" color="dimmed">Total Cost</Text>
                    <Text size="sm" weight={500}>
                      {formatNumber(previewProfit.totalCost)} GP
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" color="dimmed">Sell Price</Text>
                    <Text size="sm" weight={500}>
                      {formatNumber(previewProfit.sellPrice)} GP
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" color="dimmed">Net Profit</Text>
                    <Text
                      size="sm"
                      weight={600}
                      color={previewProfit.netProfit > 0 ? 'green' : 'red'}
                    >
                      {previewProfit.netProfit > 0 ? '+' : ''}{formatNumber(previewProfit.netProfit)} GP
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" color="dimmed">Margin</Text>
                    <Badge
                      color={previewProfit.marginPercentage > 0 ? 'green' : 'red'}
                      variant="outline"
                    >
                      {previewProfit.marginPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </Group>
              </Paper>
            </div>
          </>
        )}

        {/* Actions */}
        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={ingredients.length === 0}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}