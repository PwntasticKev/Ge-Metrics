import React from 'react'
import {
  IconBoxMultiple3,
  IconCoffin,
  IconCoin,
  IconHelpHexagon,
  IconListDetails,
  IconLogout,
  IconPlant2,
  IconUsersGroup
} from '@tabler/icons-react'
import { Group, MediaQuery, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core'
import { Link } from 'react-router-dom'

function MainLink ({ icon, color, label, link }) {
  return (
        <>
            <Tooltip label={label} position="right" color={color}>

                <Link to={link} style={{ textDecoration: 'none' }}>
                    <UnstyledButton
                        sx={(theme) => ({
                          display: 'block',
                          marginBottom: 15,
                          padding: theme.spacing.xs,
                          borderRadius: theme.radius.sm,
                          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,

                          '&:hover': {
                            backgroundColor:
                                    theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
                          }
                        })}
                    >

                        <Group>
                            <ThemeIcon color={color} variant="light" size="md">
                                {icon}
                            </ThemeIcon>
                            <MediaQuery
                                largerThan="sm" styles={{ display: 'none' }}>
                                <Text size="sm">{label}</Text>
                            </MediaQuery>
                        </Group>
                    </UnstyledButton>
                </Link>
            </Tooltip>
        </>
  )
}

const data = [
  { icon: <IconListDetails size="1rem"/>, color: 'blue', label: 'All Items', link: '/' },
  { icon: <IconBoxMultiple3 size="1rem"/>, color: 'teal', label: 'Combination Sets ', link: '/combination-items' },
  { icon: <IconPlant2 size="1rem"/>, color: 'violet', label: 'Herblore Profit', link: '/herblore' },
  { icon: <IconCoffin size="1rem"/>, color: 'violet', label: 'Deaths Coffer', link: '/deaths-coffer' },
  { icon: <IconUsersGroup size="1rem"/>, color: 'blue', label: 'Parties', link: '/parties' },
  { icon: <IconCoin size="1rem"/>, color: 'violet', label: 'Money Making', link: '/money-making' },
  { icon: <IconHelpHexagon size="1rem"/>, color: 'grape', label: 'Faq', link: '/faq' },
  {
    icon: <IconLogout size="1rem"/>,
    color: 'grape',
    label: 'Log Out',
    link: '/login',
    onClick: '() => handleLogout'
  }
]

export function MainLinks () {
  const links = data.map((link) => <MainLink {...link} key={link.label}/>)
  return <div>{links}</div>
}
