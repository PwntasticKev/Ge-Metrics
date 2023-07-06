import {createContext, useEffect, useState} from 'react'
import {onAuthStateChanged} from "firebase/auth";
import {auth} from '../../firebase.jsx';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [loggedIn, setLoggedIn] = useState(null);
    const value = [loggedIn, setLoggedIn]


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoggedIn(true);
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
            return () => unsubscribe();
        });
    });

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

}