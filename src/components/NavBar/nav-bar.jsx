import {Navbar} from "@mantine/core";
import React from "react";
import {MainLinks} from './components/main-links.jsx'

export default function NavMenu({opened}) {
    return <Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{sm: 200, lg: 220}}>
        <Navbar.Section grow mt="xs">
            <MainLinks/>
        </Navbar.Section>
    </Navbar>
}
