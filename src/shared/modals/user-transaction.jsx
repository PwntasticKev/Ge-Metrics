import {Box, Button, Group, Modal, TextInput} from "@mantine/core";
import {useForm} from '@mantine/form';

export default function UserTransaction({opened, setOpened}) {

    const submitProfit = () => {
        console.log('submitted')
    }
    const form = useForm({
        initialValues: {
            profit: '',
        },

        validate: {
            profit: (value) => (/^.{3}$/.test(value) ? null : 'Empty Field')
        },
    });
    return (
        <>
            <Modal opened={opened} onClose={() => setOpened(false)} title="Import Your Profit" centered>

                <Box maw={300} mx="auto">
                    <form onSubmit={form.onSubmit((values) => console.log(values))}>


                        <TextInput
                            withAsterisk
                            label="Profit Made"
                            placeholder="Profit"
                            {...form.getInputProps('profit')}
                        />

                        <Group position="right" mt="md">
                            <Button type="submit" onClick={submitProfit}>Submit</Button>
                        </Group>
                    </form>
                </Box>
            </Modal>
        </>
    );
}
