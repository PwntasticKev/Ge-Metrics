import React, { useState } from 'react'
import {
  Modal,
  Title,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Select,
  NumberInput,
  Switch,
  Divider,
  Badge,
  ActionIcon,
  Tooltip,
  Card
} from '@mantine/core'
import {
  IconPlus,
  IconTrash,
  IconTarget,
  IconTrophy,
  IconEdit,
  IconCheck,
  IconX
} from '@tabler/icons-react'

const UserGoals = ({ opened, onClose, userGoals = [], onSave }) => {
  const [goals, setGoals] = useState(userGoals)
  const [editingGoal, setEditingGoal] = useState(null)
  const [newGoal, setNewGoal] = useState({
    type: 'profit',
    target: '',
    description: '',
    deadline: '',
    isActive: true
  })

  const goalTypes = [
    { value: 'profit', label: 'Profit Target', icon: IconTrophy },
    { value: 'transactions', label: 'Transaction Count', icon: IconTarget },
    { value: 'items', label: 'Items Traded', icon: IconTarget },
    { value: 'streak', label: 'Trading Streak', icon: IconTarget }
  ]

  const handleAddGoal = () => {
    if (!newGoal.target || !newGoal.description) return

    const goal = {
      id: Date.now().toString(),
      ...newGoal,
      createdAt: new Date().toISOString(),
      progress: 0
    }

    setGoals([...goals, goal])
    setNewGoal({
      type: 'profit',
      target: '',
      description: '',
      deadline: '',
      isActive: true
    })
  }

  const handleEditGoal = (goalId) => {
    const goal = goals.find(g => g.id === goalId)
    if (goal) {
      setEditingGoal({ ...goal })
    }
  }

  const handleSaveEdit = () => {
    if (!editingGoal) return

    setGoals(goals.map(goal =>
      goal.id === editingGoal.id ? editingGoal : goal
    ))
    setEditingGoal(null)
  }

  const handleDeleteGoal = (goalId) => {
    setGoals(goals.filter(goal => goal.id !== goalId))
  }

  const handleToggleGoal = (goalId) => {
    setGoals(goals.map(goal =>
      goal.id === goalId ? { ...goal, isActive: !goal.isActive } : goal
    ))
  }

  const handleSave = () => {
    onSave?.(goals)
    onClose()
  }

  const formatGoalValue = (type, value) => {
    switch (type) {
      case 'profit':
        return `$${parseInt(value).toLocaleString()}`
      case 'transactions':
        return `${value} transactions`
      case 'items':
        return `${value} items`
      case 'streak':
        return `${value} days`
      default:
        return value
    }
  }

  const getGoalTypeIcon = (type) => {
    const goalType = goalTypes.find(gt => gt.value === type)
    return goalType ? goalType.icon : IconTarget
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Manage Goals"
      size="lg"
      overlayProps={{
        blur: 3,
        opacity: 0.55
      }}
    >
      <Stack spacing="md">
        {/* Add New Goal */}
        <Card withBorder p="md">
          <Title order={4} mb="md">Add New Goal</Title>
          <Stack spacing="sm">
            <Group grow>
              <Select
                label="Goal Type"
                data={goalTypes.map(gt => ({ value: gt.value, label: gt.label }))}
                value={newGoal.type}
                onChange={(value) => setNewGoal({ ...newGoal, type: value })}
              />
              <NumberInput
                label="Target Value"
                placeholder="Enter target value"
                value={newGoal.target}
                onChange={(value) => setNewGoal({ ...newGoal, target: value })}
                min={0}
              />
            </Group>
            <TextInput
              label="Description"
              placeholder="Describe your goal"
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            />
            <TextInput
              label="Deadline (Optional)"
              placeholder="YYYY-MM-DD"
              value={newGoal.deadline}
              onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
            />
            <Group position="apart">
              <Switch
                label="Active"
                checked={newGoal.isActive}
                onChange={(e) => setNewGoal({ ...newGoal, isActive: e.currentTarget.checked })}
              />
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={handleAddGoal}
                disabled={!newGoal.target || !newGoal.description}
              >
                Add Goal
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Existing Goals */}
        <Card withBorder p="md">
          <Title order={4} mb="md">Your Goals</Title>
          {goals.length === 0
            ? (
            <Text color="dimmed" align="center" py="xl">
              No goals set yet. Add your first goal above!
            </Text>
              )
            : (
            <Stack spacing="sm">
              {goals.map((goal) => {
                const IconComponent = getGoalTypeIcon(goal.type)
                const isEditing = editingGoal?.id === goal.id

                return (
                  <Card key={goal.id} withBorder p="sm">
                    {isEditing
                      ? (
                      <Stack spacing="sm">
                        <Group grow>
                          <Select
                            data={goalTypes.map(gt => ({ value: gt.value, label: gt.label }))}
                            value={editingGoal.type}
                            onChange={(value) => setEditingGoal({ ...editingGoal, type: value })}
                          />
                          <NumberInput
                            value={editingGoal.target}
                            onChange={(value) => setEditingGoal({ ...editingGoal, target: value })}
                            min={0}
                          />
                        </Group>
                        <TextInput
                          value={editingGoal.description}
                          onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                        />
                        <Group position="apart">
                          <Switch
                            checked={editingGoal.isActive}
                            onChange={(e) => setEditingGoal({ ...editingGoal, isActive: e.currentTarget.checked })}
                          />
                          <Group>
                            <ActionIcon
                              color="green"
                              onClick={handleSaveEdit}
                              disabled={!editingGoal.target || !editingGoal.description}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                            <ActionIcon color="red" onClick={() => setEditingGoal(null)}>
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Stack>
                        )
                      : (
                      <Group position="apart">
                        <Group>
                          <IconComponent size={20} />
                          <div>
                            <Text weight={500}>{goal.description}</Text>
                            <Text size="sm" color="dimmed">
                              Target: {formatGoalValue(goal.type, goal.target)}
                            </Text>
                            {goal.deadline && (
                              <Text size="xs" color="dimmed">
                                Deadline: {new Date(goal.deadline).toLocaleDateString()}
                              </Text>
                            )}
                          </div>
                        </Group>
                        <Group>
                          <Badge color={goal.isActive ? 'green' : 'gray'}>
                            {goal.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Tooltip label="Edit goal">
                            <ActionIcon onClick={() => handleEditGoal(goal.id)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Toggle active">
                            <ActionIcon onClick={() => handleToggleGoal(goal.id)}>
                              <IconCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete goal">
                            <ActionIcon color="red" onClick={() => handleDeleteGoal(goal.id)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                        )}
                  </Card>
                )
              })}
            </Stack>
              )}
        </Card>

        {/* Actions */}
        <Group position="apart">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default UserGoals
