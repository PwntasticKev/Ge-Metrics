import React from 'react';
import './styles/App.scss';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import {AuthProvider} from './utils/firebase/auth-context.jsx'
import {ApolloClient, ApolloProvider, InMemoryCache} from '@apollo/client';

const client = new ApolloClient({
    uri: 'http://localhost:4000/graphql',
    cache: new InMemoryCache(),
});

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ApolloProvider client={client}>
            <AuthProvider>
                <App/>
            </AuthProvider>
        </ApolloProvider>
    </React.StrictMode>
);
