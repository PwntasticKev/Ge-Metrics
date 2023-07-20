import {useMediaQuery} from '@mantine/hooks';
import {createStyles, Modal, useMantineTheme} from '@mantine/core';


const useStyles = createStyles((theme) => ({
    editIcon: {
        marginLeft: '4px',
        position: 'absolute',
        right: '5px',
        top: '5px'
    }
}));

export default function UserSubscription({open, handleChange}) {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery("(max-width: 50em)");
    const {classes} = useStyles();
    return (
        <>
            <Modal
                opened={open}
                onClose={() => handleChange(null)}
                title="This is a fullscreen modal"
                fullScreen={isMobile}
                transitionProps={{transition: 'fade', duration: 200}}
            >
                This is the user subscription
            </Modal>
        </>
    );
}