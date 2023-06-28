import React, {useEffect} from 'react'
import Layout from "./layouts/Layout.jsx";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import ErrorPage from "./pages/error-page.jsx";
import Home from "./pages/Home.jsx";
import {MantineProvider, Flex} from '@mantine/core';
import {QueryClient, QueryClientProvider} from "react-query";


export default function App() {
    const queryClient = new QueryClient();

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
                    <Flex mih={50}
                          bg="rgba(0, 0, 0, .3)"
                          gap="md"
                          justify="flex-start"
                          align="flex-start"
                          direction="row">
                        <Layout/>
                        <Routes>
                            <Route path="/" element={<Home/>}/>
                            <Route path="*" element={<ErrorPage/>}/>
                        </Routes>
                    </Flex>
                </Router>

            </MantineProvider>
        </QueryClientProvider>

    );
}
