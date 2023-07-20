import {Box, Button, Group, Modal, TextInput} from "@mantine/core";
import {useForm} from '@mantine/form';

export default function UserCompletion({opened, setOpened}) {
    const form = useForm({
        initialValues: {
            name: '',
        },

        validate: {
            name: (value) => (/^.{3}$/.test(value) ? null : 'Empty Field')
        },
    });
    return (
        <>
            <Modal opened={opened} onClose={() => setOpened(false)} title="Finish Setting Up Your Account" centered>

                <Box maw={300} mx="auto">
                    <form onSubmit={form.onSubmit((values) => console.log(values))}>


                        <TextInput
                            withAsterisk
                            label="Runescape Name"
                            placeholder="Your name"
                            {...form.getInputProps('name')}
                        />

                        <Group position="right" mt="md">
                            <Button type="submit">Submit</Button>
                        </Group>
                    </form>
                </Box>
            </Modal>
        </>
    );
}
