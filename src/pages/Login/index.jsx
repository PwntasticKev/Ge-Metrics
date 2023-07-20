import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup} from 'firebase/auth';
import {IconBrandGoogle} from '@tabler/icons-react';
import {auth} from '../../firebase.jsx';
import {
    Button,
    Checkbox,
    createStyles,
    Divider,
    Paper,
    PasswordInput,
    rem,
    Text,
    TextInput,
    Title
} from '@mantine/core';
import {useForm} from "@mantine/form";

const useStyles = createStyles((theme) => ({
    wrapper: {
        minHeight: rem(900),
        backgroundSize: 'cover',
        backgroundImage: 'url(https://images.unsplash.com/photo-1484242857719-4b9144542727?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1280&q=80)',
    },
    form: {
        borderRight: `${rem(1)} solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[3]
        }`,
        minHeight: rem(900),
        maxWidth: rem(450),
        paddingTop: rem(80),

        [theme.fn.smallerThan('sm')]: {
            maxWidth: '100%',
        },
    },
    title: {
        color: theme.colorScheme === 'dark' ? theme.white : theme.black,
        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    },
}));

export default function Login() {
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const {classes} = useStyles();
    const navigate = useNavigate();

    const form = useForm({
        initialValues: {
            name: '',
            password: ''
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (/^(?=.*[!@#$%^&*()_+])(?=.{6,}).*$/.test(value) ? null : 'Must have 6 digits, special char,'),
        },
    });

    const handleLogin = (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in
                const user = userCredential.user;
                navigate('/');
                console.log(user);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.log(errorCode, errorMessage);
            });
    };

    const handleSignInWithGoogle = () => {
        const provider = new GoogleAuthProvider();

        signInWithPopup(auth, provider)
            .then((userCredential) => {
                // User signed in successfully
                const user = userCredential.user;
                console.log('Signed in with Google:', user);
            })
            .catch((error) => {
                // Error occurred during sign-in
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Error signing in with Google:', errorCode, errorMessage);
            });
    };

    return (
        <div className={classes.wrapper}>
            <Paper className={classes.form} radius={0} p={30}>
                <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
                    Welcome back to Ge-Metrics!
                </Title>
                <form onSubmit={form.onSubmit((values) => console.log(values))}>

                    <TextInput
                        label="Email address"
                        placeholder="hello@gmail.com"
                        size="md"
                        onChange={(e) => setEmail(e.target.value)}
                        {...form.getInputProps('email')}
                    />

                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        mt="md"
                        size="md"
                        onChange={(e) => setPassword(e.target.value)}
                        {...form.getInputProps('password')}
                    />
                    <Checkbox label="Keep me logged in" mt="xl" size="md"/>
                    <Button fullWidth mt="xl" size="md" onClick={handleLogin}>
                        Login
                    </Button>
                </form>
                <Divider/>
                <Button
                    fullWidth
                    mt="xl"
                    size="md"
                    onClick={handleSignInWithGoogle}
                    variant="outline"
                    leftIcon={<IconBrandGoogle/>}
                >
                    Sign In With Google
                </Button>

                <Text ta="center" mt="md">
                    Don&apos;t have an account?{' '}
                    <Link to="/signup" weight={700}>
                        Sign up
                    </Link>
                </Text>
            </Paper>
        </div>
    );
}
