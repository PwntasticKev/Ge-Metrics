import React, { useState } from 'react'
import {
  ActionIcon,
  Indicator,
  Popover,
  Stack,
  Text,
  Badge,
  Group,
  Button,
  ScrollArea,
  Divider,
  Box,
  Center,
  Loader
} from '@mantine/core'
import { IconBell, IconBellRinging } from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { formatDistanceToNow } from 'date-fns'

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }
    if (notification.action_url) {
      window.open(notification.action_url, '_blank')
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'error': return 'red'
      case 'warning': return 'yellow'
      case 'success': return 'green'
      case 'system': return 'blue'
      default: return 'gray'
    }
  }

  return (
    <Box
      p="sm"
      style={{
        backgroundColor: notification.is_read ? 'transparent' : 'rgba(34, 139, 34, 0.1)',
        borderRadius: '4px',
        cursor: notification.action_url ? 'pointer' : 'default'
      }}
      onClick={handleClick}
    >
      <Group position="apart" align="flex-start">
        <Box style={{ flex: 1 }}>
          <Group spacing="xs" mb="xs">
            <Badge color={getTypeColor(notification.type)} size="xs">
              {notification.type}
            </Badge>
            {!notification.is_read && (
              <Badge color="green" size="xs" variant="dot" />
            )}
          </Group>
          
          <Text weight={notification.is_read ? 400 : 600} size="sm" mb="xs">
            {notification.title}
          </Text>
          
          <Text size="xs" color="dimmed" lineClamp={2} mb="xs">
            {notification.message}
          </Text>
          
          <Text size="xs" color="dimmed">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </Text>
        </Box>
      </Group>
    </Box>
  )
}

export default function NotificationBell() {
  const [opened, setOpened] = useState(false)
  
  // Fetch unread count for badge
  const { data: unreadCount, refetch: refetchCount } = trpc.notifications.getUnreadCount.useQuery()
  
  // Fetch notifications when dropdown opens
  const { 
    data: notifications, 
    isLoading, 
    refetch: refetchNotifications 
  } = trpc.notifications.getUserNotifications.useQuery(
    { limit: 10, unreadOnly: false },
    { enabled: opened }
  )

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchCount()
      refetchNotifications()
    }
  })

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchCount()
      refetchNotifications()
    }
  })

  // Delete notification mutation
  const deleteNotificationMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: () => {
      refetchCount()
      refetchNotifications()
    }
  })

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate({ notificationId })
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const handleDelete = (notificationId) => {
    deleteNotificationMutation.mutate({ notificationId })
  }

  const hasUnreadNotifications = unreadCount?.count > 0

  return (
    <Popover
      width={350}
      position="bottom-end"
      withArrow
      shadow="md"
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <Indicator
          inline
          label={unreadCount?.count || 0}
          size={16}
          color="red"
          disabled={!hasUnreadNotifications}
          offset={7}
        >
          <ActionIcon
            variant={hasUnreadNotifications ? 'filled' : 'subtle'}
            color={hasUnreadNotifications ? 'blue' : 'gray'}
            size="lg"
            onClick={() => setOpened((o) => !o)}
          >
            {hasUnreadNotifications ? (
              <IconBellRinging size="1.1rem" />
            ) : (
              <IconBell size="1.1rem" />
            )}
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Box p="md" pb="sm">
          <Group position="apart">
            <Text weight={600}>Notifications</Text>
            {hasUnreadNotifications && (
              <Button
                variant="subtle"
                size="xs"
                onClick={handleMarkAllAsRead}
                loading={markAllAsReadMutation.isLoading}
              >
                Mark all read
              </Button>
            )}
          </Group>
        </Box>

        <Divider />

        {isLoading ? (
          <Center p="xl">
            <Loader size="sm" />
          </Center>
        ) : notifications?.length === 0 ? (
          <Center p="xl">
            <Stack align="center" spacing="xs">
              <IconBell size="2rem" color="gray" />
              <Text color="dimmed" size="sm">
                No notifications yet
              </Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea h={400}>
            <Stack spacing={0}>
              {notifications?.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Stack>
          </ScrollArea>
        )}

        <Divider />
        
        <Box p="sm">
          <Button
            variant="subtle"
            size="xs"
            fullWidth
            onClick={() => {
              setOpened(false)
              // TODO: Navigate to full notifications page
            }}
          >
            View all notifications
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  )
}