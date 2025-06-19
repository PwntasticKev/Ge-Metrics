import { Button, MediaQuery, Navbar } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import React, { useState } from 'react'
import { MainLinks } from './components/main-links.jsx'

export default function NavMenu ({ opened }) {
  const [expanded, setExpanded] = useState(false)

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
          sx={{ transition: 'width 0.3s ease' }}
        >
            <Navbar.Section mb="xs">
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setExpanded(!expanded)}
                leftIcon={expanded ? <IconChevronLeft size={14} /> : <IconChevronRight size={14} />}
                sx={{ width: '100%' }}
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
