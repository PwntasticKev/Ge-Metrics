import React from 'react'
import {
  UnstyledButton,
  Group,
  Avatar,
  Text,
  createStyles,
  rem
} from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import { useAuth } from '../../../hooks/useAuth'
import { Link } from 'react-router-dom'

const useStyles = createStyles((theme) => ({
  user: {
    display: 'block',
    width: '100%',
    padding: theme.spacing.md,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
    borderRadius: theme.radius.sm,
    transition: 'background-color 0.2s ease',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0]
    }
  },

  userInfo: {
    flex: 1
  },

  userName: {
    [theme.fn.smallerThan('sm')]: {
      display: 'none'
    }
  },
  userEmail: {
    [theme.fn.smallerThan('sm')]: {
      display: 'none'
    }
  }
}))

export function UserButton ({ expanded }) {
  const { classes } = useStyles()
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const { name, email, image } = user

  return (
    <UnstyledButton component={Link} to="/profile" className={classes.user}>
      <Group>
        <Avatar src={image} radius="xl" />
        {expanded && (
          <div className={classes.userInfo}>
            <Text size="sm" weight={500} className={classes.userName}>
              {name}
            </Text>
            <Text color="dimmed" size="xs" className={classes.userEmail}>
              {email}
            </Text>
          </div>
        )}
        {expanded && <IconChevronRight size={rem(14)} stroke={1.5} />}
      </Group>
    </UnstyledButton>
  )
}
