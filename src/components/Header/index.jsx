import {
  Badge,
  Burger,
  Button,
  Flex,
  Group,
  Header,
  MediaQuery,
  Switch,
  Text,
  useMantineTheme,
  ActionIcon
} from '@mantine/core'
import React, { useEffect, useState } from 'react'
import { IconCoins, IconBrandDiscord, IconCrown } from '@tabler/icons-react'
import AvatarMenu from './components/avatar-menu.jsx'
import SubscriptionModal, { useSubscription } from '../Subscription/index.jsx'
import { Link } from 'react-router-dom'

export default function HeaderNav ({ opened, setOpened }) {
  const theme = useMantineTheme()
  const [checked, setChecked] = useState(false)
  const [subscriptionModalOpened, setSubscriptionModalOpened] = useState(false)
  const { isSubscribed, plan } = useSubscription()

  useEffect(() => {
    setChecked(localStorage.getItem('gameMode'))
  }, [])

  const setGameMode = (e) => {
    setChecked(e.currentTarget.checked)
    localStorage.setItem('gameMode', checked ? JSON.stringify('') : JSON.stringify('dmm'))
  }

  const handleDiscordClick = () => {
    window.open('https://discord.gg/your-discord-server', '_blank')
  }

  return (
    <Header
      height={70}
      sx={(theme) => ({
        background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
        borderBottom: `1px solid ${theme.colors.dark[5]}`
      })}
      p="md"
    >
      <Group sx={{ height: '100%' }} px={20} position="apart">
        {/* Logo Section */}
        <Link to={'/'} style={{ textDecoration: 'none', color: 'white' }}>
          <Flex align="center">
            <div style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconCoins size={24} color="#1a1b1e"/>
            </div>
            <div style={{ marginLeft: 12 }}>
              <Text size="xl" weight={700} style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2
              }}>
                GE Metrics
              </Text>
              <Text size="xs" color="dimmed" style={{ lineHeight: 1 }}>
                Live Market Data
              </Text>
            </div>
          </Flex>
        </Link>

        {/* Center Section - Game Mode */}
        <Group spacing="md">
          <Badge
            variant="filled"
            color="blue"
            size="lg"
            sx={{ fontSize: '10px' }}
          >
            LIVE
          </Badge>

          <div style={{
            background: theme.colors.dark[6],
            borderRadius: '24px',
            padding: '4px',
            border: `1px solid ${theme.colors.dark[4]}`
          }}>
            <Switch
              checked={checked}
              onLabel="DMM"
              offLabel="Normal"
              size="md"
              onChange={setGameMode}
              styles={{
                track: {
                  backgroundColor: checked ? theme.colors.orange[7] : theme.colors.blue[7]
                }
              }}
            />
          </div>
        </Group>

        {/* Right Section */}
        <Flex justify="space-between" align="center" gap="md">
          {/* Premium/Subscription Button */}
          {!isSubscribed
            ? (
            <Button
              variant="gradient"
              gradient={{ from: 'yellow', to: 'orange' }}
              leftIcon={<IconCrown size={16} />}
              size="sm"
              onClick={() => setSubscriptionModalOpened(true)}
              sx={{
                fontWeight: 600,
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.2s ease'
                }
              }}
            >
              Upgrade $3/mo
            </Button>
              )
            : (
            <Badge
              color="yellow"
              variant="filled"
              size="lg"
              leftSection={<IconCrown size={12} />}
            >
              PREMIUM
            </Badge>
              )}

          {/* Discord Button */}
          <ActionIcon
            variant="filled"
            color="indigo"
            size="lg"
            onClick={handleDiscordClick}
            sx={{
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s ease'
              }
            }}
          >
            <IconBrandDiscord size={20} />
          </ActionIcon>

          {/* Avatar Menu */}
          <AvatarMenu/>

          {/* Mobile Menu */}
          <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
            <Burger
              opened={opened}
              onClick={() => setOpened((opened) => !opened)}
              size="sm"
              color={theme.colors.gray[6]}
              sx={{
                '&:hover': {
                  backgroundColor: theme.colors.dark[6]
                }
              }}
            />
          </MediaQuery>
        </Flex>
      </Group>

      {/* Subscription Modal */}
      <SubscriptionModal
        opened={subscriptionModalOpened}
        onClose={() => setSubscriptionModalOpened(false)}
        currentPlan={plan}
      />
    </Header>
  )
}
