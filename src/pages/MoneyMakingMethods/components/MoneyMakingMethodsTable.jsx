import {
  Table,
  Badge,
  Group,
  Text,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Card,
  Stack,
  Box
} from '@mantine/core'
import { IconEdit, IconTrash, IconTrashFilled, IconCoin, IconTarget, IconClock } from '@tabler/icons-react'
import { formatNumber, getRelativeTime } from '../../../utils/utils.jsx'
import { useMethodTrashScoring } from '../../../hooks/useMethodTrashScoring.js'

const DIFFICULTY_COLORS = {
  easy: 'green',
  medium: 'orange', 
  hard: 'red',
  elite: 'violet'
}

const CATEGORY_COLORS = {
  skilling: 'blue',
  pvm: 'red',
  merching: 'orange'
}

export default function MoneyMakingMethodsTable({ 
  methods, 
  onEdit, 
  onDelete, 
  showActions = false,
  showUser = false,
  customActions,
  showTrashButton = false
}) {
  const { toggleTrashVote, hasUserVoted } = useMethodTrashScoring()
  const formatProfitPerHour = (profit) => {
    if (!profit || profit === 0) return 'Calculating...'
    return formatNumber(profit) + ' gp/hr'
  }

  const getStatusBadge = (status, isGlobal) => {
    if (status === 'approved' && isGlobal) {
      return <Badge color="green" variant="filled" size="sm">Global</Badge>
    }
    if (status === 'approved') {
      return <Badge color="blue" variant="filled" size="sm">Approved</Badge>
    }
    if (status === 'pending') {
      return <Badge color="orange" variant="filled" size="sm">Pending</Badge>
    }
    if (status === 'rejected') {
      return <Badge color="red" variant="filled" size="sm">Rejected</Badge>
    }
    return <Badge color="gray" variant="filled" size="sm">{status}</Badge>
  }

  const formatRequirements = (requirements) => {
    if (!requirements || Object.keys(requirements).length === 0) {
      return <Text size="sm" color="dimmed">None specified</Text>
    }

    const parts = []
    
    if (requirements.skills) {
      const skillReqs = Object.entries(requirements.skills)
        .map(([skill, level]) => `${skill}: ${level}`)
        .join(', ')
      if (skillReqs) parts.push(`Skills: ${skillReqs}`)
    }

    if (requirements.quests && requirements.quests.length > 0) {
      parts.push(`Quests: ${requirements.quests.join(', ')}`)
    }

    if (requirements.items && requirements.items.length > 0) {
      parts.push(`Items: ${requirements.items.join(', ')}`)
    }

    if (requirements.other) {
      parts.push(`Other: ${requirements.other}`)
    }

    return (
      <Text size="sm" style={{ maxWidth: 200 }}>
        {parts.join(' • ') || 'None specified'}
      </Text>
    )
  }

  if (!methods || methods.length === 0) {
    return (
      <Card withBorder py="xl">
        <Text align="center" color="dimmed">
          No money making methods found
        </Text>
      </Card>
    )
  }

  const rows = methods.map((method) => (
    <tr key={method.id}>
      {/* Method Name & Description */}
      <td style={{ minWidth: 200 }}>
        <Stack spacing={4}>
          <Text weight={600} size="sm">{method.methodName}</Text>
          <Text size="xs" color="dimmed" lineClamp={2}>
            {method.description}
          </Text>
          {method.rejectionReason && (
            <Text size="xs" color="red" style={{ fontStyle: 'italic' }}>
              Rejected: {method.rejectionReason}
            </Text>
          )}
        </Stack>
      </td>

      {/* Category */}
      <td>
        <Badge 
          color={CATEGORY_COLORS[method.category]} 
          variant="light" 
          size="sm"
          style={{ textTransform: 'capitalize' }}
        >
          {method.category}
        </Badge>
      </td>

      {/* Difficulty */}
      <td>
        <Badge 
          color={DIFFICULTY_COLORS[method.difficulty]} 
          variant="light" 
          size="sm"
          style={{ textTransform: 'capitalize' }}
        >
          {method.difficulty}
        </Badge>
      </td>

      {/* Profit/Hour */}
      <td>
        <Group spacing="xs">
          <IconCoin size={14} color="gold" />
          <Text size="sm" weight={600}>
            {formatProfitPerHour(method.profitPerHour)}
          </Text>
        </Group>
      </td>

      {/* Requirements */}
      <td style={{ maxWidth: 250 }}>
        {formatRequirements(method.requirements)}
      </td>

      {/* Status */}
      <td>
        {getStatusBadge(method.status, method.isGlobal)}
      </td>

      {/* User (if showing global methods) */}
      {showUser && (
        <td>
          <Text size="sm" color="dimmed">@{method.username}</Text>
        </td>
      )}

      {/* Created */}
      <td>
        <Group spacing="xs">
          <IconClock size={14} />
          <Text size="xs" color="dimmed">
            {getRelativeTime(method.createdAt)}
          </Text>
        </Group>
      </td>

      {/* Actions */}
      {(showActions || showTrashButton) && (
        <td>
          <Group spacing="xs" noWrap>
            {showTrashButton && (
              <Tooltip label={hasUserVoted(method.id) ? "Remove trash vote" : "Mark as unreliable"}>
                <ActionIcon
                  size="sm"
                  variant={hasUserVoted(method.id) ? 'filled' : 'subtle'}
                  color="orange"
                  onClick={() => toggleTrashVote(method.id, method.methodName)}
                >
                  <IconTrashFilled size={14} />
                </ActionIcon>
              </Tooltip>
            )}
            {showActions && (
              <>
                {customActions ? (
                  customActions(method)
                ) : (
                  <>
                    <Tooltip label="Edit method">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => onEdit(method)}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete method permanently">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => onDelete(method.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
              </>
            )}
          </Group>
        </td>
      )}
    </tr>
  ))

  return (
    <Card withBorder>
      <ScrollArea>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Method</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Profit/Hour</th>
              <th>Requirements</th>
              <th>Status</th>
              {showUser && <th>Created By</th>}
              <th>Created</th>
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      </ScrollArea>
    </Card>
  )
}