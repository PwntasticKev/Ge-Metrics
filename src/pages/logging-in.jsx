import {Flex, Loader} from '@mantine/core'

export default function LoggingIn() {

    return (
        <Flex id="error-page" justify="center" align="center" direction="column">
            <h1>Logging in...</h1>
            <Loader/>
        </Flex>
    );
}
