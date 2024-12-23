import { MediaQuery, Navbar } from '@mantine/core'
import React from 'react'
import { MainLinks } from './components/main-links.jsx'

export default function NavMenu ({ opened }) {
  return <MediaQuery
        largerThan="sm" styles={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
        <Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{ sm: 90, lg: 90 }}>
            <Navbar.Section grow mt="xs">
                <MainLinks/>
            </Navbar.Section>
        </Navbar>
    </MediaQuery>
}
