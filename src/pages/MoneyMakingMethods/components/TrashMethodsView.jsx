import {
  Card,
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Badge,
  Center,
  Alert,
  Title
} from '@mantine/core'
import { IconTrashX, IconRefresh, IconInfoCircle } from '@tabler/icons-react'
import { useMethodTrashScoring } from '../../../hooks/useMethodTrashScoring.js'
import { formatNumber, getRelativeTime } from '../../../utils/utils.jsx'

export default function TrashMethodsView() {
  const { userTrashMethods, toggleTrashVote, isLoading } = useMethodTrashScoring()

  const formatProfitPerHour = (profit) => {
    if (!profit || profit === 0) return 'Calculating...'
    return formatNumber(profit) + ' gp/hr'
  }

  if (isLoading) {
    return (
      <Center py="xl">
        <Text color="dimmed">Loading trashed methods...</Text>
      </Center>
    )
  }

  if (!userTrashMethods || userTrashMethods.length === 0) {
    return (
      <Card withBorder py="xl">
        <Center>
          <Stack align="center" spacing="md">
            <IconInfoCircle size={48} color="gray" />
            <div style={{ textAlign: 'center' }}>
              <Text weight={600} size="lg">
                No Trashed Methods
              </Text>
              <Text color="dimmed" size="sm">
                Methods you mark as unreliable will appear here. You can restore them or manage your trash list.
              </Text>
            </div>
          </Stack>
        </Center>
      </Card>
    )
  }

  return (
    <Stack spacing="md">
      <Group position="apart">
        <div>
          <Title order={3}>Trashed Methods</Title>
          <Text color="dimmed" size="sm">
            Methods you've marked as unreliable. Click restore to remove from trash.
          </Text>
        </div>
        <Badge color="orange" variant="filled">
          {userTrashMethods.length} method{userTrashMethods.length !== 1 ? 's' : ''}
        </Badge>
      </Group>

      <Alert color="orange" icon={<IconInfoCircle size={16} />}>
        These methods are hidden from your main view. Restore them to see them in the main list again.
      </Alert>

      <Stack spacing="xs">
        {userTrashMethods.map((method) => (
          <Card key={method.methodId} withBorder p="md">
            <Group position="apart" align="flex-start">
              <Stack spacing={4} style={{ flex: 1 }}>
                <Group spacing="xs">
                  <Text weight={600} size="sm">{method.methodName}</Text>
                  <Badge color="orange" variant="light" size="sm">Trashed</Badge>
                </Group>
                
                <Text size="xs" color="dimmed">
                  Marked as trash {getRelativeTime(method.createdAt)}
                </Text>
              </Stack>
              
              <Group spacing="xs" align="center">
                <Tooltip label="Restore method (remove from trash)">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="green"
                    onClick={() => toggleTrashVote(method.methodId, method.methodName)}
                  >
                    <IconRefresh size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}