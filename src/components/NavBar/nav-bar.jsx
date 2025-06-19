import { Button, MediaQuery, Navbar } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import React, { useState, useEffect } from 'react'
import { MainLinks } from './components/main-links.jsx'

export default function NavMenu ({ opened }) {
  const [expanded, setExpanded] = useState(false)

  // Load saved navbar state on component mount
  useEffect(() => {
    const savedExpanded = localStorage.getItem('navbarExpanded')
    if (savedExpanded !== null) {
      setExpanded(JSON.parse(savedExpanded))
    }
  }, [])

  // Handle navbar expand/collapse with localStorage persistence
  const handleToggleExpanded = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    localStorage.setItem('navbarExpanded', JSON.stringify(newExpanded))
  }

  return <MediaQuery
        largerThan="sm" styles={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
        <Navbar
          p="md"
          hiddenBreakpoint="sm"
          hidden={!opened}
          width={{ sm: expanded ? 200 : 90, lg: expanded ? 200 : 90 }}
          sx={{
            transition: 'width 0.3s ease',
            '& .mantine-Navbar-root': {
              transition: 'width 0.3s ease'
            }
          }}
        >
            <Navbar.Section mb="xs">
              <Button
                variant="subtle"
                size="xs"
                onClick={handleToggleExpanded}
                leftIcon={expanded ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
                sx={{
                  width: '100%',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {expanded ? 'Collapse' : 'Expand'}
              </Button>
            </Navbar.Section>
            <Navbar.Section grow mt="xs">
                <MainLinks expanded={expanded}/>
            </Navbar.Section>
        </Navbar>
    </MediaQuery>
}
