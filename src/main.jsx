import React from 'react';
import './styles/App.scss';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import {AuthProvider} from './utils/firebase/auth-context.jsx'
// import {ApolloClient, InMemoryCache, ApolloProvider, gql} from '@apollo/client';


createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/*<ApolloProvider client={client}>*/}
        <AuthProvider>
            <App/>
        </AuthProvider>
        {/*</ApolloProvider>*/}
    </React.StrictMode>
);


// const client = new ApolloClient({
//     uri: 'https://flyby-router-demo.herokuapp.com/',
//     cache: new InMemoryCache(),
// });
//
// client
//     .query({
//         query: gql`
//       query GetLocations {
//         locations {
//           id
//           name
//           description
//           photo
//         }
//       }
//     `,
//     })
// .then((result) => console.log('greetings:', result));
