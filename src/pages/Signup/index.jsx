import {NavLink, useNavigate} from 'react-router-dom'
import {auth} from '../../firebase.jsx'
import {createUserWithEmailAndPassword} from "firebase/auth";
import {gql, useMutation} from '@apollo/client';
import bg from '../../assets/gehd.png';

import {Button, Checkbox, createStyles, Paper, PasswordInput, rem, Text, TextInput, Title,} from '@mantine/core';
import {useForm} from "@mantine/form";


const useStyles = createStyles((theme) => ({
    wrapper: {
        minHeight: rem(300),
        backgroundSize: 'cover',
        backgroundImage: `url(${bg})`
    },

    form: {
        borderRight: `${rem(1)} solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[3]
        }`,
        minHeight: '100vh',
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

const CREATE_USER_MUTATION = gql`
    mutation createUser(
        $name: String
        $runescapeName: String
        $firebaseUid: String
        $email: String
        $password: String
        $timezone: String

    ) {
        createUser(
            name: $name
            runescape_name: $runescapeName
            firebase_uid: $firebaseUid
            email: $email
            password: $password
            timezone: $timezone
        ) {
            name
            created_at
            email
            password
            runescape_name
            timezone
            firebase_uid
        }
    }
`;
export default function Signup() {
    const {classes} = useStyles();
    const navigate = useNavigate();
    const [createUser, {loading, error}] = useMutation(CREATE_USER_MUTATION);

    const form = useForm({
        initialValues: {
            rsName: '',
            email: ''
        },

        initialErrors: {
            password: '',
            rsName: '',
            firebase: ''
        },

        validate: {
            rsName: (value) => (/^.{3}$/.test(value) ? null : 'Empty Field'),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (/^(?=.*[!@#$%^&*()_+])(?=.{6,}).*$/.test(value) ? null : 'Must have 6 digits, special char,'),
        },
    });

    const handleUserRegistration = async () => {
        const {name, rsName, email, password} = form.values;

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            const user = auth.currentUser;

            if (user && user.uid) {
                console.log('New user uid created:', user.uid);
                await createUser({
                    variables: {
                        name: name,
                        runescapeName: rsName,
                        firebaseUid: user.uid,
                        email,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                    },
                });
                navigate('/')
            } else {
                console.log('Could not find user.id');
            }
        } catch (error) {
            // Handle Firebase authentication error
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Error creating user:', errorCode, errorMessage);

            if (errorCode === 'auth/email-already-in-use') {
                form.setErrors({email: 'Email is already in use'});
            } else {
                form.setErrors({firebase: 'An error occurred during registration'});
            }
        }
    };


    return (
        <div className={classes.wrapper}>
            <Paper className={classes.form} radius={0} p={30}>
                <Title order={2} className={classes.title} ta="center" mt="md" mb={50}>
                    Sign up on Ge-Metrics
                </Title>
                <form onSubmit={form.onSubmit((values) => console.log(values))}>

                    <TextInput
                        label="Email address"
                        placeholder="hello@gmail.com"
                        size="md"
                        error={form.errors.email}
                        {...form.getInputProps('email')}
                    />
                    <TextInput
                        label="Runescape Name"
                        placeholder="Your Runescape Name"
                        size="md"
                        mt="lg"
                        error={form.errors.password}
                        {...form.getInputProps('rsName')}
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        mt="lg"
                        size="md"
                        error={form.errors.password}
                        {...form.getInputProps('password')}
                    />

                    <Checkbox label="Keep me logged in" mt="xl" size="md"/>
                    <Button fullWidth mt="xl" size="md" onClick={handleUserRegistration}>
                        Create
                    </Button>
                </form>


                <Text ta="center" mt="md">
                    Already have an account?{' '}
                    <NavLink to="/login" weight={700}>
                        login
                    </NavLink>
                </Text>
            </Paper>
        </div>
    );
}

