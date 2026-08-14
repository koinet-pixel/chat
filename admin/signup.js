import { auth, db } from "../config/firebase-config.js";

import {
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   ELEMENTS
========================================================= */

const form = document.getElementById("signupForm");

const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const togglePassword = document.getElementById("togglePassword");
const toggleConfirmPassword =
    document.getElementById("toggleConfirmPassword");

const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

const successMessage = document.getElementById("successMessage");
const successText = document.getElementById("successText");

const signupButton = document.getElementById("signupButton");
const signupButtonText = document.getElementById("signupButtonText");
const signupButtonIcon = document.getElementById("signupButtonIcon");

const lengthCheck = document.getElementById("lengthCheck");
const letterCheck = document.getElementById("letterCheck");
const numberCheck = document.getElementById("numberCheck");


/* =========================================================
   SAFETY CHECK
========================================================= */

if (!form) {
    console.error("Signup form (#signupForm) was not found.");
}


/* =========================================================
   MESSAGE SYSTEM
========================================================= */

function clearMessages() {

    if (errorMessage) {
        errorMessage.hidden = true;
    }

    if (successMessage) {
        successMessage.hidden = true;
    }

    if (errorText) {
        errorText.textContent = "";
    }

    if (successText) {
        successText.textContent = "";
    }
}


function showError(text) {

    if (successMessage) {
        successMessage.hidden = true;
    }

    if (errorText) {
        errorText.textContent = text;
    }

    if (errorMessage) {
        errorMessage.hidden = false;
    }
}


function showSuccess(text) {

    if (errorMessage) {
        errorMessage.hidden = true;
    }

    if (successText) {
        successText.textContent = text;
    }

    if (successMessage) {
        successMessage.hidden = false;
    }
}


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

function togglePasswordVisibility(input, button) {

    if (!input || !button) return;

    const isPassword = input.type === "password";

    input.type = isPassword ? "text" : "password";

    button.innerHTML = isPassword
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';

    button.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
    );
}


togglePassword?.addEventListener("click", () => {

    togglePasswordVisibility(
        password,
        togglePassword
    );

});


toggleConfirmPassword?.addEventListener("click", () => {

    togglePasswordVisibility(
        confirmPassword,
        toggleConfirmPassword
    );

});


/* =========================================================
   PASSWORD REQUIREMENTS
========================================================= */

password?.addEventListener("input", () => {

    const value = password.value;

    lengthCheck?.classList.toggle(
        "valid",
        value.length >= 8
    );

    letterCheck?.classList.toggle(
        "valid",
        /[A-Za-z]/.test(value)
    );

    numberCheck?.classList.toggle(
        "valid",
        /[0-9]/.test(value)
    );

});


/* =========================================================
   LOADING STATE
========================================================= */

function setLoading(loading) {

    if (!signupButton) return;

    signupButton.disabled = loading;

    if (signupButtonText) {
        signupButtonText.textContent = loading
            ? "Creating Account..."
            : "Create Admin Account";
    }

    if (signupButtonIcon) {
        signupButtonIcon.hidden = loading;
    }
}


/* =========================================================
   FIREBASE ERROR HANDLER
========================================================= */

function firebaseError(error) {

    console.error("Firebase signup error:", error);

    switch (error.code) {

        case "auth/email-already-in-use":
            return "This email is already registered. Please login instead.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Password is too weak. Use at least 8 characters.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        case "auth/operation-not-allowed":
            return "Email/password authentication is disabled in Firebase.";

        case "auth/invalid-api-key":
            return "Firebase configuration is invalid.";

        case "permission-denied":
        case "firestore/permission-denied":
            return "Firestore permission denied. Check your Firestore security rules.";

        default:
            return error.message ||
                "Unable to create the account.";
    }
}


/* =========================================================
   FORM SUBMISSION
========================================================= */

form?.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();

    const name = fullName.value.trim();

    const userEmail =
        email.value.trim().toLowerCase();

    const userPassword =
        password.value;

    const confirmation =
        confirmPassword.value;


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (name.length < 2) {

        showError("Please enter your full name.");

        fullName.focus();

        return;
    }


    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {

        showError("Please enter a valid email address.");

        email.focus();

        return;
    }


    if (
        userPassword.length < 8 ||
        !/[A-Za-z]/.test(userPassword) ||
        !/[0-9]/.test(userPassword)
    ) {

        showError(
            "Password must contain at least 8 characters, a letter and a number."
        );

        password.focus();

        return;
    }


    if (userPassword !== confirmation) {

        showError("Passwords do not match.");

        confirmPassword.focus();

        return;
    }


    /* -----------------------------------------------------
       START LOADING
    ----------------------------------------------------- */

    setLoading(true);


    try {

        console.log("1. Creating Firebase Auth account...");


        /* =================================================
           STEP 1 — CREATE AUTH ACCOUNT
        ================================================= */

        const credential =
            await createUserWithEmailAndPassword(
                auth,
                userEmail,
                userPassword
            );

        const user = credential.user;

        console.log(
            "2. Firebase account created:",
            user.uid
        );


        /* =================================================
           STEP 2 — UPDATE FIREBASE PROFILE
        ================================================= */

        await updateProfile(user, {
            displayName: name
        });

        console.log(
            "3. Firebase profile updated."
        );


        /* =================================================
           STEP 3 — CREATE ADMIN FIRESTORE PROFILE
        ================================================= */

        await setDoc(
            doc(db, "users", user.uid),
            {
                uid: user.uid,
                name: name,
                email: userEmail,
                role: "admin",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }
        );

        console.log(
            "4. Admin Firestore profile created."
        );


        /* =================================================
           STEP 4 — SHOW SUCCESS
        ================================================= */

        showSuccess(
            "Admin account created successfully. Redirecting to login..."
        );


        if (signupButtonText) {
            signupButtonText.textContent =
                "Account Created";
        }


        if (signupButtonIcon) {

            signupButtonIcon.hidden = false;

            signupButtonIcon.className =
                "fa-solid fa-check";
        }


        /*
         * IMPORTANT:
         *
         * Do NOT allow signOut() to prevent the redirect.
         * The account has already been created successfully.
         */

        try {

            await signOut(auth);

            console.log(
                "5. Firebase user signed out."
            );

        } catch (signOutError) {

            /*
             * Signing out is not allowed to block
             * the successful redirect.
             */

            console.warn(
                "Sign out warning:",
                signOutError
            );
        }


        /* =================================================
           STEP 5 — REDIRECT TO LOGIN
        ================================================= */

        setTimeout(() => {

            window.location.replace(
                "login.html"
            );

        }, 1200);


    } catch (error) {

        console.error(
            "Signup process failed:",
            error
        );


        showError(
            firebaseError(error)
        );


        setLoading(false);
    }

});
