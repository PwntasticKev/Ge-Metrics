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

export default function HeaderNav ({ opened, setOpened, user, onLogout }) {
  const theme = useMantineTheme()
  const [checked, setChecked] = useState(false)
  const [subscriptionModalOpened, setSubscriptionModalOpened] = useState(false)
  const { isSubscribed, plan } = useSubscription()

  useEffect(() => {
    const gameMode = localStorage.getItem('gameMode')
    setChecked(gameMode ? JSON.parse(gameMode) === 'dmm' : false)
  }, [])

  const setGameMode = (e) => {
    const newChecked = e.currentTarget.checked ?? false
    setChecked(newChecked)
    localStorage.setItem('gameMode', newChecked ? JSON.stringify('dmm') : JSON.stringify(''))
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
      <Group sx={{ height: '100%' }} px={20} position="apart" noWrap>
        {/* Logo Section */}
        <Link to={'/all-items'} style={{ textDecoration: 'none', color: 'white', flexShrink: 0 }}>
          <Flex align="center">
            <div style={{ marginLeft: 0 }}>
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
        <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
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
                checked={checked ?? false}
                onLabel="DMM"
                offLabel="Normal"
                size="md"
                onChange={setGameMode}
                styles={{
                  track: {
                    backgroundColor: (checked ?? false) ? theme.colors.orange[7] : theme.colors.blue[7]
                  }
                }}
              />
            </div>
          </Group>
        </MediaQuery>

        {/* Right Section */}
        <Group spacing="sm" noWrap>
          {/* Premium/Subscription Button */}
          {!isSubscribed
            ? (
            <>
              {/* Desktop Button */}
              <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
                <Button
                  component={Link}
                  to="/billing"
                  variant="gradient"
                  gradient={{ from: 'gold', to: 'orange' }}
                  leftIcon={<IconCrown size={16} />}
                  size="sm"
                  style={{ fontWeight: 600 }}
                >
                  Upgrade to Premium
                </Button>
              </MediaQuery>
              {/* Mobile Button */}
              <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                <ActionIcon component={Link} to="/billing" variant="gradient" gradient={{ from: 'gold', to: 'orange' }} size={36}>
                  <IconCrown size={20} />
                </ActionIcon>
              </MediaQuery>
            </>
              )
            : (
            <>
              <MediaQuery smallerThan="sm" styles={{ display: 'none' }}>
                <Button
                  component={Link}
                  to="/billing"
                  variant="gradient"
                  gradient={{ from: 'gold', to: 'orange' }}
                  leftIcon={<IconCrown size={12} />}
                  size="xs"
                  compact
                >
                  Premium
                </Button>
              </MediaQuery>
              <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
                <ActionIcon component={Link} to="/billing" variant="gradient" gradient={{ from: 'gold', to: 'orange' }} size={36}>
                  <IconCrown size={20} />
                </ActionIcon>
              </MediaQuery>
            </>
              )}

          {/* Avatar Menu */}
          <AvatarMenu user={user} onLogout={onLogout} size={36}/>

          {/* Mobile Menu */}
          <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
              color={theme.colors.gray[6]}
              sx={{
                height: 36,
                width: 36
              }}
            />
          </MediaQuery>
        </Group>
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
