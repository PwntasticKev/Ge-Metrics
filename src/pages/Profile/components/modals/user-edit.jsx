import { IconDots } from '@tabler/icons-react'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { Box, Button, Checkbox, createStyles, Group, Modal, TextInput, useMantineTheme } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useContext } from 'react'
import { AuthContext } from '../../../../utils/firebase/auth-context.jsx'
// import DropZone from '../../../../shared/dropzone.jsx'
import { gql, useMutation } from '@apollo/client'

const EDIT_USER = gql`
    mutation EditUser($type: String!) {
        editUser(type: $type) {
            email
            username
            phone
        }
    }
`

const useStyles = createStyles((theme) => ({
  editIcon: {
    marginLeft: '4px',
    position: 'absolute',
    right: '5px',
    top: '5px'
  }
}))

export default function UserEdit () {
  const [editUser, { data, loading, error }] = useMutation(EDIT_USER)
  const theme = useMantineTheme()
  const isMobile = useMediaQuery('(max-width: 50em)')
  const { user } = useContext(AuthContext)
  const { classes } = useStyles()
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm({
    initialValues: {
      user: '', // Add the initial value for the username if available
      phone: '', // Add the initial value for the phone if available
      termsOfService: false
    },
    validate: {
      email: () => null,
      user: (value) => (/^[a-zA-Z]{3}$/.test(value) ? null : 'Invalid email'),
      phone: (value) => (/^(?:(?:\+|0{0,2})\d{1,4})?[ -]?\(?\d{1,4}\)?[ -]?\d{1,4}[ -]?\d{1,9}$/.test(value) ? null : 'Invalid email')
    }
  })

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
                    <form onSubmit={values => {
                      editUser({ variables: values })
                      values.preventDefault()
                    }}>
                        {/* <DropZone/> */}
                        <TextInput
                            mt="sm"
                            withAsterisk
                            label="Email"
                            disabled
                            placeholder={user.email}
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
                            <Button type="submit" disabled={!form.valid}>
                                Save
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
