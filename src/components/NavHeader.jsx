import {Burger, Flex, Group, Header, MediaQuery, useMantineTheme} from '@mantine/core';
import React from "react";
import {IconCoins} from '@tabler/icons-react';
import {signOut} from "firebase/auth";
import {auth} from '../firebase.jsx';
import {useNavigate} from 'react-router-dom';

export default function NavHeader({opened, setOpened}) {
    const theme = useMantineTheme();

    const navigate = useNavigate();

    const handleLogout = () => {
        signOut(auth).then(() => {
            // Sign-out successful.
            navigate("/login");
            console.log("Signed out successfully")
        }).catch((error) => {
            // An error happened.
        });
    }

    return <Header height={60} p="xs">
        <Group sx={{height: '100%'}} px={20} position="apart">
            <Flex>
                <IconCoins size={24} color="gold" sx={{mr: 2}}/>
                FLIP-R-US
            </Flex>
            <MediaQuery largerThan="sm" styles={{display: 'none'}}>
                <Burger
                    opened={opened}
                    onClick={() => setOpened((opened) => !opened)}
                    size="sm"
                    color={theme.colors.gray[6]}
                />
            </MediaQuery>
            <button onClick={handleLogout}>
                Logout
            </button>
        </Group>
    </Header>
}