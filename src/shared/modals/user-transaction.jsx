import {Modal, Box} from "@mantine/core";
import ProfitCalculator from '../calculator.jsx'

export default function UserTransaction({opened, setOpened}) {

    return (
        <>
            <Modal opened={opened} onClose={() => setOpened(false)} title="Import Your Profit" centered>
                <Box maw={300} mx="auto">
                    <ProfitCalculator/>
                </Box>
            </Modal>
        </>
    );
}
