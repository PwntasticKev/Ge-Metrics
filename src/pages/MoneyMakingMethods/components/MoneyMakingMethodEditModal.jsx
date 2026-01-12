import React, { useState, useEffect } from 'react'
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
  Alert,
  Badge,
  Divider,
  Select,
  MultiSelect,
  Textarea,
  Image
} from '@mantine/core'
import {
  IconTrash,
  IconInfoCircle,
  IconTarget,
  IconSword,
  IconCoin,
  IconBook
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

export default function MoneyMakingMethodEditModal({ opened, onClose, method, onMethodUpdated, items }) {
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

  // Update method mutation
  const updateMethodMutation = trpc.moneyMakingMethods.updateMethod.useMutation({
    onSuccess: (data) => {
      showNotification({
        title: 'Success',
        message: data.message || 'Money making method updated successfully',
        color: 'green'
      })
      onMethodUpdated()
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

  // Initialize form with method data
  useEffect(() => {
    if (method) {
      setMethodName(method.methodName || '')
      setDescription(method.description || '')
      setCategory(method.category || '')
      setDifficulty(method.difficulty || '')
      setProfitPerHour(method.profitPerHour || '')
      setRequirements(method.requirements || {
        skills: {},
        quests: [],
        items: [],
        other: ''
      })

      // Map item dependencies with current pricing data
      if (method.itemDependencies && (items || allItems)) {
        const enrichedDependencies = method.itemDependencies.map(dep => {
          // Find item in items array for proper image URL
          const itemData = items?.find(item => item.id === dep.itemId)
          const priceData = allItems?.[dep.itemId]
          
          return {
            ...dep,
            img: itemData?.icon 
              ? `https://oldschool.runescape.wiki/images/${itemData.icon.replace(/ /g, '_')}`
              : `https://oldschool.runescape.wiki/images/c/c1/${dep.itemId}.png`,
            low: priceData?.low || itemData?.low || dep.priceLow || 0,
            high: priceData?.high || itemData?.high || dep.priceHigh || 0
          }
        })
        setItemDependencies(enrichedDependencies)
      } else if (method.itemDependencies) {
        setItemDependencies(method.itemDependencies.map(dep => ({
          ...dep,
          img: `https://oldschool.runescape.wiki/images/c/c1/${dep.itemId}.png`,
          low: dep.priceLow || 0,
          high: dep.priceHigh || 0
        })))
      }
    }
  }, [method, allItems, items])

  const handleUpdateItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setItemDependencies(prev => prev.filter(dep => dep.itemId !== itemId))
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

  const handleRemoveItemDependency = (itemId) => {
    setItemDependencies(prev => prev.filter(dep => dep.itemId !== itemId))
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

    await updateMethodMutation.mutateAsync({
      id: method.id,
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

  if (!method) return null

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Money Making Method"
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
        {/* Status Badge */}
        {method.status && (
          <Group>
            <Badge 
              color={method.status === 'approved' ? 'green' : method.status === 'pending' ? 'orange' : 'red'}
              variant="filled"
            >
              {method.status === 'approved' ? 'Approved' : 
               method.status === 'pending' ? 'Pending Review' :
               method.status === 'rejected' ? 'Rejected' : method.status}
            </Badge>
            {method.isGlobal && (
              <Badge color="blue" variant="outline">
                Global Method
              </Badge>
            )}
          </Group>
        )}

        {/* Rejection Reason Alert */}
        {method.status === 'rejected' && method.rejectionReason && (
          <Alert color="red" icon={<IconInfoCircle size={16} />}>
            <Text size="sm" weight={500}>Rejection Reason:</Text>
            <Text size="sm">{method.rejectionReason}</Text>
          </Alert>
        )}

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
            Items that are bought/sold/used in this method for profit calculations
          </Text>
          
          {/* Current Item Dependencies */}
          {itemDependencies.length > 0 ? (
            <Stack spacing="xs">
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
          ) : (
            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                No item dependencies added. Item dependencies help with automatic profit calculations.
              </Text>
            </Alert>
          )}
          <Text size="xs" color="dimmed" mt="xs">
            💡 Note: Item dependencies cannot be added through editing. Use the creation modal to add items initially.
          </Text>
        </div>

        {/* Resubmission Notice */}
        {method.status === 'rejected' && (
          <Alert color="orange" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              After making changes, your method will be resubmitted for review.
            </Text>
          </Alert>
        )}

        {/* Actions */}
        <Group position="right" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}