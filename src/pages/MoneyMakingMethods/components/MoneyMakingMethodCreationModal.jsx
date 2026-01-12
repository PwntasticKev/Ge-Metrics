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
  Divider,
  Select,
  MultiSelect,
  Textarea,
  JsonInput
} from '@mantine/core'
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconInfoCircle,
  IconGripVertical,
  IconChevronUp,
  IconChevronDown,
  IconX,
  IconCoin,
  IconTarget,
  IconBook,
  IconSword
} from '@tabler/icons-react'
import { trpc } from '../../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'
import { formatNumber } from '../../../utils/utils.jsx'

const CATEGORIES = [
  { value: 'skilling', label: 'Skilling', color: 'blue' },
  { value: 'pvm', label: 'Player vs Monster', color: 'red' },
  { value: 'merching', label: 'Merching/Trading', color: 'orange' }
]

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'orange' },
  { value: 'hard', label: 'Hard', color: 'red' },
  { value: 'elite', label: 'Elite', color: 'violet' }
]

const COMMON_SKILLS = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer', 'Magic',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecrafting', 'Hunter', 'Construction'
]

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

export default function MoneyMakingMethodCreationModal({ opened, onClose, onMethodCreated, items }) {
  const [methodName, setMethodName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [profitPerHour, setProfitPerHour] = useState('')
  const [requirements, setRequirements] = useState({
    skills: {},
    quests: [],
    items: [],
    other: ''
  })
  const [itemDependencies, setItemDependencies] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create method mutation
  const createMethodMutation = trpc.moneyMakingMethods.createMethod.useMutation({
    onSuccess: (data) => {
      showNotification({
        title: 'Success',
        message: data.message || 'Money making method created successfully and submitted for review',
        color: 'green'
      })
      onMethodCreated()
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
    setMethodName('')
    setDescription('')
    setCategory('')
    setDifficulty('')
    setProfitPerHour('')
    setRequirements({
      skills: {},
      quests: [],
      items: [],
      other: ''
    })
    setItemDependencies([])
  }

  const handleAddItemDependency = (item) => {
    const existingItem = itemDependencies.find(dep => dep.itemId === item.id)
    if (existingItem) {
      // Increase quantity if already exists
      setItemDependencies(prev => 
        prev.map(dep => 
          dep.itemId === item.id 
            ? { ...dep, quantity: dep.quantity + 1 }
            : dep
        )
      )
    } else {
      // Add new item dependency
      setItemDependencies(prev => [...prev, {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        img: item.img,
        high: item.high,
        low: item.low
      }])
    }
  }

  const handleRemoveItemDependency = (itemId) => {
    setItemDependencies(prev => prev.filter(dep => dep.itemId !== itemId))
  }

  const handleUpdateItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      handleRemoveItemDependency(itemId)
      return
    }
    setItemDependencies(prev => 
      prev.map(dep => 
        dep.itemId === itemId 
          ? { ...dep, quantity }
          : dep
      )
    )
  }

  const handleSkillRequirementChange = (skill, level) => {
    setRequirements(prev => ({
      ...prev,
      skills: level ? { ...prev.skills, [skill]: level } : Object.fromEntries(
        Object.entries(prev.skills).filter(([s]) => s !== skill)
      )
    }))
  }

  const handleQuestRequirementsChange = (quests) => {
    setRequirements(prev => ({
      ...prev,
      quests: quests || []
    }))
  }

  const handleItemRequirementsChange = (itemNames) => {
    setRequirements(prev => ({
      ...prev,
      items: itemNames || []
    }))
  }

  const handleSubmit = async () => {
    if (!methodName.trim()) {
      showNotification({
        title: 'Error',
        message: 'Please enter a method name',
        color: 'red'
      })
      return
    }

    if (!description.trim()) {
      showNotification({
        title: 'Error',
        message: 'Please enter a description',
        color: 'red'
      })
      return
    }

    if (!category) {
      showNotification({
        title: 'Error',
        message: 'Please select a category',
        color: 'red'
      })
      return
    }

    if (!difficulty) {
      showNotification({
        title: 'Error',
        message: 'Please select a difficulty',
        color: 'red'
      })
      return
    }

    if (!profitPerHour || profitPerHour <= 0) {
      showNotification({
        title: 'Error',
        message: 'Please enter a valid profit per hour amount',
        color: 'red'
      })
      return
    }

    setIsSubmitting(true)

    await createMethodMutation.mutateAsync({
      methodName: methodName.trim(),
      description: description.trim(),
      category,
      difficulty,
      profitPerHour: Number(profitPerHour),
      requirements,
      itemDependencies: itemDependencies.map(dep => ({
        itemId: dep.itemId,
        itemName: dep.itemName,
        quantity: dep.quantity,
        priceHigh: dep.high,
        priceLow: dep.low
      }))
    })
  }

  const getUsedItemIds = () => {
    return itemDependencies.map(dep => dep.itemId)
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Money Making Method"
      size="xl"
      centered
      styles={{
        modal: {
          minHeight: '600px',
          maxHeight: '95vh'
        },
        body: {
          minHeight: '500px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }
      }}
    >
      <Stack spacing="md">
        {/* Basic Information */}
        <div>
          <Text size="lg" weight={600} mb="sm">Basic Information</Text>
          
          <Stack spacing="sm">
            <TextInput
              label="Method Name"
              placeholder="e.g., Barrows Runs, Cooking Sharks, Flipping Dragon Items"
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              required
            />

            <Textarea
              label="Description"
              placeholder="Describe how this money making method works, what players need to do, and any important tips..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minRows={3}
              maxRows={6}
              required
            />

            <Group grow>
              <Select
                label="Category"
                placeholder="Select category"
                value={category}
                onChange={setCategory}
                data={CATEGORIES}
                required
                icon={category === 'skilling' ? <IconTarget size={16} /> : 
                      category === 'pvm' ? <IconSword size={16} /> :
                      category === 'merching' ? <IconCoin size={16} /> : null}
              />

              <Select
                label="Difficulty"
                placeholder="Select difficulty"
                value={difficulty}
                onChange={setDifficulty}
                data={DIFFICULTIES}
                required
              />
            </Group>

            <NumberInput
              label="Expected Profit Per Hour"
              placeholder="Enter expected GP per hour"
              value={profitPerHour}
              onChange={setProfitPerHour}
              min={1}
              max={100000000}
              parser={(value) => value.replace(/[^\d]/g, '')}
              formatter={(value) => value ? `${Number(value).toLocaleString()} GP/hr` : ''}
              required
            />
          </Stack>
        </div>

        <Divider />

        {/* Requirements Section */}
        <div>
          <Text size="lg" weight={600} mb="sm">Requirements</Text>
          
          <Stack spacing="sm">
            {/* Skill Requirements */}
            <div>
              <Text size="sm" weight={500} mb="xs">
                Skill Requirements <Text span color="dimmed">(optional)</Text>
              </Text>
              <Stack spacing="xs">
                {COMMON_SKILLS.map(skill => (
                  <Group key={skill} spacing="sm">
                    <Text size="sm" style={{ minWidth: 100 }}>{skill}:</Text>
                    <NumberInput
                      placeholder="Level"
                      value={requirements.skills[skill] || ''}
                      onChange={(value) => handleSkillRequirementChange(skill, value)}
                      min={1}
                      max={99}
                      style={{ width: 80 }}
                    />
                  </Group>
                ))}
              </Stack>
            </div>

            {/* Quest Requirements */}
            <MultiSelect
              label="Quest Requirements"
              placeholder="Add required quests (optional)"
              value={requirements.quests}
              onChange={handleQuestRequirementsChange}
              data={[
                'Dragon Slayer', 'Monkey Madness', 'Desert Treasure', 'Barrows Gloves (Recipe for Disaster)',
                'Fire Cape', 'Void Knight Armour', 'Lunar Diplomacy', 'Dream Mentor', 'King\'s Ransom',
                'Swan Song', 'Regicide', 'Roving Elves', 'Mourning\'s End Part II'
              ]}
              searchable
              creatable
              getCreateLabel={(query) => `+ Add "${query}"`}
              onCreate={(query) => query}
              icon={<IconBook size={16} />}
            />

            {/* Item Requirements */}
            <MultiSelect
              label="Required Items"
              placeholder="Add required items (optional)"
              value={requirements.items}
              onChange={handleItemRequirementsChange}
              data={[
                'Dragon Claws', 'Whip', 'Barrows Gear', 'Dragon Dagger(p++)', 'Rune Pouch',
                'Ring of Dueling', 'Games Necklace', 'Amulet of Glory', 'Teleport Tablets',
                'Food (Sharks/Karambwans)', 'Prayer Potions', 'Super Combat Potions'
              ]}
              searchable
              creatable
              getCreateLabel={(query) => `+ Add "${query}"`}
              onCreate={(query) => query}
            />

            {/* Other Requirements */}
            <Textarea
              label="Other Requirements"
              placeholder="Any other requirements, notes, or recommendations..."
              value={requirements.other}
              onChange={(e) => setRequirements(prev => ({ ...prev, other: e.target.value }))}
              minRows={2}
              maxRows={4}
            />
          </Stack>
        </div>

        <Divider />

        {/* Item Dependencies Section */}
        <div>
          <Text size="lg" weight={600} mb="xs">Item Dependencies</Text>
          <Text size="sm" color="dimmed" mb="sm">
            Add items that are bought/sold/used in this method for profit calculations
          </Text>
          
          {/* Add Item Dependency */}
          <ItemSearchInput
            onItemSelect={handleAddItemDependency}
            placeholder="Search and add items used in this method..."
            excludeItemIds={getUsedItemIds()}
            items={items}
            multiSelect={true}
            clearAfterSelect={false}
          />

          {/* Current Item Dependencies */}
          {itemDependencies.length > 0 && (
            <Stack spacing="xs" mt="sm">
              {itemDependencies.map((item) => (
                <Paper 
                  key={item.itemId} 
                  withBorder 
                  p="sm"
                >
                  <Group spacing="sm" position="apart">
                    <Group spacing="sm" style={{ flex: 1 }}>
                      <Image
                        src={item.img}
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
                        <Text size="sm" weight={500}>{item.itemName}</Text>
                        <Text size="xs" color="dimmed">
                          Buy: {item.low?.toLocaleString() || 'N/A'} GP • 
                          Sell: {item.high?.toLocaleString() || 'N/A'} GP
                        </Text>
                      </div>
                    </Group>
                    
                    <Group spacing="sm">
                      <NumberInput
                        value={item.quantity}
                        onChange={(value) => handleUpdateItemQuantity(item.itemId, value)}
                        min={1}
                        max={1000000}
                        style={{ width: 80 }}
                      />
                      <ActionIcon 
                        color="red" 
                        onClick={() => handleRemoveItemDependency(item.itemId)}
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

        {/* Submission Notice */}
        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
          <Text size="sm">
            Your method will be submitted for review and approval. Once approved, it will be visible to all users in the global money making methods.
          </Text>
        </Alert>

        {/* Actions */}
        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            leftIcon={<IconPlus size={16} />}
          >
            Submit for Review
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}