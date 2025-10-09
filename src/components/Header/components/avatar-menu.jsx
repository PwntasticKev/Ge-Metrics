import { Avatar, Menu, Text, Divider, Group } from '@mantine/core'
import {
  IconLogout2,
  IconReceipt,
  IconUserCircle,
  IconVip,
  IconSettings,
  IconBrandDiscord
} from '@tabler/icons-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '../../../utils/trpc.jsx'

export default function AvatarMenu ({ user, onLogout, size = 30 }) {
  const { data: subscription } = trpc.billing.getSubscription.useQuery()
  const isSubscribed = subscription && subscription.status === 'active'
  const isPremiumUser = user?.role === 'premium' || user?.role === 'admin' || isSubscribed
  return (
    <Menu shadow="lg" width={280} position="bottom-end">
      <Menu.Target>
        <Avatar
          src={user?.avatar || null}
          alt="User Avatar"
          color="primary"
          sx={{
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s ease'
            }
          }}
          size={size}
        >
          {user?.name ? user.name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U')}
        </Avatar>
      </Menu.Target>

      <Menu.Dropdown sx={{ zIndex: 20 }}>
        <Menu.Label>
          <Group>
            <IconUserCircle size={16} />
            {user?.name || user?.email || 'Account'}
          </Group>
        </Menu.Label>

        {!isPremiumUser && (
          <Menu.Item
            icon={<IconVip size={14} />}
            component={Link}
            to="/billing"
          >
            <Group position="apart">
              <Text>Upgrade to Premium</Text>
              <Text size="xs" color="gold" weight={500}>PRO</Text>
            </Group>
          </Menu.Item>
        )}

        <Menu.Item
          icon={<IconSettings size={14} />}
          component={Link}
          to="/settings"
        >
          Account Settings
        </Menu.Item>

        <Menu.Item
          icon={<IconUserCircle size={14} />}
          component={Link}
          to={`/profile/${user?.id || 'default'}`}
        >
          My Profile
        </Menu.Item>

        <Menu.Item
          icon={<IconReceipt size={14} />}
          component={Link}
          to="/flip-history"
        >
          Flip History
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          icon={<IconBrandDiscord size={14} />}
          onClick={() => window.open('https://discord.gg/BhN3sAGux7', '_blank')}
        >
          Join Discord
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          icon={<IconLogout2 size={14} />}
          onClick={onLogout}
          color="red"
        >
          <Text color="red">Logout</Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
