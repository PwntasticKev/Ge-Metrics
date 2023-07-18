import {IconDots} from "@tabler/icons-react";
import {useDisclosure, useMediaQuery} from '@mantine/hooks';
import {Button, createStyles, Group, Modal, useMantineTheme} from '@mantine/core';


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
    const {classes} = useStyles();
    const [opened, {open, close}] = useDisclosure(false);
    return (
        <>
            <Modal
                opened={opened}
                onClose={close}
                title="This is a fullscreen modal"
                fullScreen={isMobile}
                transitionProps={{transition: 'fade', duration: 200}}
            >
                The Modal will be full screen only on mobile
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