import {Burger, Flex, Group, Header, MediaQuery, Text, useMantineTheme} from '@mantine/core';
import React from "react";
import {IconCoins} from '@tabler/icons-react';
import AvatarMenu from './components/avatar-menu.jsx'

export default function HeaderNav({opened, setOpened}) {

    const theme = useMantineTheme();

    return <Header height={60} p="xs">
        <Group sx={{height: '100%'}} px={20} position="apart">
            <Flex>
                <IconCoins size={24} color="gold"/>
                <Text style={{fontWeight: 'bold', marginLeft: 10}}>GE Metrics</Text>
            </Flex>
            <MediaQuery largerThan="sm" styles={{display: 'none'}}>
                <Burger
                    opened={opened}
                    onClick={() => setOpened((opened) => !opened)}
                    size="sm"
                    color={theme.colors.gray[6]}
                />
            </MediaQuery>
            <AvatarMenu/>
        </Group>
    </Header>
}