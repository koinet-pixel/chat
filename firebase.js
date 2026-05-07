// Firebase App
import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Firebase Auth
import {
  getAuth
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firestore
import {
  getFirestore
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCDTY77Pz07f6vnXQ-J5wGalXZQYmx8hEg",
  authDomain: "project-5363e817-8c2e-4fcc-af9.firebaseapp.com",
  projectId: "project-5363e817-8c2e-4fcc-af9",
  storageBucket: "project-5363e817-8c2e-4fcc-af9.firebasestorage.app",
  messagingSenderId: "330166619870",
  appId: "1:330166619870:web:9c7342da5f1f94c7e5fc4f"

};

// Initialize Firebase
const app =
initializeApp(firebaseConfig);

// Auth
export const auth =
getAuth(app);

// Firestore
export const db =
getFirestore(app);