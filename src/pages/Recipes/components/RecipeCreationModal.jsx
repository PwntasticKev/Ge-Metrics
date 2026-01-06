import React, { useState, useRef, useEffect } from 'react'
import {
  Modal,
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  Button,
  ActionIcon,
  Paper,
  ScrollArea,
  UnstyledButton,
  Image,
  Box,
  Alert,
  Badge,
  Divider
} from '@mantine/core'
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconInfoCircle
} from '@tabler/icons-react'
import { trpc } from '../../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { formatNumber } from '../../../utils/utils.jsx'

function ItemSearchInput({ onItemSelect, placeholder, excludeItemIds = [], items }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)

  // Use items prop if provided, otherwise fallback to TRPC calls
  const { data: itemMapping } = trpc.items.getItemMapping.useQuery()
  const { data: allItems } = trpc.items.getAllItems.useQuery()

  // Filter items for search
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return []
    
    // Use items prop if available (from ItemData), otherwise use TRPC data
    const sourceItems = items || (itemMapping && allItems ? itemMapping : [])
    if (!sourceItems || sourceItems.length === 0) return []
    
    const query = searchQuery.toLowerCase()
    let matching = []
    
    if (items) {
      // Using ItemData - items already have pricing and image data
      matching = items
        .filter(item => 
          item?.name?.toLowerCase().includes(query) ||
          item?.id?.toString().includes(query)
        )
        .filter(item => !excludeItemIds.includes(item.id))
        .slice(0, 10)
        .map(item => ({
          ...item,
          img: `https://oldschool.runescape.wiki/images/${item.icon?.replace(/ /g, '_') || `c/c1/${item.id}.png`}`,
          high: item.high || 0,
          low: item.low || 0
        }))
    } else {
      // Fallback to TRPC data
      const itemMappingArray = Array.isArray(itemMapping) 
        ? itemMapping 
        : Object.values(itemMapping || {})
      
      matching = itemMappingArray
        .filter(item => 
          item?.name?.toLowerCase().includes(query) ||
          item?.id?.toString().includes(query)
        )
        .filter(item => !excludeItemIds.includes(item.id))
        .slice(0, 10)
        .map(item => {
          const priceData = allItems[item.id]
          return {
            ...item,
            img: `https://oldschool.runescape.wiki/images/c/c1/${item.id}.png`,
            high: priceData?.high ? Number(priceData.high) : 0,
            low: priceData?.low ? Number(priceData.low) : 0
          }
        })
    }
    
    return matching
  }, [searchQuery, items, itemMapping, allItems, excludeItemIds])

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (searchQuery && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
          handleItemSelect(filteredItems[selectedIndex])
        } else if (filteredItems.length > 0) {
          handleItemSelect(filteredItems[0])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSearchQuery('')
        setSelectedIndex(-1)
      }
    }
  }

  const handleItemSelect = (item) => {
    if (item) {
      onItemSelect(item)
      setSearchQuery('')
      setSelectedIndex(-1)
    }
  }

  return (
    <Box style={{ position: 'relative' }}>
      <TextInput
        ref={searchRef}
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        icon={<IconSearch size={16} />}
      />
      
      {searchQuery && filteredItems.length > 0 && (
        <Paper
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            zIndex: 1000,
            maxHeight: '300px',
            overflow: 'hidden'
          }}
        >
          <ScrollArea style={{ maxHeight: '300px' }}>
            <Stack spacing="xs" p="xs">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex
                return (
                  <UnstyledButton
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: isSelected ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent'
                    }}
                  >
                    <Group spacing="sm" noWrap>
                      <Image
                        src={item.img}
                        width={32}
                        height={32}
                        fit="contain"
                        withPlaceholder
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" weight={500}>{item.name}</Text>
                        <Group spacing={4} noWrap>
                          <Text size="xs" color="dimmed">
                            Buy: {item.low?.toLocaleString() || 'N/A'} GP
                          </Text>
                          <Text size="xs" color="dimmed">|</Text>
                          <Text size="xs" color="dimmed">
                            Sell: {item.high?.toLocaleString() || 'N/A'} GP
                          </Text>
                        </Group>
                      </div>
                    </Group>
                  </UnstyledButton>
                )
              })}
            </Stack>
          </ScrollArea>
        </Paper>
      )}
    </Box>
  )
}

export default function RecipeCreationModal({ opened, onClose, onSuccess, items }) {
  const [ingredients, setIngredients] = useState([])
  const [outputItem, setOutputItem] = useState(null)
  const [conversionCost, setConversionCost] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create recipe mutation
  const createRecipeMutation = trpc.recipes.createRecipe.useMutation({
    onSuccess: (data) => {
      showNotification({
        title: 'Success',
        message: data.message || 'Recipe created successfully',
        color: 'green'
      })
      onSuccess()
      resetForm()
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

  const resetForm = () => {
    setIngredients([])
    setOutputItem(null)
    setConversionCost(0)
  }

  const handleAddIngredient = (item) => {
    const existingIngredient = ingredients.find(ing => ing.itemId === item.id)
    if (existingIngredient) {
      // Increase quantity if already exists
      setIngredients(prev => 
        prev.map(ing => 
          ing.itemId === item.id 
            ? { ...ing, quantity: ing.quantity + 1 }
            : ing
        )
      )
    } else {
      // Add new ingredient
      setIngredients(prev => [...prev, {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        img: item.img,
        low: item.low,
        high: item.high
      }])
    }
  }

  const handleRemoveIngredient = (itemId) => {
    setIngredients(prev => prev.filter(ing => ing.itemId !== itemId))
  }

  const handleUpdateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      handleRemoveIngredient(itemId)
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

  const handleSetOutputItem = (item) => {
    setOutputItem({
      itemId: item.id,
      itemName: item.name,
      img: item.img,
      high: item.high,
      low: item.low
    })
  }

  const handleSubmit = async () => {
    if (!outputItem) {
      showNotification({
        title: 'Error',
        message: 'Please select an output item',
        color: 'red'
      })
      return
    }

    if (ingredients.length === 0) {
      showNotification({
        title: 'Error',
        message: 'Please add at least one ingredient',
        color: 'red'
      })
      return
    }

    setIsSubmitting(true)

    await createRecipeMutation.mutateAsync({
      outputItemId: outputItem.itemId,
      outputItemName: outputItem.itemName,
      conversionCost: conversionCost || 0,
      ingredients: ingredients.map(ing => ({
        itemId: ing.itemId,
        itemName: ing.itemName,
        quantity: ing.quantity
      }))
    })
  }

  const getUsedItemIds = () => {
    const ids = ingredients.map(ing => ing.itemId)
    if (outputItem) {
      ids.push(outputItem.itemId)
    }
    return ids
  }

  const calculatePreviewProfit = () => {
    if (!outputItem || ingredients.length === 0) return null

    const totalCost = conversionCost + ingredients.reduce((sum, ing) => 
      sum + (ing.low * ing.quantity), 0
    )
    const sellPrice = outputItem.high || 0
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Recipe"
      size="lg"
      centered
    >
      <Stack spacing="md">
        {/* Step Indicator */}
        <div>
          <Text size="sm" weight={500} color="dimmed" mb="xs">
            Step {ingredients.length === 0 ? '1' : outputItem ? '3' : '2'} of 3
          </Text>
          <Group spacing="xs">
            <Badge 
              color={ingredients.length > 0 ? 'green' : 'blue'}
              variant={ingredients.length > 0 ? 'filled' : 'light'}
              size="sm"
            >
              Add Ingredients
            </Badge>
            <Badge 
              color={ingredients.length > 0 && outputItem ? 'green' : ingredients.length > 0 ? 'blue' : 'gray'}
              variant={ingredients.length > 0 && outputItem ? 'filled' : ingredients.length > 0 ? 'light' : 'outline'}
              size="sm"
            >
              Choose Output
            </Badge>
            <Badge 
              color={outputItem && ingredients.length > 0 ? 'blue' : 'gray'}
              variant={outputItem && ingredients.length > 0 ? 'light' : 'outline'}
              size="sm"
            >
              Review & Create
            </Badge>
          </Group>
        </div>

        {/* Ingredients First */}
        <div>
          <Text size="sm" weight={500} mb="xs">
            Ingredients * {ingredients.length === 0 && <Text span color="dimmed">(Start by adding ingredients)</Text>}
          </Text>
          
          {/* Add Ingredient */}
          <ItemSearchInput
            onItemSelect={handleAddIngredient}
            placeholder="Search and add ingredients..."
            excludeItemIds={getUsedItemIds()}
            items={items}
          />

          {/* Current Ingredients */}
          {ingredients.length > 0 && (
            <Stack spacing="xs" mt="sm">
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
          )}
        </div>

        {/* Output Item Selection (Only show after ingredients are added) */}
        {ingredients.length > 0 && (
          <div>
            <Text size="sm" weight={500} mb="xs">
              Output Item * <Text span color="dimmed">(What do these ingredients create?)</Text>
            </Text>
            {outputItem ? (
              <Paper withBorder p="sm" style={{ backgroundColor: 'rgba(0, 255, 0, 0.1)' }}>
                <Group spacing="sm" position="apart">
                  <Group spacing="sm">
                    <Image
                      src={outputItem.img}
                      width={32}
                      height={32}
                      fit="contain"
                      withPlaceholder
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div>
                      <Text size="sm" weight={500}>{outputItem.itemName}</Text>
                      <Text size="xs" color="dimmed">
                        Sell: {outputItem.high?.toLocaleString() || 'N/A'} GP
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon color="red" onClick={() => setOutputItem(null)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ) : (
              <ItemSearchInput
                onItemSelect={handleSetOutputItem}
                placeholder="Search for what these ingredients create..."
                excludeItemIds={getUsedItemIds()}
                items={items}
              />
            )}
            <Text size="xs" color="dimmed" mt="xs">
              💡 Tip: Select the item that your ingredients combine to create
            </Text>
          </div>
        )}

        {/* Conversion Cost */}
        {outputItem && ingredients.length > 0 && (
          <div>
            <Text size="sm" weight={500} mb="xs">
              Conversion Cost (optional) <Text span color="dimmed">(e.g., smithing fees, rune costs)</Text>
            </Text>
            <NumberInput
              value={conversionCost}
              onChange={setConversionCost}
              min={0}
              placeholder="Enter additional costs..."
              rightSection={<Text size="xs" color="dimmed">GP</Text>}
            />
          </div>
        )}

        {/* Recipe Name Preview */}
        {outputItem && (
          <Alert color="green" icon={<IconInfoCircle size={16} />}>
            Recipe name: <Text span weight={600}>{outputItem.itemName}</Text>
          </Alert>
        )}

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
          {ingredients.length === 0 ? (
            <Button disabled>
              Add ingredients first
            </Button>
          ) : !outputItem ? (
            <Button disabled>
              Choose output item
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              leftIcon={<IconPlus size={16} />}
            >
              Create Recipe
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  )
}