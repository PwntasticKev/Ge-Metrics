import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Select,
  Textarea,
  Modal,
  Badge,
  Accordion,
  Code,
  Paper,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Divider,
  Alert,
  Tabs,
  NumberInput,
  Switch,
  MultiSelect,
  Collapse,
  Box,
  Anchor
} from '@mantine/core'
import {
  IconBook,
  IconEdit,
  IconPlus,
  IconTrash,
  IconCopy,
  IconCode,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconAlertCircle,
  IconCalculator,
  IconFormula,
  IconBrandPython,
  IconMath,
  IconDatabase,
  IconApi,
  IconBulb,
  IconEye,
  IconDownload,
  IconUpload
} from '@tabler/icons-react'
import { Prism } from '@mantine/prism'
import { notifications } from '@mantine/notifications'

const FormulaDocumentation = () => {
  const [activeTab, setActiveTab] = useState('browse')
  const [formulas, setFormulas] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedFormula, setSelectedFormula] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category: '',
    description: '',
    formula: '',
    parameters: [],
    examples: [],
    notes: '',
    tags: [],
    complexity: 'beginner',
    isActive: true
  })

  // Mock data - in production this would come from backend
  useEffect(() => {
    const mockFormulas = [
      {
        id: 1,
        name: 'Profit Margin Calculation',
        category: 'trading',
        description: 'Calculates the profit margin percentage for trading items between different prices.',
        formula: '((selling_price - buying_price) / buying_price) * 100',
        parameters: [
          { name: 'selling_price', type: 'number', description: 'The price at which the item is sold', required: true },
          { name: 'buying_price', type: 'number', description: 'The price at which the item was bought', required: true }
        ],
        examples: [
          {
            title: 'Basic Example',
            input: { selling_price: 1000, buying_price: 800 },
            output: 25,
            explanation: 'Selling for 1000gp when bought for 800gp gives 25% profit margin'
          }
        ],
        notes: 'This formula assumes no additional costs like GE tax. For more accurate calculations, subtract tax from selling price first.',
        tags: ['profit', 'trading', 'margin', 'percentage'],
        complexity: 'beginner',
        isActive: true,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-20'
      },
      {
        id: 2,
        name: 'ROI with Time Factor',
        category: 'trading',
        description: 'Calculates return on investment considering the time factor for flipping items.',
        formula: '(((selling_price - buying_price) / buying_price) * 100) * (24 / hours_to_sell)',
        parameters: [
          { name: 'selling_price', type: 'number', description: 'Final selling price', required: true },
          { name: 'buying_price', type: 'number', description: 'Initial buying price', required: true },
          { name: 'hours_to_sell', type: 'number', description: 'Time taken to sell in hours', required: true }
        ],
        examples: [
          {
            title: 'Quick Flip',
            input: { selling_price: 1200, buying_price: 1000, hours_to_sell: 2 },
            output: 240,
            explanation: '20% profit in 2 hours = 240% daily ROI rate'
          }
        ],
        notes: 'This metric helps compare different flipping opportunities by normalizing profits to a daily rate.',
        tags: ['roi', 'time', 'flipping', 'efficiency'],
        complexity: 'intermediate',
        isActive: true,
        createdAt: '2024-01-10',
        updatedAt: '2024-01-22'
      },
      {
        id: 3,
        name: 'Combat XP Per Hour',
        category: 'skilling',
        description: 'Calculates experience per hour for combat activities with varying kill times.',
        formula: '(xp_per_kill * (3600 / (kill_time + bank_time))) * efficiency_factor',
        parameters: [
          { name: 'xp_per_kill', type: 'number', description: 'Experience gained per kill', required: true },
          { name: 'kill_time', type: 'number', description: 'Average time per kill in seconds', required: true },
          { name: 'bank_time', type: 'number', description: 'Time spent banking/resupplying in seconds', required: true },
          { name: 'efficiency_factor', type: 'number', description: 'Efficiency factor (0.8-1.0)', required: true, default: 0.9 }
        ],
        examples: [
          {
            title: 'Dragon Slaying',
            input: { xp_per_kill: 125, kill_time: 45, bank_time: 15, efficiency_factor: 0.9 },
            output: 67500,
            explanation: 'Killing dragons with these stats yields approximately 67.5k XP/hour'
          }
        ],
        notes: 'Efficiency factor accounts for mistakes, breaks, and non-optimal play. Use 0.9 for average players.',
        tags: ['combat', 'xp', 'efficiency', 'skilling'],
        complexity: 'intermediate',
        isActive: true,
        createdAt: '2024-01-12',
        updatedAt: '2024-01-18'
      },
      {
        id: 4,
        name: 'Compound Interest Investment',
        category: 'investment',
        description: 'Calculates the future value of investments with compound interest over time.',
        formula: 'principal * Math.pow((1 + (annual_rate / 100)), years)',
        parameters: [
          { name: 'principal', type: 'number', description: 'Initial investment amount', required: true },
          { name: 'annual_rate', type: 'number', description: 'Annual interest rate as percentage', required: true },
          { name: 'years', type: 'number', description: 'Number of years to compound', required: true }
        ],
        examples: [
          {
            title: 'Long-term Investment',
            input: { principal: 100000000, annual_rate: 5, years: 10 },
            output: 162889462,
            explanation: '100M GP invested at 5% annually becomes ~163M GP after 10 years'
          }
        ],
        notes: 'This assumes perfect compound interest. Real OSRS investments may have different risk/return profiles.',
        tags: ['investment', 'compound', 'interest', 'long-term'],
        complexity: 'advanced',
        isActive: true,
        createdAt: '2024-01-08',
        updatedAt: '2024-01-25'
      },
      {
        id: 5,
        name: 'Potion Brewing Efficiency',
        category: 'skilling',
        description: 'Optimizes potion brewing by calculating the most efficient combination of ingredients.',
        formula: '((finished_potion_value - ingredient_cost) / brewing_time) * success_rate',
        parameters: [
          { name: 'finished_potion_value', type: 'number', description: 'Market value of completed potion', required: true },
          { name: 'ingredient_cost', type: 'number', description: 'Total cost of all ingredients', required: true },
          { name: 'brewing_time', type: 'number', description: 'Time to brew one potion in seconds', required: true },
          { name: 'success_rate', type: 'number', description: 'Success rate as decimal (0-1)', required: true }
        ],
        examples: [
          {
            title: 'Prayer Potion Brewing',
            input: { finished_potion_value: 8500, ingredient_cost: 7200, brewing_time: 18, success_rate: 0.95 },
            output: 68.61,
            explanation: 'Prayer potions yield ~69 GP profit per second with 95% success rate'
          }
        ],
        notes: 'Consider secondary ingredient costs and current market prices. Success rate varies by Herblore level.',
        tags: ['herblore', 'brewing', 'potions', 'efficiency'],
        complexity: 'intermediate',
        isActive: true,
        createdAt: '2024-01-14',
        updatedAt: '2024-01-21'
      }
    ]

    const mockCategories = [
      { value: 'trading', label: 'Trading & Flipping' },
      { value: 'skilling', label: 'Skilling Calculations' },
      { value: 'investment', label: 'Investment Analysis' },
      { value: 'combat', label: 'Combat Efficiency' },
      { value: 'general', label: 'General Formulas' }
    ]

    setFormulas(mockFormulas)
    setCategories(mockCategories)
  }, [])

  // Filter formulas based on search and category
  const filteredFormulas = formulas.filter(formula => {
    const matchesSearch = formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formula.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formula.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !selectedCategory || formula.category === selectedCategory
    return matchesSearch && matchesCategory && formula.isActive
  })

  const resetFormData = () => {
    setFormData({
      id: null,
      name: '',
      category: '',
      description: '',
      formula: '',
      parameters: [],
      examples: [],
      notes: '',
      tags: [],
      complexity: 'beginner',
      isActive: true
    })
  }

  const handleEdit = (formula) => {
    setFormData(formula)
    setEditModalOpen(true)
  }

  const handleCreate = () => {
    resetFormData()
    setCreateModalOpen(true)
  }

  const handleDelete = (formula) => {
    setSelectedFormula(formula)
    setDeleteModalOpen(true)
  }

  const handleSave = () => {
    if (formData.id) {
      // Update existing formula
      setFormulas(formulas.map(f => f.id === formData.id ? { ...formData, updatedAt: new Date().toISOString().split('T')[0] } : f))
      setEditModalOpen(false)
      notifications.show({
        title: 'Success',
        message: 'Formula updated successfully',
        color: 'green'
      })
    } else {
      // Create new formula
      const newFormula = {
        ...formData,
        id: Math.max(...formulas.map(f => f.id)) + 1,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }
      setFormulas([...formulas, newFormula])
      setCreateModalOpen(false)
      notifications.show({
        title: 'Success',
        message: 'Formula created successfully',
        color: 'green'
      })
    }
    resetFormData()
  }

  const handleDeleteConfirm = () => {
    setFormulas(formulas.filter(f => f.id !== selectedFormula.id))
    setDeleteModalOpen(false)
    setSelectedFormula(null)
    notifications.show({
      title: 'Success',
      message: 'Formula deleted successfully',
      color: 'green'
    })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    notifications.show({
      title: 'Copied',
      message: 'Formula copied to clipboard',
      color: 'blue'
    })
  }

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'beginner': return 'green'
      case 'intermediate': return 'yellow'
      case 'advanced': return 'red'
      default: return 'gray'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'trading': return <IconCalculator size={16} />
      case 'skilling': return <IconBulb size={16} />
      case 'investment': return <IconDatabase size={16} />
      case 'combat': return <IconMath size={16} />
      default: return <IconFormula size={16} />
    }
  }

  // Browse Tab
  const BrowseTab = () => (
    <Stack spacing="lg">
      {/* Search and Filter Bar */}
      <Card withBorder>
        <Grid>
          <Grid.Col md={6}>
            <TextInput
              placeholder="Search formulas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<IconSearch size={16} />}
            />
          </Grid.Col>
          <Grid.Col md={4}>
            <Select
              placeholder="Filter by category"
              value={selectedCategory}
              onChange={setSelectedCategory}
              data={categories}
              clearable
              icon={<IconFilter size={16} />}
            />
          </Grid.Col>
          <Grid.Col md={2}>
            <Button fullWidth onClick={handleCreate} leftIcon={<IconPlus size={16} />}>
              Add Formula
            </Button>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Formulas Grid */}
      <Grid>
        {filteredFormulas.map((formula) => (
          <Grid.Col key={formula.id} md={6} lg={4}>
            <Card withBorder h="100%">
              <Card.Section withBorder inheritPadding py="xs">
                <Group position="apart" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group spacing="xs" mb="xs">
                      {getCategoryIcon(formula.category)}
                      <Text weight={500} size="sm">{formula.name}</Text>
                    </Group>
                    <Group spacing="xs">
                      <Badge size="xs" color={getComplexityColor(formula.complexity)}>
                        {formula.complexity}
                      </Badge>
                      <Badge size="xs" variant="light">
                        {categories.find(c => c.value === formula.category)?.label}
                      </Badge>
                    </Group>
                  </div>
                  <Group spacing="xs">
                    <ActionIcon size="sm" onClick={() => copyToClipboard(formula.formula)}>
                      <IconCopy size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" onClick={() => handleEdit(formula)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" color="red" onClick={() => handleDelete(formula)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card.Section>

              <Card.Section inheritPadding py="md">
                <Stack spacing="sm">
                  <Text size="sm" color="dimmed" lineClamp={3}>
                    {formula.description}
                  </Text>

                  <Paper p="xs" withBorder>
                    <Code block color="blue" style={{ fontSize: '11px' }}>
                      {formula.formula}
                    </Code>
                  </Paper>

                  <Group spacing="xs">
                    {formula.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} size="xs" variant="dot">
                        {tag}
                      </Badge>
                    ))}
                    {formula.tags.length > 3 && (
                      <Text size="xs" color="dimmed">+{formula.tags.length - 3} more</Text>
                    )}
                  </Group>

                  <Text size="xs" color="dimmed">
                    Updated: {formula.updatedAt}
                  </Text>
                </Stack>
              </Card.Section>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {filteredFormulas.length === 0 && (
        <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
          <Stack spacing="md" align="center">
            <IconBook size={48} color="gray" />
            <div>
              <Text size="lg" weight={500}>No formulas found</Text>
              <Text size="sm" color="dimmed">
                {searchTerm || selectedCategory 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first formula'
                }
              </Text>
            </div>
            {!searchTerm && !selectedCategory && (
              <Button onClick={handleCreate} leftIcon={<IconPlus size={16} />}>
                Create Formula
              </Button>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  )

  // Calculator Tab
  const CalculatorTab = () => {
    const [selectedFormulaId, setSelectedFormulaId] = useState('')
    const [inputs, setInputs] = useState({})
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const selectedFormula = formulas.find(f => f.id === parseInt(selectedFormulaId))

    const calculateResult = () => {
      if (!selectedFormula) return

      try {
        setError('')
        
        // Validate required inputs
        for (const param of selectedFormula.parameters) {
          if (param.required && (inputs[param.name] === undefined || inputs[param.name] === '')) {
            setError(`${param.name} is required`)
            return
          }
        }

        // Create a safe evaluation context
        const context = { ...inputs }
        
        // Add Math functions to context
        context.Math = Math
        
        // Simple formula evaluation (in production, use a proper math parser)
        let formula = selectedFormula.formula
        
        // Replace parameter names with values
        for (const [key, value] of Object.entries(inputs)) {
          const regex = new RegExp(`\\b${key}\\b`, 'g')
          formula = formula.replace(regex, value)
        }
        
        // Basic evaluation (WARNING: In production, use a safe math parser!)
        const calculatedResult = Function(`"use strict"; return (${formula})`)()
        
        setResult(calculatedResult)
      } catch (err) {
        setError('Error calculating result: ' + err.message)
        setResult(null)
      }
    }

    useEffect(() => {
      if (selectedFormula) {
        const newInputs = {}
        selectedFormula.parameters.forEach(param => {
          newInputs[param.name] = param.default || ''
        })
        setInputs(newInputs)
        setResult(null)
        setError('')
      }
    }, [selectedFormulaId])

    return (
      <Stack spacing="lg">
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Formula Calculator</Title>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Select
              label="Select Formula"
              placeholder="Choose a formula to calculate"
              value={selectedFormulaId}
              onChange={setSelectedFormulaId}
              data={formulas.filter(f => f.isActive).map(f => ({
                value: f.id.toString(),
                label: `${f.name} (${f.category})`
              }))}
            />
          </Card.Section>
        </Card>

        {selectedFormula && (
          <Grid>
            <Grid.Col md={6}>
              <Card withBorder>
                <Card.Section withBorder inheritPadding py="xs">
                  <Title order={5}>Formula Details</Title>
                </Card.Section>
                <Card.Section inheritPadding py="md">
                  <Stack spacing="md">
                    <div>
                      <Text weight={500}>{selectedFormula.name}</Text>
                      <Text size="sm" color="dimmed">{selectedFormula.description}</Text>
                    </div>

                    <Paper p="sm" withBorder>
                      <Text size="xs" color="dimmed" mb="xs">Formula:</Text>
                      <Code block>{selectedFormula.formula}</Code>
                    </Paper>

                    <div>
                      <Text size="sm" weight={500} mb="xs">Parameters:</Text>
                      <Stack spacing="xs">
                        {selectedFormula.parameters.map((param) => (
                          <Paper key={param.name} p="xs" withBorder>
                            <Text size="sm" weight={500}>{param.name}</Text>
                            <Text size="xs" color="dimmed">{param.description}</Text>
                            {param.required && <Badge size="xs" color="red">Required</Badge>}
                          </Paper>
                        ))}
                      </Stack>
                    </div>
                  </Stack>
                </Card.Section>
              </Card>
            </Grid.Col>

            <Grid.Col md={6}>
              <Card withBorder>
                <Card.Section withBorder inheritPadding py="xs">
                  <Title order={5}>Calculator</Title>
                </Card.Section>
                <Card.Section inheritPadding py="md">
                  <Stack spacing="md">
                    {selectedFormula.parameters.map((param) => (
                      <NumberInput
                        key={param.name}
                        label={param.name}
                        description={param.description}
                        placeholder={`Enter ${param.name}`}
                        value={inputs[param.name] || ''}
                        onChange={(value) => setInputs({ ...inputs, [param.name]: value })}
                        required={param.required}
                      />
                    ))}

                    <Button onClick={calculateResult} leftIcon={<IconCalculator size={16} />}>
                      Calculate
                    </Button>

                    {error && (
                      <Alert icon={<IconAlertCircle size={16} />} color="red">
                        {error}
                      </Alert>
                    )}

                    {result !== null && (
                      <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
                        <Group position="apart">
                          <div>
                            <Text size="sm" color="dimmed">Result:</Text>
                            <Text size="xl" weight={700} color="green">
                              {typeof result === 'number' ? result.toLocaleString() : result}
                            </Text>
                          </div>
                          <ActionIcon onClick={() => copyToClipboard(result.toString())}>
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Group>
                      </Paper>
                    )}

                    {selectedFormula.examples && selectedFormula.examples.length > 0 && (
                      <div>
                        <Text size="sm" weight={500} mb="xs">Examples:</Text>
                        <Accordion>
                          {selectedFormula.examples.map((example, index) => (
                            <Accordion.Item key={index} value={index.toString()}>
                              <Accordion.Control>{example.title}</Accordion.Control>
                              <Accordion.Panel>
                                <Stack spacing="xs">
                                  <div>
                                    <Text size="xs" color="dimmed">Input:</Text>
                                    <Code block>{JSON.stringify(example.input, null, 2)}</Code>
                                  </div>
                                  <div>
                                    <Text size="xs" color="dimmed">Output:</Text>
                                    <Code>{example.output}</Code>
                                  </div>
                                  <Text size="sm">{example.explanation}</Text>
                                </Stack>
                              </Accordion.Panel>
                            </Accordion.Item>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </Stack>
                </Card.Section>
              </Card>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    )
  }

  // Form Modal Content
  const FormModalContent = () => (
    <Stack spacing="md">
      <Grid>
        <Grid.Col md={8}>
          <TextInput
            label="Formula Name"
            placeholder="Enter formula name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid.Col>
        <Grid.Col md={4}>
          <Select
            label="Category"
            placeholder="Select category"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            data={categories}
            required
          />
        </Grid.Col>
      </Grid>

      <Textarea
        label="Description"
        placeholder="Describe what this formula calculates"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        minRows={3}
        required
      />

      <Textarea
        label="Formula"
        placeholder="Enter the mathematical formula (use parameter names as variables)"
        value={formData.formula}
        onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
        minRows={2}
        required
        style={{ fontFamily: 'monospace' }}
      />

      <Grid>
        <Grid.Col md={6}>
          <Select
            label="Complexity"
            value={formData.complexity}
            onChange={(value) => setFormData({ ...formData, complexity: value })}
            data={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' }
            ]}
          />
        </Grid.Col>
        <Grid.Col md={6}>
          <Switch
            label="Active"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.currentTarget.checked })}
            mt="xl"
          />
        </Grid.Col>
      </Grid>

      <MultiSelect
        label="Tags"
        placeholder="Add tags for easier searching"
        value={formData.tags}
        onChange={(value) => setFormData({ ...formData, tags: value })}
        data={formData.tags.map(tag => ({ value: tag, label: tag }))}
        searchable
        creatable
        getCreateLabel={(query) => `+ Create "${query}"`}
        onCreate={(query) => {
          const newTags = [...formData.tags, query]
          setFormData({ ...formData, tags: newTags })
          return query
        }}
      />

      <Textarea
        label="Notes"
        placeholder="Additional notes or warnings about this formula"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        minRows={3}
      />
    </Stack>
  )

  return (
    <Container size="xl">
      <Group position="apart" mb="xl">
        <Title order={2}>Formula Documentation</Title>
        <Group>
          <Button variant="light" leftIcon={<IconDownload size={16} />}>
            Export
          </Button>
          <Button variant="light" leftIcon={<IconUpload size={16} />}>
            Import
          </Button>
        </Group>
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="browse" icon={<IconBook size={16} />}>
            Browse Formulas
          </Tabs.Tab>
          <Tabs.Tab value="calculator" icon={<IconCalculator size={16} />}>
            Calculator
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="browse" pt="md">
          <BrowseTab />
        </Tabs.Panel>

        <Tabs.Panel value="calculator" pt="md">
          <CalculatorTab />
        </Tabs.Panel>
      </Tabs>

      {/* Create/Edit Modal */}
      <Modal
        opened={editModalOpen || createModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setCreateModalOpen(false)
          resetFormData()
        }}
        title={editModalOpen ? 'Edit Formula' : 'Create New Formula'}
        size="xl"
      >
        <FormModalContent />
        <Group position="right" mt="md">
          <Button
            variant="light"
            onClick={() => {
              setEditModalOpen(false)
              setCreateModalOpen(false)
              resetFormData()
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || !formData.category || !formData.description || !formData.formula}
          >
            {editModalOpen ? 'Update' : 'Create'}
          </Button>
        </Group>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedFormula(null)
        }}
        title="Delete Formula"
        size="sm"
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete the formula "{selectedFormula?.name}"? This action cannot be undone.
          </Text>
          <Group position="right">
            <Button
              variant="light"
              onClick={() => {
                setDeleteModalOpen(false)
                setSelectedFormula(null)
              }}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default FormulaDocumentation