import { IconDots } from '@tabler/icons-react'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { Box, Button, Checkbox, createStyles, Group, Modal, TextInput, useMantineTheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useAuth } from '../../../../hooks/useAuth'
import { trpc } from '../../../../utils/trpc.jsx'
import { useState } from 'react'

const useStyles = createStyles((theme) => ({
  editIcon: {
    marginLeft: '4px',
    position: 'absolute',
    right: '5px',
    top: '5px'
  }
}))

export default function UserEdit () {
  const theme = useMantineTheme()
  const isMobile = useMediaQuery('(max-width: 50em)')
  const { user } = useAuth()
  const { classes } = useStyles()
  const [opened, { open, close }] = useDisclosure(false)
  const [loading, setLoading] = useState(false)

  const form = useForm({
    initialValues: {
      user: user?.name || '', // Ensure it's always a string
      phone: user?.phone || '', // Ensure it's always a string
      email: user?.email || '', // Add email field for consistency
      termsOfService: false
    },
    validate: {
      email: () => null,
      user: (value) => (/^[a-zA-Z0-9_]{3,12}$/.test(value) ? null : 'Username must be 3-12 characters (letters, numbers, underscore only)'),
      phone: (value) => (!value || /^(?:(?:\+|0{0,2})\d{1,4})?[ -]?\(?\d{1,4}\)?[ -]?\d{1,4}[ -]?\d{1,9}$/.test(value) ? null : 'Invalid phone number')
    }
  })

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      // For now, we'll just close the modal since we don't have a profile update endpoint yet
      // TODO: Add profile update tRPC endpoint
      console.log('Profile update values:', values)
      close()
      // You might want to show a success notification here
    } catch (error) {
      console.error('Failed to update profile:', error)
      // You might want to show an error notification here
    } finally {
      setLoading(false)
    }
  }

  return (
        <>
            <Modal
                opened={opened}
                onClose={close}
                title="Edit User Profile"
                fullScreen={isMobile}
                transitionProps={{ transition: 'fade', duration: 200 }}
            >
                <Box maw={300} mx="auto">
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        {/* <DropZone/> */}
                        <TextInput
                            mt="sm"
                            withAsterisk
                            label="Email"
                            disabled
                            value={user.email || ''}
                            placeholder="Email address"
                        />

                        <TextInput
                            mt="sm"
                            withAsterisk
                            label="Runescape Username"
                            placeholder="Your rs name"
                            {...form.getInputProps('user')}
                        />

                        <TextInput
                            mt="sm"
                            withAsterisk
                            label="Phone Number"
                            placeholder="1234567891"
                            {...form.getInputProps('phone')}
                        />

                        <Checkbox
                            mt="md"
                            label="I agree to sell my privacy"
                            {...form.getInputProps('termsOfService', { type: 'checkbox' })}
                        />

                        <Group position="right" mt="md">
                            <Button type="submit" disabled={!form.isValid() || loading}>
                                {loading ? 'Saving...' : 'Save'}
                            </Button>
                        </Group>
                    </form>
                </Box>
            </Modal>
            <Group position="right">
                <Button size="xs" variant="subtle">
                    <IconDots
                        className={classes.editIcon}
                        color={theme.colors.primary}
                        size={22}
                        onClick={open}
                    /></Button>
            </Group>
        </>
  )
}
