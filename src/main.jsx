import React from 'react'
import './styles/App.scss'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Firebase removed - using new auth system
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: import.meta.env.VITE_APOLLO_URI,
  cache: new InMemoryCache()
})

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ApolloProvider client={client}>
            <App/>
        </ApolloProvider>
    </React.StrictMode>
)
