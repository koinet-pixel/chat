import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


const firebaseConfig = {

    apiKey: "AIzaSyBMBgDNEv6fWT5Y0SkwRlbe9c0Tpz1a7-4",

    authDomain:
        "myportfolioadmin-62fb0.firebaseapp.com",

    projectId:
        "myportfolioadmin-62fb0",

    storageBucket:
        "myportfolioadmin-62fb0.firebasestorage.app",

    messagingSenderId:
        "1053123793987",

    appId:
        "1:1053123793987:web:509e87f86bc3b79e1070f6"
};


const app =
    initializeApp(firebaseConfig);


const auth =
    getAuth(app);


const db =
    getFirestore(app);


const storage =
    getStorage(app);


export {
    app,
    auth,
    db,
    storage
};