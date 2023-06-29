import React, {useEffect, useState} from 'react'
import {BrowserRouter as Router, Outlet, Route, Routes} from "react-router-dom";
import ErrorPage from "./pages/error-page.jsx";
import AllItems from "./pages/AllItems";

import CombinationItems from "./pages/CombinationItems";
import MoneyMaking from "./pages/MoneyMaking";
import Login from "./pages/Login";
import Faq from "./pages/Faq";
import {AppShell, MantineProvider, useMantineTheme} from '@mantine/core';
import {QueryClient, QueryClientProvider} from "react-query";
import NavHeader from './components/NavHeader.jsx'
import NavMenu from './components/NavBar/NavBar.jsx'
import {onAuthStateChanged} from "firebase/auth";
import {auth} from './firebase.jsx';


export default function App() {
    const queryClient = new QueryClient();
    const theme = useMantineTheme();
    const [opened, setOpened] = useState(false);
    const [loggedIn, setLoggedIn] = useState(null);

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoggedIn(true);
                console.log('i see yourwe logged in')
                // User is signed in, see docs for a list of available properties
                // https://firebase.google.com/docs/reference/js/firebase.User
                const uid = user.uid;
                // ...
                console.log("uid", uid)
            } else {
                // User is signed out
                // ...
                console.log("user is logged out")
            }
        });

    }, [])

    return (
        <QueryClientProvider client={queryClient}>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={{
                colorScheme: 'dark',
                colors: {
                    // override dark colors to change them for all components
                    dark: [
                        '#d5d7e0',
                        '#acaebf',
                        '#8c8fa3',
                        '#666980',
                        '#4d4f66',
                        '#34354a',
                        '#2b2c3d',
                        '#1d1e30',
                        '#0c0d21',
                        '#01010a',
                    ],
                },
            }}>

                <Router>
                    <Routes>
                        {/* Common routes accessible to all users */}
                        <Route path="/login" element={<Login/>}/>

                        {/* Protected routes accessible only to logged-in users */}
                        {loggedIn ? (
                            <Route
                                element={
                                    <AppShell
                                        navbarOffsetBreakpoint="sm"
                                        asideOffsetBreakpoint="sm"
                                        padding="md"
                                        navbar={<NavMenu opened={opened}/>}
                                        header={<NavHeader setOpened={setOpened} opened={opened}/>}
                                        styles={(theme) => ({
                                            main: {
                                                backgroundColor:
                                                    theme.colorScheme === 'dark'
                                                        ? theme.colors.dark[8]
                                                        : theme.colors.gray[0],
                                            },
                                        })}
                                    >
                                        <Outlet/>
                                    </AppShell>
                                }
                            >
                                <Route path="/" element={<AllItems/>}/>
                                <Route path="/combination-items" element={<CombinationItems/>}/>
                                <Route path="/money-making" element={<MoneyMaking/>}/>
                                <Route path="/faq" element={<Faq/>}/>
                                <Route path="*" element={<ErrorPage/>}/>
                            </Route>
                        ) : (
                            <Route path="*" element={<ErrorPage/>}/>
                        )}
                    </Routes>
                </Router>

            </MantineProvider>
        </QueryClientProvider>

    );
}
