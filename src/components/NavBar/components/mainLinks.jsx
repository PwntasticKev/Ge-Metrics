import React from 'react';
import {IconBusinessplan, IconHelpHexagon, IconListDetails, IconLogout, IconSitemap} from '@tabler/icons-react';
import {Group, Text, ThemeIcon, UnstyledButton} from '@mantine/core';
import {Link} from 'react-router-dom';


function MainLink({icon, color, label, link}) {
    return (
        <>
            <Link to={link} style={{textDecoration: 'none'}}>
                <UnstyledButton
                    sx={(theme) => ({
                        display: 'block',
                        width: '100%',
                        padding: theme.spacing.xs,
                        borderRadius: theme.radius.sm,
                        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,

                        '&:hover': {
                            backgroundColor:
                                theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
                        },
                    })}
                >
                    <Group>
                        <ThemeIcon color={color} variant="light">
                            {icon}
                        </ThemeIcon>

                        <Text size="sm">{label}</Text>
                    </Group>
                </UnstyledButton>
            </Link>
        </>
    );
}

const data = [
    {icon: <IconListDetails size="1rem"/>, color: 'blue', label: 'All Items', link: '/'},
    {icon: <IconSitemap size="1rem"/>, color: 'teal', label: 'Combination Sets ', link: '/combination-items'},
    {icon: <IconBusinessplan size="1rem"/>, color: 'violet', label: 'Money Making', link: '/money-making'},
    {icon: <IconHelpHexagon size="1rem"/>, color: 'grape', label: 'Faq', link: '/faq'},
    {icon: <IconLogout size="1rem"/>, color: 'grape', label: 'Log Out', link: '/login', onClick: '() => handleLogout'}
];

export function MainLinks() {
    const links = data.map((link) => <MainLink {...link} key={link.label}/>);
    return <div>{links}</div>;
}