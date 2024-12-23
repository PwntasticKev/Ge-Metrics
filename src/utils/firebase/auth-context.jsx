import { createContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase.jsx'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      console.log('no auth required')
    //   if (user) {
    //     setUser(user)
    //     setLoggedIn(true)
    //     // User is signed in, see docs for a list of available properties
    //     // https://firebase.google.com/docs/reference/js/firebase.User
    //     const uid = user.uid
    //     // ...
    //   } else {
    //     // User is signed out
    //     // ...
    //     console.log('user is logged out')
    //   }
    })
  })

  return (
        <AuthContext.Provider value={{ loggedIn, user }}>
            {children}
        </AuthContext.Provider>
  )
}
