import React, { useState } from 'react'
import {
  ActionIcon,
  Indicator
} from '@mantine/core'
import { IconMessage, IconMessageCircle } from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import MessagesModal from './MessagesModal.jsx'
import { useAuth } from '../../hooks/useAuth'

export default function MessagesButton() {
  const [modalOpened, setModalOpened] = useState(false)
  const { user } = useAuth()
  
  // Fetch unread count for badge
  const { data: unreadCount } = trpc.messages.getUnreadCount.useQuery()

  const hasUnreadMessages = unreadCount?.count > 0

  return (
    <>
      <Indicator
        inline
        label={unreadCount?.count || 0}
        size={16}
        color="blue"
        disabled={!hasUnreadMessages}
        offset={7}
      >
        <ActionIcon
          variant={hasUnreadMessages ? 'filled' : 'subtle'}
          color={hasUnreadMessages ? 'blue' : 'gray'}
          size="lg"
          onClick={() => setModalOpened(true)}
        >
          {hasUnreadMessages ? (
            <IconMessageCircle size="1.1rem" />
          ) : (
            <IconMessage size="1.1rem" />
          )}
        </ActionIcon>
      </Indicator>

      <MessagesModal 
        opened={modalOpened} 
        onClose={() => setModalOpened(false)}
        user={user}
      />
    </>
  )
}