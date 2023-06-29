import {Link} from 'react-router-dom';
import {Flex} from '@mantine/core'

export default function ErrorPage() {

    return (
        <Flex id="error-page">
            <h1>Oops!</h1>
            <p>Sorry, an unexpected error has occurred.</p>
            <p>
                <Link to={'/login'} style={{textDecoration: 'none'}}><i>Login to see more</i></Link>
            </p>
        </Flex>
    );
}
