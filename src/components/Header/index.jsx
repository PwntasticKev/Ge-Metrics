import {Burger, Flex, Group, Header, MediaQuery, Switch, Text, useMantineTheme} from '@mantine/core';
import React, {useState} from "react";
import {IconCoins} from '@tabler/icons-react';
import AvatarMenu from './components/avatar-menu.jsx'
import {Link} from "react-router-dom";

export default function HeaderNav({opened, setOpened}) {

    const theme = useMantineTheme();
    const [checked, setChecked] = useState(false);

    const setGameMode = (e) => {
        setChecked(e.currentTarget.checked)
        localStorage.setItem('gameMode', checked ? JSON.stringify('dmm') : JSON.stringify(''))
    }

    return <Header height={60} p="xs">
        <Group sx={{height: '100%'}} px={20} position="apart">
            <Link to={`/`} style={{textDecoration: 'none', color: 'white'}}>
                <Flex>
                    <IconCoins size={24} color="gold"/>
                    <Text style={{fontWeight: 'bold', marginLeft: 10}}>GE Metrics</Text>

                </Flex>
            </Link>
            <Switch
                checked={checked}
                onLabel="DMM"
                offLabel="Normal"
                size="lg"
                onChange={setGameMode}
            />
            <Flex justify="space-between" align="center">
                <AvatarMenu/>
                <MediaQuery largerThan="sm" styles={{display: 'none'}}>
                    <Burger
                        style={{marginLeft: 10}}
                        opened={opened}
                        onClick={() => setOpened((opened) => !opened)}
                        size="sm"
                        color={theme.colors.gray[6]}
                    />
                </MediaQuery>
            </Flex>

        </Group>
    </Header>
}