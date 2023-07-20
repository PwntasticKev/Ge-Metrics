import {NavLink, useNavigate} from 'react-router-dom'
import {auth} from '../../firebase.jsx'
import {createUserWithEmailAndPassword} from "firebase/auth";
import {gql, useMutation} from '@apollo/client';

import {Button, Checkbox, createStyles, Paper, PasswordInput, rem, Text, TextInput, Title,} from '@mantine/core';
import {useForm} from "@mantine/form";


const useStyles = createStyles((theme) => ({
    wrapper: {
        minHeight: rem(900),
        backgroundSize: 'cover',
        backgroundImage:
            'url(https://images.unsplash.com/photo-1484242857719-4b9144542727?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1280&q=80)',
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

const CREATE_USER_MUTATION = gql`
    mutation createUser(
        $name: String
        $runescapeName: String
        $email: String
        $password: String
        $timezone: String
        $firebaseUid: Int
    ) {
        createUser(
            name: $name
            runescape_name: $runescapeName
            email: $email
            password: $password
            timezone: $timezone
            firebase_uid: $firebaseUid
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
            name: '',
        },

        validate: {
            rsName: (value) => (/^.{3}$/.test(value) ? null : 'Empty Field'),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (/^(?=.*[!@#$%^&*()_+])(?=.{6,}).*$/.test(value) ? null : 'Must have 6 digits, special char,'),
        },
    });
    const handleUserRegistration = () => {
        const {name, rsName, email, password} = form.values;
        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // New user created successfully
                const user = userCredential.user;
                console.log('New user created:', user);

                await createUser({
                    variables: {
                        name: name,
                        runescapeName: rsName,
                        firebase_uid: user.uid,
                        membership: 0, // Replace 0 with the actual value of the user's membership status (if applicable)
                        email,
                        img: '', // Replace '' with the actual value of the user's image URL (if applicable)
                        password,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', // Replace '' with the actual value of the user's timezone (if applicable)
                    },
                });
                navigate('/')
            })
            .catch((error) => {
                // Error occurred during user creation
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Error creating user:', errorCode, errorMessage);
            });
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
                        onChange={(e) => setEmail(e.target.value)}
                        {...form.getInputProps('email')}
                    />

                    <TextInput
                        label="Runescape Name"
                        placeholder="Your Runescape Name"
                        size="md"
                        mt="lg"
                        onChange={(e) => setEmail(e.target.value)}
                        {...form.getInputProps('rsName')}
                    />

                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        mt="lg"
                        size="md"
                        onChange={(e) => setPassword(e.target.value)}
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

