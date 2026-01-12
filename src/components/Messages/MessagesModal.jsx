import React, { useState } from 'react'
import {
  Modal,
  Text,
  Stack,
  Group,
  Badge,
  Button,
  TextInput,
  Textarea,
  ScrollArea,
  Box,
  Divider,
  ActionIcon,
  Center,
  Loader
} from '@mantine/core'
import { IconSend, IconTrash, IconMessage } from '@tabler/icons-react'
import { trpc } from '../../utils/trpc.jsx'
import { formatDistanceToNow } from 'date-fns'

const MessageItem = ({ message, onMarkAsRead, onDelete, currentUserId }) => {
  const handleClick = () => {
    if (!message.is_read && message.to_user_id === currentUserId) {
      onMarkAsRead(message.id)
    }
  }

  const isFromCurrentUser = message.from_user_id === currentUserId
  const isUnread = !message.is_read && message.to_user_id === currentUserId

  return (
    <Box
      p="sm"
      style={{
        backgroundColor: isUnread ? 'rgba(34, 139, 34, 0.1)' : 'transparent',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
      onClick={handleClick}
    >
      <Group position="apart" align="flex-start" mb="xs">
        <Group spacing="xs">
          <Text size="sm" weight={600}>
            {isFromCurrentUser ? `To: ${message.to_username}` : `From: ${message.from_username}`}
          </Text>
          {isUnread && (
            <Badge color="green" size="xs" variant="dot" />
          )}
        </Group>
        
        <Group spacing="xs">
          <Text size="xs" color="dimmed">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </Text>
          {message.to_user_id === currentUserId && (
            <ActionIcon
              size="xs"
              color="red"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(message.id)
              }}
            >
              <IconTrash size="0.75rem" />
            </ActionIcon>
          )}
        </Group>
      </Group>
      
      {message.subject && (
        <Text size="sm" weight={500} mb="xs" color="blue">
          {message.subject}
        </Text>
      )}
      
      <Text size="sm" color="dimmed" lineClamp={3}>
        {message.content}
      </Text>
    </Box>
  )
}

export default function MessagesModal({ opened, onClose, user }) {
  const [showCompose, setShowCompose] = useState(false)
  const [recipientId, setRecipientId] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  // Fetch messages
  const { 
    data: messages, 
    isLoading, 
    refetch: refetchMessages 
  } = trpc.messages.getUserMessages.useQuery(
    { limit: 20 },
    { enabled: opened }
  )

  // Send message mutation
  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages()
      setShowCompose(false)
      setRecipientId('')
      setSubject('')
      setContent('')
    }
  })

  // Mark as read mutation
  const markAsReadMutation = trpc.messages.markAsRead.useMutation({
    onSuccess: () => {
      refetchMessages()
    }
  })

  // Delete message mutation
  const deleteMessageMutation = trpc.messages.deleteMessage.useMutation({
    onSuccess: () => {
      refetchMessages()
    }
  })

  const handleSendMessage = () => {
    if (!recipientId || !content.trim()) return
    
    sendMessageMutation.mutate({
      toUserId: parseInt(recipientId),
      subject: subject.trim() || undefined,
      content: content.trim()
    })
  }

  const handleMarkAsRead = (messageId) => {
    markAsReadMutation.mutate({ messageId })
  }

  const handleDelete = (messageId) => {
    deleteMessageMutation.mutate({ messageId })
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Messages"
      size="lg"
      centered
    >
      <Stack spacing="md">
        {!showCompose ? (
          <>
            <Group position="apart">
              <Text size="lg" weight={600}>
                Your Messages
              </Text>
              <Button
                leftIcon={<IconMessage size="1rem" />}
                onClick={() => setShowCompose(true)}
                size="sm"
              >
                Compose
              </Button>
            </Group>

            {isLoading ? (
              <Center p="xl">
                <Loader size="sm" />
              </Center>
            ) : messages?.length === 0 ? (
              <Center p="xl">
                <Stack align="center" spacing="xs">
                  <IconMessage size="2rem" color="gray" />
                  <Text color="dimmed" size="sm">
                    No messages yet
                  </Text>
                </Stack>
              </Center>
            ) : (
              <ScrollArea h={400}>
                <Stack spacing={0}>
                  {messages?.map((message, index) => (
                    <React.Fragment key={message.id}>
                      <MessageItem
                        message={message}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                        currentUserId={user.id}
                      />
                      {index < messages.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </>
        ) : (
          <>
            <Group position="apart">
              <Text size="lg" weight={600}>
                Compose Message
              </Text>
              <Button
                variant="subtle"
                onClick={() => setShowCompose(false)}
                size="sm"
              >
                Back to Messages
              </Button>
            </Group>

            <Stack spacing="md">
              <TextInput
                label="Recipient User ID"
                placeholder="Enter user ID"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                required
              />

              <TextInput
                label="Subject (Optional)"
                placeholder="Message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <Textarea
                label="Message"
                placeholder="Type your message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                minRows={4}
                required
              />

              <Group position="right">
                <Button
                  variant="subtle"
                  onClick={() => setShowCompose(false)}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<IconSend size="1rem" />}
                  onClick={handleSendMessage}
                  loading={sendMessageMutation.isLoading}
                  disabled={!recipientId || !content.trim()}
                >
                  Send Message
                </Button>
              </Group>
            </Stack>
          </>
        )}
      </Stack>
    </Modal>
  )
}