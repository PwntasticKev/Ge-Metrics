import {signInWithEmailAndPassword, signOut} from "firebase/auth";
import {auth} from '../../firebase.jsx';


export const HandleLogout = () => {
    return signOut(auth).then(() => {
        window.location.href = "/login";

        console.log("Signed out successfully")
    }).catch((error) => {
        console.error('There was an issue logging out', error)
    });
}

export const HandleLogin = (email, password) => {

    return signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            window.location.href = "/"
            console.log(user);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorCode, errorMessage)
        });
}
