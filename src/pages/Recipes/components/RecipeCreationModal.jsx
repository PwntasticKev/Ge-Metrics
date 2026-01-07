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
  IconInfoCircle,
  IconGripVertical,
  IconChevronUp,
  IconChevronDown,
  IconX
} from '@tabler/icons-react'
import { trpc } from '../../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { formatNumber, calculateGETax } from '../../../utils/utils.jsx'

function ItemSearchInput({ onItemSelect, placeholder, excludeItemIds = [], items, multiSelect = false, clearAfterSelect = true }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)
  const containerRef = useRef(null)

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
    setShowDropdown(searchQuery.length > 0 && filteredItems.length > 0)
  }, [searchQuery, filteredItems.length])

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }
  }

  const handleItemSelect = (item) => {
    if (item) {
      onItemSelect(item)
      // Only clear search if not in multi-select mode or explicitly requested
      if (clearAfterSelect && !multiSelect) {
        setSearchQuery('')
        setSelectedIndex(-1)
        setShowDropdown(false)
      } else if (multiSelect) {
        // Keep search open but reset selection index for multi-select
        setSelectedIndex(-1)
      }
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSelectedIndex(-1)
    setShowDropdown(false)
    searchRef.current?.focus()
  }

  return (
    <Box ref={containerRef} style={{ position: 'relative' }}>
      <TextInput
        ref={searchRef}
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchQuery && setShowDropdown(true)}
        icon={<IconSearch size={16} />}
        rightSection={
          searchQuery ? (
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={handleClearSearch}
            >
              <IconX size={14} />
            </ActionIcon>
          ) : null
        }
      />
      
      {showDropdown && filteredItems.length > 0 && (
        <Paper
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            zIndex: 1000,
            maxHeight: '450px',
            overflow: 'hidden'
          }}
        >
          <ScrollArea style={{ maxHeight: '450px' }}>
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
                        style={{ 
                          imageRendering: 'pixelated',
                          minWidth: '32px',
                          minHeight: '32px'
                        }}
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
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

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

  const handleMoveIngredientUp = (index) => {
    if (index === 0) return
    setIngredients(prev => {
      const newIngredients = [...prev]
      const temp = newIngredients[index]
      newIngredients[index] = newIngredients[index - 1]
      newIngredients[index - 1] = temp
      return newIngredients
    })
  }

  const handleMoveIngredientDown = (index) => {
    if (index === ingredients.length - 1) return
    setIngredients(prev => {
      const newIngredients = [...prev]
      const temp = newIngredients[index]
      newIngredients[index] = newIngredients[index + 1]
      newIngredients[index + 1] = temp
      return newIngredients
    })
  }

  const handleDragStart = (e, index) => {
    dragItem.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
  }

  const handleDragEnter = (e, index) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    const dragIndex = dragItem.current
    const dragOverIndex = dragOverItem.current

    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setIngredients(prev => {
        const newIngredients = [...prev]
        const draggedItemContent = newIngredients[dragIndex]
        newIngredients.splice(dragIndex, 1)
        newIngredients.splice(dragOverIndex, 0, draggedItemContent)
        return newIngredients
      })
    }

    dragItem.current = null
    dragOverItem.current = null
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
      ingredients: ingredients.map((ing, index) => ({
        itemId: ing.itemId,
        itemName: ing.itemName,
        quantity: ing.quantity,
        sortOrder: index
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
    const tax = calculateGETax(sellPrice)
    const netProfit = sellPrice - totalCost - tax

    return {
      totalCost,
      sellPrice,
      netProfit,
      marginPercentage: totalCost > 0 ? (netProfit / totalCost) * 100 : 0
    }
  }

  const previewProfit = calculatePreviewProfit()

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Recipe"
      size="xl"
      centered
      styles={{
        modal: {
          minHeight: '600px',
          maxHeight: '90vh'
        },
        body: {
          minHeight: '500px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }
      }}
    >
      <Stack spacing="md">
        {/* Step Indicator */}
        <div>
          <Text size="sm" weight={500} color="dimmed" mb="xs">
            Step {!outputItem ? '1' : ingredients.length === 0 ? '2' : '3'} of 3
          </Text>
          <Group spacing="xs">
            <Badge 
              color={outputItem ? 'green' : 'blue'}
              variant={outputItem ? 'filled' : 'light'}
              size="sm"
            >
              Choose Output
            </Badge>
            <Badge 
              color={outputItem && ingredients.length > 0 ? 'green' : outputItem ? 'blue' : 'gray'}
              variant={outputItem && ingredients.length > 0 ? 'filled' : outputItem ? 'light' : 'outline'}
              size="sm"
            >
              Add Ingredients
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

        {/* Output Item Selection First */}
        <div>
          <Text size="sm" weight={500} mb="xs">
            Output Item * <Text span color="dimmed">(What item do you want to create?)</Text>
          </Text>
          {outputItem ? (
            <Paper withBorder p="sm" style={{ backgroundColor: 'rgba(0, 255, 0, 0.1)' }}>
              <Group spacing="sm" position="apart">
                <Group spacing="sm">
                  <Image
                    src={outputItem.img}
                    width={40}
                    height={40}
                    fit="contain"
                    withPlaceholder
                    style={{ 
                      imageRendering: 'pixelated',
                      minWidth: '40px',
                      minHeight: '40px'
                    }}
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
              placeholder="Search for the item you want to create..."
              excludeItemIds={getUsedItemIds()}
              items={items}
            />
          )}
          <Text size="xs" color="dimmed" mt="xs">
            💡 Tip: Start by choosing the final item you want to create
          </Text>
        </div>

        {/* Ingredients Section (Only show after output is selected) */}
        {outputItem && (
          <div>
            <Text size="sm" weight={500} mb="xs">
              Ingredients * <Text span color="dimmed">(What items are needed to create {outputItem.itemName}?)</Text>
            </Text>
            
            {/* Add Ingredient */}
            <ItemSearchInput
              onItemSelect={handleAddIngredient}
              placeholder="Search and add ingredients..."
              excludeItemIds={getUsedItemIds()}
              items={items}
              multiSelect={true}
              clearAfterSelect={false}
            />

            {/* Current Ingredients */}
            {ingredients.length > 0 && (
              <Stack spacing="xs" mt="sm">
                {ingredients.map((ingredient, index) => (
                  <Paper 
                    key={ingredient.itemId} 
                    withBorder 
                    p="sm"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ cursor: 'move' }}
                  >
                    <Group spacing="sm" position="apart">
                      <Group spacing="sm" style={{ flex: 1 }}>
                        {/* Drag Handle */}
                        <Group spacing="xs" noWrap>
                          <IconGripVertical 
                            size={16} 
                            color="#666" 
                            style={{ cursor: 'grab' }}
                          />
                          <Stack spacing={0}>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="gray"
                              onClick={() => handleMoveIngredientUp(index)}
                              disabled={index === 0}
                            >
                              <IconChevronUp size={12} />
                            </ActionIcon>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="gray"
                              onClick={() => handleMoveIngredientDown(index)}
                              disabled={index === ingredients.length - 1}
                            >
                              <IconChevronDown size={12} />
                            </ActionIcon>
                          </Stack>
                        </Group>
                        
                        <Image
                          src={ingredient.img}
                          width={40}
                          height={40}
                          fit="contain"
                          withPlaceholder
                          style={{ 
                            imageRendering: 'pixelated',
                            minWidth: '40px',
                            minHeight: '40px'
                          }}
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
            <Text size="xs" color="dimmed" mt="xs">
              💡 Tip: Add multiple ingredients by searching and selecting them. Search stays open for easy multi-selection.
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