import {IconDots} from "@tabler/icons-react";
import {useDisclosure, useMediaQuery} from '@mantine/hooks';
import {Box, Button, Checkbox, createStyles, Group, Modal, TextInput, useMantineTheme} from '@mantine/core';
import {useForm} from '@mantine/form';
import {useContext} from "react";
import {AuthContext} from "../../../../utils/firebase/auth-context.jsx";
import DropZone from '../../../../shared/dropzone.jsx'


const useStyles = createStyles((theme) => ({
    editIcon: {
        marginLeft: '4px',
        position: 'absolute',
        right: '5px',
        top: '5px'
    }
}));

export default function UserEdit() {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery("(max-width: 50em)");
    const {user} = useContext(AuthContext);
    const {classes} = useStyles();
    const [opened, {open, close}] = useDisclosure(false);

    const form = useForm({
        initialValues: {
            email: '',
            termsOfService: false,
        },

        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            user: (value) => (/^[a-zA-Z]{3}$/.test(value) ? null : 'Invalid email'),
            phone: (value) => (/^(?:(?:\+|0{0,2})\d{1,4})?[ -]?\(?\d{1,4}\)?[ -]?\d{1,4}[ -]?\d{1,9}$/.test(value) ? null : 'Invalid email'),


        },
    });
    return (
        <>
            <Modal
                opened={opened}
                onClose={close}
                title="Edit User Profile"
                fullScreen={isMobile}
                transitionProps={{transition: 'fade', duration: 200}}
            >
                <Box maw={300} mx="auto">
                    <form onSubmit={form.onSubmit((values) => console.log(values))}>
                        <DropZone/>
                        <TextInput
                            mt="sm"
                            withAsterisk
                            label="Email"
                            disabled
                            placeholder={user.email}
                            {...form.getInputProps('email')}
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
                            {...form.getInputProps('termsOfService', {type: 'checkbox'})}
                        />

                        <Group position="right" mt="md">
                            <Button type="submit">Save</Button>
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
    );
}