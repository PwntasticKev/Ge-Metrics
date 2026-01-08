import React, { useEffect, useState } from 'react'
import { Group, Text, Box, ActionIcon, Anchor } from '@mantine/core'
import { IconUsers, IconExternalLink, IconBrandDiscord, IconBrandYoutube, IconMail, IconBrandSpotify } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { trpc } from '../../utils/trpc.jsx'
import { FooterMusicPlayer } from '../MusicPlayer'
import { useMusicPlayer } from '../../contexts/MusicPlayerContext'

export default function Footer() {
  const [activeUsers, setActiveUsers] = useState(0)
  
  // Music player integration
  const { isVisible: isMusicPlayerVisible, showPlayer, hidePlayer } = useMusicPlayer()

  const toggleMusicPlayer = () => {
    if (isMusicPlayerVisible) {
      hidePlayer()
    } else {
      showPlayer()
    }
  }
  
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
        marginTop: 'auto',
        position: 'sticky',
        bottom: 0,
        zIndex: 100
      })}
    >
      {/* Music Player Section */}
      <FooterMusicPlayer />
      
      {/* Original Footer Content */}
      <Box sx={{ padding: '12px 20px' }}>
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

        {/* Links & Social */}
        <Group spacing="md" noWrap>
          <Anchor
            component={Link}
            to="/contact"
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
            Contact
          </Anchor>

          <Anchor
            component={Link}
            to="/affiliate"
            size="sm"
            color="dimmed"
            style={{
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f59e0b'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af'
            }}
          >
            Partner
          </Anchor>

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
            Terms
          </Anchor>
          
          {/* Social Icons */}
          <Group spacing={8} noWrap>
            <ActionIcon
              onClick={toggleMusicPlayer}
              variant={isMusicPlayerVisible ? 'filled' : 'subtle'}
              color={isMusicPlayerVisible ? 'green' : 'gray'}
              size={32}
              style={{
                transition: 'all 0.2s ease',
                backgroundColor: isMusicPlayerVisible 
                  ? '#1db954' 
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(-5deg) scale(1.1)'
                e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(29, 185, 84, 0.6))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(0deg) scale(1)'
                e.currentTarget.style.filter = 'none'
              }}
              title={isMusicPlayerVisible ? 'Hide music player' : 'Show music player'}
            >
              <IconBrandSpotify size={16} color={isMusicPlayerVisible ? 'white' : undefined} />
            </ActionIcon>

            <ActionIcon
              onClick={() => window.open('https://discord.gg/BdDfzg4ZMQ', '_blank')}
              variant="subtle"
              color="gray"
              size={32}
              style={{
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(114, 137, 218, 0.6))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.filter = 'none'
              }}
              title="Join our Discord"
            >
              <IconBrandDiscord size={16} />
            </ActionIcon>

            <ActionIcon
              onClick={() => console.log('YouTube link coming soon!')}
              variant="subtle"
              color="gray"
              size={32}
              style={{
                transition: 'all 0.2s ease',
                opacity: 0.4
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(255, 0, 0, 0.3))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.filter = 'none'
              }}
              title="YouTube coming soon!"
            >
              <IconBrandYoutube size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Group>
      </Box>
    </Box>
  )
}