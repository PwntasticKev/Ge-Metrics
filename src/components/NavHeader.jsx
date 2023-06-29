import {Burger, Flex, Group, Header, MediaQuery, useMantineTheme} from '@mantine/core';
import React from "react";
import {IconCoins} from '@tabler/icons-react';

export default function NavHeader({opened, setOpened}) {
    const theme = useMantineTheme();

    return <Header height={60} p="xs">
        <Group sx={{height: '100%'}} px={20} position="apart">
            <Flex>
                <IconCoins size={24} color="gold" sx={{mr: 2}}/>
                RS-XChange
            </Flex>
            <MediaQuery largerThan="sm" styles={{display: 'none'}}>
                <Burger
                    opened={opened}
                    onClick={() => setOpened((opened) => !opened)}
                    size="sm"
                    color={theme.colors.gray[6]}
                />
            </MediaQuery>
        </Group>
    </Header>
}