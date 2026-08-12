import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getStorage
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
    getDatabase
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyBjtMM-pG6tSbMj36QCX57vwbohNqgI-ws",
  authDomain: "newglobchat.firebaseapp.com",
  projectId: "newglobchat",
  storageBucket: "newglobchat.firebasestorage.app",
  messagingSenderId: "1033424696083",
  appId: "1:1033424696083:web:d27e3417531a9650a7e0e6",
  measurementId: "G-ZH60S94RHK"
};


const app =
    initializeApp(
        firebaseConfig
    );


const auth =
    getAuth(app);


const db =
    getFirestore(app);


const storage =
    getStorage(app);


const rtdb =
    getDatabase(app);


export {
    app,
    auth,
    db,
    storage,
    rtdb
};