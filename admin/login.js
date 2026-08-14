import { auth, db } from "../config/firebase-config.js";

import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   WAIT FOR PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const form =
        document.getElementById("loginForm");

    if (!form) {
        console.error(
            "Login form (#loginForm) was not found."
        );

        return;
    }


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const email =
        document.getElementById("email");

    const password =
        document.getElementById("password");

    const remember =
        document.getElementById("rememberMe");

    const button =
        document.getElementById("loginBtn");

    const buttonText =
        document.getElementById("loginBtnText");

    const buttonIcon =
        document.getElementById("loginBtnIcon");

    const spinner =
        document.getElementById("loginSpinner");

    const errorBox =
        document.getElementById("loginError");

    const errorText =
        document.getElementById("loginErrorText");

    const toggle =
        document.getElementById("passwordToggle");


    let submitting = false;


    /* =====================================================
       ERROR
    ===================================================== */

    function showError(message) {

        if (errorText) {
            errorText.textContent = message;
        }

        if (errorBox) {
            errorBox.hidden = false;
        }
    }


    function hideError() {

        if (errorBox) {
            errorBox.hidden = true;
        }

        if (errorText) {
            errorText.textContent = "";
        }
    }


    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(state) {

        if (button) {
            button.disabled = state;
        }

        if (buttonText) {

            buttonText.textContent =
                state
                    ? "Signing in..."
                    : "Sign In";
        }

        if (buttonIcon) {
            buttonIcon.hidden = state;
        }

        if (spinner) {
            spinner.hidden = !state;
        }
    }


    /* =====================================================
       PASSWORD TOGGLE
    ===================================================== */

    toggle?.addEventListener(
        "click",
        () => {

            const visible =
                password.type === "text";

            password.type =
                visible
                    ? "password"
                    : "text";


            toggle.innerHTML = visible
                ? '<i class="fa-solid fa-eye"></i>'
                : '<i class="fa-solid fa-eye-slash"></i>';


            toggle.setAttribute(
                "aria-label",
                visible
                    ? "Show password"
                    : "Hide password"
            );
        }
    );


    /* =====================================================
       FIREBASE ERRORS
    ===================================================== */

function firebaseError(error) {

    console.error("Firebase login error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    switch (error.code) {

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "Incorrect email or password.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/too-many-requests":
            return "Too many failed attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/operation-not-allowed":
            return "Email/password authentication is disabled in Firebase.";

        case "auth/invalid-api-key":
            return "Your Firebase configuration is invalid.";

        case "permission-denied":
            return "Firestore denied access to the administrator profile. Check your Firestore rules.";

        case "failed-precondition":
            return "Firestore is not configured correctly.";

        case "unavailable":
            return "Firebase is temporarily unavailable. Please try again.";

        default:
            return error.message ||
                   "Unable to sign in. Please try again.";
    }
}


    /* =====================================================
       LOGIN
    ===================================================== */

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (submitting) {
                return;
            }


            hideError();


            const userEmail =
                email.value.trim().toLowerCase();

            const userPassword =
                password.value;


            /* ---------------------------------------------
               VALIDATION
            --------------------------------------------- */

            if (!userEmail) {

                showError(
                    "Please enter your email address."
                );

                email.focus();

                return;
            }


            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    userEmail
                )
            ) {

                showError(
                    "Please enter a valid email address."
                );

                email.focus();

                return;
            }


            if (!userPassword) {

                showError(
                    "Please enter your password."
                );

                password.focus();

                return;
            }


            /* ---------------------------------------------
               START LOGIN
            --------------------------------------------- */

            submitting = true;

            setLoading(true);


            try {

                console.log(
                    "1. Setting Firebase persistence..."
                );


                /* =========================================
                   STEP 1 — PERSISTENCE
                ========================================= */

                await setPersistence(
                    auth,
                    remember?.checked
                        ? browserLocalPersistence
                        : browserSessionPersistence
                );


                /* =========================================
                   STEP 2 — FIREBASE AUTH
                ========================================= */

                console.log(
                    "2. Signing into Firebase..."
                );


                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        userEmail,
                        userPassword
                    );


                const user =
                    credential.user;


                console.log(
                    "3. Firebase login successful:",
                    user.uid
                );


                /* =========================================
                   STEP 3 — GET ADMIN PROFILE
                ========================================= */

                console.log(
                    "4. Checking administrator profile..."
                );


                const profileSnapshot =
                    await getDoc(
                        doc(
                            db,
                            "users",
                            user.uid
                        )
                    );


                /* =========================================
                   PROFILE DOES NOT EXIST
                ========================================= */

                if (!profileSnapshot.exists()) {

                    await signOut(auth);

                    throw new Error(
                        "ADMIN_PROFILE_NOT_FOUND"
                    );
                }


                const profile =
                    profileSnapshot.data();


                /* =========================================
                   CHECK ADMIN ROLE
                ========================================= */

                if (
                    profile.role !== "admin"
                ) {

                    await signOut(auth);

                    throw new Error(
                        "NOT_ADMIN"
                    );
                }


                /* =========================================
                   SUCCESS
                ========================================= */

                console.log(
                    "5. Administrator verified."
                );


                if (buttonText) {
                    buttonText.textContent =
                        "Success";
                }


                if (buttonIcon) {

                    buttonIcon.hidden = false;

                    buttonIcon.className =
                        "fa-solid fa-check";
                }


                /* =========================================
                   REDIRECT
                ========================================= */

                setTimeout(() => {

                    window.location.replace(
                        "dashboard.html"
                    );

                }, 300);


            } catch (error) {

                console.error(
                    "Login process failed:",
                    error
                );


                if (
                    error.message ===
                    "ADMIN_PROFILE_NOT_FOUND"
                ) {

                    showError(
                        "This account does not have an administrator profile."
                    );

                }

                else if (
                    error.message ===
                    "NOT_ADMIN"
                ) {

                    showError(
                        "This account is not authorized to access the admin dashboard."
                    );

                }

                else {

                    showError(
                        firebaseError(error)
                    );
                }


                submitting = false;

                setLoading(false);
            }
        }
    );


    /* =====================================================
       ENTER KEY
    ===================================================== */

    password?.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                form.requestSubmit();
            }
        }
    );

});
