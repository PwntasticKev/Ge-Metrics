import { Avatar, Menu, ColorPicker, Switch, Text, Divider, Group } from '@mantine/core'
import {
  IconLogout2,
  IconReceipt,
  IconTool,
  IconUserCircle,
  IconVip,
  IconPalette,
  IconMoon,
  IconSun,
  IconSettings,
  IconBrandDiscord
} from '@tabler/icons-react'
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function AvatarMenu ({ user, onLogout, size = 30 }) {
  const [themeColor, setThemeColor] = useState('#339af0')
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    // Load saved theme preferences
    const savedColor = localStorage.getItem('themeColor')
    const savedDarkMode = localStorage.getItem('darkMode')

    if (savedColor) setThemeColor(savedColor)
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode))
  }, [])

  const handleThemeColorChange = (color) => {
    setThemeColor(color)
    localStorage.setItem('themeColor', color)
    // Apply theme color to CSS variables
    document.documentElement.style.setProperty('--mantine-primary-color', color)
  }

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode))
    // Apply dark mode toggle
    document.documentElement.setAttribute('data-mantine-color-scheme', newDarkMode ? 'dark' : 'light')
  }

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

        <Menu.Item icon={<IconVip size={14}/>}>
          <Group position="apart">
            <Text>Upgrade to Premium</Text>
            <Text size="xs" color="gold" weight={500}>PRO</Text>
          </Group>
        </Menu.Item>

        <Link to={`/profile/${user?.id || 'default'}`} style={{ textDecoration: 'none' }}>
          <Menu.Item icon={<IconUserCircle size={14}/>}>My Profile</Menu.Item>
        </Link>

        <Menu.Item icon={<IconTool size={14}/>}>Account Settings</Menu.Item>

        <Menu.Divider />

        <Menu.Label>
          <Group>
            <IconPalette size={16} />
            Customize Theme
          </Group>
        </Menu.Label>

        <Menu.Item>
          <Group position="apart" mb="xs">
            <Text size="sm">Dark Mode</Text>
            <Switch
              checked={darkMode}
              onChange={handleDarkModeToggle}
              onLabel={<IconMoon size={12} />}
              offLabel={<IconSun size={12} />}
            />
          </Group>
        </Menu.Item>

        <Menu.Item>
          <Text size="sm" mb="xs">Primary Color</Text>
          <ColorPicker
            format="hex"
            value={themeColor}
            onChange={handleThemeColorChange}
            swatches={[
              '#339af0', '#51cf66', '#ff6b6b', '#ffd43b',
              '#9775fa', '#ff8cc8', '#74c0fc', '#fd7e14'
            ]}
            size="sm"
          />
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>
          <Group>
            <IconSettings size={16} />
            Preferences
          </Group>
        </Menu.Label>

        <Menu.Item icon={<IconReceipt size={14}/>}>Transaction History</Menu.Item>

        <Menu.Item
          icon={<IconBrandDiscord size={14}/>}
          onClick={() => window.open('https://discord.gg/BhN3sAGux7', '_blank')}
        >
          Join Discord
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          icon={<IconLogout2 size={14}/>}
          onClick={onLogout}
          color="red"
        >
          <Text color="red">Logout</Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
