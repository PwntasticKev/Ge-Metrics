import {useState} from 'react'
import {NavLink, useNavigate} from 'react-router-dom'
import {auth} from '../../firebase.jsx'
import {createUserWithEmailAndPassword} from "firebase/auth";

import {Button, Checkbox, createStyles, Paper, PasswordInput, rem, Text, TextInput, Title,} from '@mantine/core';


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

export default function Signup() {
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const {classes} = useStyles();
    const navigate = useNavigate();

    const handleUserRegistration = () => {
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // New user created successfully
                const user = userCredential.user;
                console.log('New user created:', user);
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

                <TextInput
                    label="Email address" placeholder="hello@gmail.com" size="md"
                    onChange={(e) => setEmail(e.target.value)}/>
                <PasswordInput label="Password" placeholder="Your password" mt="md" size="md"
                               onChange={(e) => setPassword(e.target.value)}/>
                <Checkbox label="Keep me logged in" mt="xl" size="md"/>
                <Button fullWidth mt="xl" size="md" onClick={handleUserRegistration}>
                    Create
                </Button>


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