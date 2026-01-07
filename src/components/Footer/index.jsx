import React, { useEffect, useState } from 'react'
import { Group, Text, Box, ActionIcon, Anchor } from '@mantine/core'
import { IconUsers, IconExternalLink } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { trpc } from '../../utils/trpc.jsx'

export default function Footer() {
  const [activeUsers, setActiveUsers] = useState(0)
  
  // Query active users count
  const { data: activeUsersData, refetch } = trpc.sessions.getActiveUsersCount.useQuery(
    undefined,
    {
      refetchInterval: 60000, // Refresh every minute
      staleTime: 30000, // Consider data stale after 30 seconds
    }
  )

  useEffect(() => {
    if (activeUsersData?.activeUsers !== undefined) {
      setActiveUsers(activeUsersData.activeUsers)
    }
  }, [activeUsersData])

  // Manual refresh for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 45000) // Refresh every 45 seconds

    return () => clearInterval(interval)
  }, [refetch])

  return (
    <Box
      sx={(theme) => ({
        background: `linear-gradient(135deg, ${theme.colors.dark[8]} 0%, ${theme.colors.dark[9]} 100%)`,
        borderTop: `1px solid ${theme.colors.dark[5]}`,
        padding: '12px 20px',
        marginTop: 'auto',
        position: 'sticky',
        bottom: 0,
        zIndex: 100
      })}
    >
      <Group position="apart" spacing="sm" noWrap>
        {/* Active Users Counter */}
        <Group spacing={6} noWrap>
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#4ade80',
              boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)'
            }}
            sx={{
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 }
              },
              animation: 'pulse 2s infinite'
            }}
          />
          <IconUsers size={16} color="#9ca3af" />
          <Text size="sm" color="dimmed">
            {activeUsers} {activeUsers === 1 ? 'user' : 'users'} online
          </Text>
        </Group>

        {/* Links */}
        <Group spacing="md" noWrap>
          <Anchor
            component={Link}
            to="/terms"
            size="sm"
            color="dimmed"
            style={{
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#667eea'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af'
            }}
          >
            Terms & Privacy
          </Anchor>
          
          <Anchor
            href="https://discord.gg/BdDfzg4ZMQ"
            target="_blank"
            size="sm"
            color="dimmed"
            style={{
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#7289da'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af'
            }}
          >
            <Group spacing={4} noWrap>
              Discord
              <IconExternalLink size={12} />
            </Group>
          </Anchor>
        </Group>
      </Group>

    </Box>
  )
}