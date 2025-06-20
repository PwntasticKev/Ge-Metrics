import { Button, MediaQuery, Navbar, Drawer, Burger, createStyles } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import React, { useState, useEffect } from 'react'
import { MainLinks } from './components/main-links.jsx'
import { useMediaQuery } from '@mantine/hooks'
import { useNavigate, useLocation } from 'react-router-dom'

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

export default function NavMenu ({ opened, setOpened }) {
  const { classes } = useStyles()
  const [expanded, setExpanded] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-close mobile menu on route change
  useEffect(() => {
    if (isMobile && opened) {
      setOpened(false)
    }
  }, [location.pathname, isMobile, opened, setOpened])

  // Load saved navbar state on component mount
  useEffect(() => {
    const savedExpanded = localStorage.getItem('navbarExpanded')
    if (savedExpanded !== null && !isMobile) {
      setExpanded(JSON.parse(savedExpanded))
    }
  }, [isMobile])

  // Handle navbar expand/collapse with localStorage persistence
  const handleToggleExpanded = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    localStorage.setItem('navbarExpanded', JSON.stringify(newExpanded))
  }

  // Handle mobile navigation item click
  const handleMobileNavClick = (path) => {
    setOpened(false) // Close drawer
    navigate(path) // Navigate to route
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        padding={0}
        size="280px"
        className={classes.mobileDrawer}
        styles={(theme) => ({
          drawer: {
            backgroundColor: theme.colorScheme === 'dark'
              ? theme.colors.dark[7]
              : theme.white
          },
          header: {
            display: 'none' // Hide default header, we'll create our own
          },
          body: {
            padding: 0,
            height: '100%'
          }
        })}
        withCloseButton={false}
        overlayProps={{
          opacity: 0.55,
          blur: 3
        }}
      >
        <div className={classes.drawerHeader}>
          <div className={classes.drawerTitle}>GE Metrics</div>
        </div>
        <MainLinks
          expanded={true}
          isMobile={true}
          onNavigate={handleMobileNavClick}
        />
      </Drawer>
    )
  }

  // Desktop navbar
  return (
    <Navbar
      p="md"
      width={{
        base: expanded ? 220 : 80,
        sm: expanded ? 220 : 80,
        lg: expanded ? 240 : 90
      }}
      className={classes.navbar}
      styles={(theme) => ({
        root: {
          backgroundColor: theme.colorScheme === 'dark'
            ? theme.colors.dark[7]
            : theme.white,
          borderRight: `1px solid ${
            theme.colorScheme === 'dark'
              ? theme.colors.dark[4]
              : theme.colors.gray[3]
          }`,
          position: 'fixed',
          top: 60,
          left: 0,
          height: 'calc(100vh - 60px)',
          zIndex: 100
        }
      })}
    >
      <Navbar.Section mb="xs">
        <Button
          variant="subtle"
          size="sm"
          onClick={handleToggleExpanded}
          leftIcon={expanded ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
          className={classes.expandButton}
          styles={(theme) => ({
            root: {
              justifyContent: expanded ? 'flex-start' : 'center',
              padding: expanded ? '8px 12px' : '8px'
            },
            label: {
              fontSize: theme.fontSizes.sm
            }
          })}
        >
          {expanded ? 'Collapse' : ''}
        </Button>
      </Navbar.Section>

      <Navbar.Section grow mt="xs">
        <MainLinks expanded={expanded} isMobile={false} />
      </Navbar.Section>
    </Navbar>
  )
}
