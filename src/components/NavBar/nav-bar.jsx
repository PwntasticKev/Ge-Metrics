import React, { useState } from 'react'
import {
  createStyles,
  Navbar,
  UnstyledButton,
  Tooltip,
  Title,
  rem,
  Flex,
  Text,
  Group
} from '@mantine/core'
import {
  IconGauge,
  IconUser,
  IconSettings,
  IconLogout,
  IconSwitchHorizontal,
  IconChevronRight,
  IconChevronLeft
} from '@tabler/icons-react'
import { MainLinks } from './components/main-links.jsx'
import { UserButton } from './components/user-button.jsx'
import { useLocation } from 'react-router-dom'

const useStyles = createStyles((theme) => ({
  navbar: {
    transition: 'width 0.3s ease',
    position: 'fixed',
    top: 60, // Account for header height
    left: 0,
    height: 'calc(100vh - 60px)',
    zIndex: 100,

    [theme.fn.smallerThan('sm')]: {
      display: 'none'
    }
  },

  mobileDrawer: {
    [theme.fn.largerThan('sm')]: {
      display: 'none'
    }
  },

  expandButton: {
    width: '100%',
    transition: 'all 0.2s ease',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark'
        ? theme.colors.dark[6]
        : theme.colors.gray[1]
    },

    [theme.fn.smallerThan('sm')]: {
      display: 'none'
    }
  },

  drawerHeader: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottom: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    marginBottom: theme.spacing.sm
  },

  drawerTitle: {
    fontWeight: 600,
    fontSize: theme.fontSizes.lg,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black
  }
}))

export default function NavMenu ({ user, isMobile }) {
  const { classes } = useStyles()
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem('navbarExpanded')
    return saved ? JSON.parse(saved) : false
  })

  const toggleNavbar = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    localStorage.setItem('navbarExpanded', JSON.stringify(newExpanded))
  }

  return (
    <Navbar
      width={{ sm: expanded ? 240 : 80 }}
      p="md"
      className={!isMobile ? classes.navbar : ''}
    >
      <Navbar.Section grow>
        <MainLinks expanded={expanded} />
      </Navbar.Section>
      <Navbar.Section>
        <UserButton expanded={expanded} />
        {!isMobile && (
          <UnstyledButton className={classes.expandButton} onClick={toggleNavbar}>
            <Group position="center">
              {expanded ? <IconChevronLeft /> : <IconChevronRight />}
            </Group>
          </UnstyledButton>
        )}
      </Navbar.Section>
    </Navbar>
  )
}
