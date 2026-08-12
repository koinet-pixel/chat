// ============================================================
// LAYOUT.JS
// Let's Chat / GlobalChat
// STRICT AUTHENTICATION GUARD
// Firebase SDK 10.12.2
//
// ACCESS RULE:
//
// 1. User MUST have a Firebase Authentication account.
// 2. User MUST be authenticated.
// 3. Unauthenticated users are immediately redirected to login.html.
// 4. chat.html remains hidden until Firebase confirms authentication.
// 5. Firestore profile is created/loaded only AFTER authentication.
// 6. Signing out immediately removes access.
// ============================================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// ELEMENTS
// ============================================================

const authGuard = document.getElementById("authGuard");
const chatApp = document.querySelector(".chat-app");

const username = document.getElementById("username");
const email = document.getElementById("email");
const avatar = document.getElementById("avatar");
const welcomeName = document.getElementById("welcomeName");

const totalUsers = document.getElementById("totalUsers");
const onlineUsers = document.getElementById("onlineUsers");
const totalMessages = document.getElementById("totalMessages");
const myStatus = document.getElementById("myStatus");

const activityList = document.getElementById("activityList");
const logoutBtn = document.getElementById("logoutBtn");
const currentDate = document.getElementById("currentDate");

// ============================================================
// STATE
// ============================================================

let currentUser = null;
let authenticationVerified = false;

// ============================================================
// IMPORTANT SECURITY MEASURE
// ============================================================
//
// Hide the dashboard immediately when JavaScript starts.
//
// Even if somebody directly enters:
//
//     chat.html
//
// the dashboard remains invisible until Firebase confirms
// that a valid authenticated session exists.
// ============================================================

if (chatApp) {
    chatApp.style.visibility = "hidden";
}

if (authGuard) {
    authGuard.style.display = "flex";
    authGuard.style.opacity = "1";
    authGuard.style.pointerEvents = "auto";
}

// ============================================================
// INITIALS
// ============================================================

function getInitials(name) {

    if (!name) {
        return "U";
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {

        return parts[0]
            .charAt(0)
            .toUpperCase();

    }

    return (
        parts[0].charAt(0) +
        parts[1].charAt(0)
    ).toUpperCase();
}

// ============================================================
// AUTH GUARD SCREEN
// ============================================================

function showAuthGuard(
    message = "Verifying your session..."
) {

    if (!authGuard) {
        return;
    }

    authGuard.style.display = "flex";
    authGuard.style.opacity = "1";
    authGuard.style.pointerEvents = "auto";

    authGuard.innerHTML = `

        <div class="auth-loader">

            <div class="loader-ring"></div>

            <strong>
                ${message}
            </strong>

            <span>
                Please wait...
            </span>

        </div>

    `;
}

// ============================================================
// HIDE DASHBOARD
// ============================================================

function hideDashboard() {

    authenticationVerified = false;

    if (chatApp) {
        chatApp.style.visibility = "hidden";
    }

    showAuthGuard(
        "Authentication required..."
    );
}

// ============================================================
// SHOW DASHBOARD
// ============================================================

function showDashboard() {

    // --------------------------------------------------------
    // SECURITY CHECK
    // --------------------------------------------------------
    //
    // Never show dashboard unless Firebase has confirmed
    // an authenticated user.
    // --------------------------------------------------------

    if (!currentUser) {
        hideDashboard();
        return;
    }

    authenticationVerified = true;

    if (chatApp) {
        chatApp.style.visibility = "visible";
    }

    if (authGuard) {

        authGuard.style.opacity = "0";
        authGuard.style.pointerEvents = "none";

        setTimeout(() => {

            if (authenticationVerified) {
                authGuard.style.display = "none";
            }

        }, 250);
    }
}

// ============================================================
// CURRENT DATE
// ============================================================

if (currentDate) {

    currentDate.textContent =
        new Date().toLocaleDateString(
            "en-KE",
            {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
}

// ============================================================
// CREATE FIRESTORE PROFILE
// ============================================================
//
// IMPORTANT:
//
// This function is NEVER used to authenticate a user.
//
// Firebase Authentication is the authentication authority.
// Firestore only stores the user's profile.
// ============================================================

async function createMissingProfile(user) {

    if (!user || !user.uid) {
        throw new Error(
            "Invalid authenticated user."
        );
    }

    const userRef =
        doc(db, "users", user.uid);

    const profileSnap =
        await getDoc(userRef);

    if (!profileSnap.exists()) {

        console.log(
            "Creating Firestore profile..."
        );

        await setDoc(
            userRef,
            {
                uid: user.uid,

                username:
                    user.displayName ||
                    "User",

                email:
                    user.email ||
                    "",

                photoURL:
                    user.photoURL ||
                    "",

                role: "user",

                online: true,

                createdAt:
                    serverTimestamp(),

                lastSeen:
                    serverTimestamp()
            }
        );

        console.log(
            "Firestore profile created."
        );
    }
}

// ============================================================
// LOAD CURRENT USER PROFILE
// ============================================================

async function loadMyProfile(user) {

    if (!user) {
        throw new Error(
            "No authenticated user."
        );
    }

    const userRef =
        doc(db, "users", user.uid);

    let profileSnap =
        await getDoc(userRef);

    // --------------------------------------------------------
    // Create missing profile
    // --------------------------------------------------------

    if (!profileSnap.exists()) {

        await createMissingProfile(user);

        profileSnap =
            await getDoc(userRef);
    }

    if (!profileSnap.exists()) {

        throw new Error(
            "Unable to load your user profile."
        );
    }

    const profile =
        profileSnap.data();

    displayProfile(
        user,
        profile
    );
}

// ============================================================
// DISPLAY PROFILE
// ============================================================

function displayProfile(user, profile) {

    const displayName =
        profile.username ||
        user.displayName ||
        "User";

    if (username) {

        username.textContent =
            displayName;
    }

    if (welcomeName) {

        welcomeName.textContent =
            displayName;
    }

    if (email) {

        email.textContent =
            profile.email ||
            user.email ||
            "";
    }

    if (avatar) {

        if (profile.photoURL) {

            avatar.innerHTML = `
                <img
                    src="${profile.photoURL}"
                    alt="${displayName}"
                >
            `;

        } else {

            avatar.textContent =
                getInitials(displayName);
        }
    }

    if (myStatus) {

        myStatus.textContent =
            "Online";
    }
}

// ============================================================
// SET USER ONLINE
// ============================================================

async function setUserOnline(user) {

    if (!user || !user.uid) {
        return;
    }

    try {

        await updateDoc(
            doc(db, "users", user.uid),
            {
                online: true,
                lastSeen: serverTimestamp()
            }
        );

    } catch (error) {

        console.error(
            "Unable to set online status:",
            error
        );
    }
}

// ============================================================
// LOAD USERS
// ============================================================

function loadUsers() {

    onSnapshot(

        collection(db, "users"),

        snapshot => {

            const users =
                snapshot.docs.map(
                    document => ({
                        id: document.id,
                        ...document.data()
                    })
                );

            // ------------------------------------------------
            // TOTAL USERS
            // ------------------------------------------------

            if (totalUsers) {

                totalUsers.textContent =
                    users.length;
            }

            // ------------------------------------------------
            // ONLINE USERS
            // ------------------------------------------------

            const online =
                users.filter(
                    user =>
                        user.online === true
                ).length;

            if (onlineUsers) {

                onlineUsers.textContent =
                    online;
            }

            // ------------------------------------------------
            // RECENT USERS
            // ------------------------------------------------

            const recentUsers =
                [...users]
                    .sort((a, b) => {

                        const aTime =
                            a.lastSeen?.toMillis?.() ||
                            a.createdAt?.toMillis?.() ||
                            0;

                        const bTime =
                            b.lastSeen?.toMillis?.() ||
                            b.createdAt?.toMillis?.() ||
                            0;

                        return bTime - aTime;

                    })
                    .slice(0, 5);

            if (!activityList) {
                return;
            }

            activityList.innerHTML = "";

            if (!recentUsers.length) {

                activityList.innerHTML = `

                    <div class="activity-item">

                        <div class="activity-avatar">
                            👤
                        </div>

                        <div class="activity-info">

                            <strong>
                                No users yet
                            </strong>

                            <p>
                                Registered users
                                will appear here.
                            </p>

                        </div>

                    </div>

                `;

                return;
            }

            recentUsers.forEach(user => {

                const item =
                    document.createElement("div");

                item.className =
                    "activity-item";

                const name =
                    user.username ||
                    "User";

                const status =
                    user.online === true
                        ? "Currently online"
                        : "Offline";

                item.innerHTML = `

                    <div class="activity-avatar">
                        ${getInitials(name)}
                    </div>

                    <div class="activity-info">

                        <strong>
                            ${name}
                        </strong>

                        <p>
                            ${status}
                        </p>

                    </div>

                    <div class="activity-time">

                        ${
                            user.online === true
                                ? "Online"
                                : "Offline"
                        }

                    </div>

                `;

                activityList.appendChild(item);

            });

        },

        error => {

            console.error(
                "Users listener error:",
                error
            );

        }
    );
}

// ============================================================
// LOAD CHATS
// ============================================================

function loadChats() {

    onSnapshot(

        collection(db, "chats"),

        snapshot => {

            if (totalMessages) {

                totalMessages.textContent =
                    snapshot.size;
            }

        },

        error => {

            console.error(
                "Chats listener error:",
                error
            );

            if (totalMessages) {

                totalMessages.textContent =
                    "0";
            }
        }
    );
}

// ============================================================
// STRICT AUTHENTICATION GUARD
// ============================================================

hideDashboard();

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "Firebase Auth:",
            user
                ? `AUTHENTICATED — ${user.uid}`
                : "NOT AUTHENTICATED"
        );

        // ====================================================
        // NO AUTHENTICATED USER
        // ====================================================

        if (!user) {

            currentUser = null;

            authenticationVerified = false;

            // -----------------------------------------------
            // NEVER expose dashboard
            // -----------------------------------------------

            hideDashboard();

            console.log(
                "Access denied."
            );

            // -----------------------------------------------
            // Redirect to login
            // -----------------------------------------------

            window.location.replace(
                "login.html"
            );

            return;
        }

        // ====================================================
        // AUTHENTICATED USER
        // ====================================================

        currentUser = user;

        try {

            console.log(
                "Authenticated user:",
                user.email
            );

            // -----------------------------------------------
            // Create profile if necessary
            // -----------------------------------------------

            await createMissingProfile(user);

            // -----------------------------------------------
            // Load profile
            // -----------------------------------------------

            await loadMyProfile(user);

            // -----------------------------------------------
            // Set online
            // -----------------------------------------------

            await setUserOnline(user);

            // -----------------------------------------------
            // NOW and ONLY NOW show dashboard
            // -----------------------------------------------

            showDashboard();

            // -----------------------------------------------
            // Start realtime listeners
            // -----------------------------------------------

            loadUsers();

            loadChats();

            console.log(
                "Dashboard access granted."
            );

        } catch (error) {

            console.error(
                "Dashboard initialization failed:",
                error
            );

            // ------------------------------------------------
            // Do NOT show dashboard if initialization fails
            // ------------------------------------------------

            currentUser = null;

            authenticationVerified = false;

            if (chatApp) {
                chatApp.style.visibility =
                    "hidden";
            }

            if (authGuard) {

                authGuard.style.display =
                    "flex";

                authGuard.style.opacity =
                    "1";

                authGuard.style.pointerEvents =
                    "auto";

                authGuard.innerHTML = `

                    <div class="auth-loader">

                        <strong>
                            Unable to verify account
                        </strong>

                        <span>
                            ${error.message}
                        </span>

                        <button
                            id="retryAuth"
                            style="
                                margin-top:15px;
                                padding:10px 18px;
                                border:0;
                                border-radius:10px;
                                cursor:pointer;
                                background:#3b82f6;
                                color:white;
                                font-weight:600;
                            "
                        >
                            Try Again
                        </button>

                        <button
                            id="returnLogin"
                            style="
                                margin-top:8px;
                                padding:10px 18px;
                                border:0;
                                border-radius:10px;
                                cursor:pointer;
                                background:#e2e8f0;
                                color:#0f172a;
                                font-weight:600;
                            "
                        >
                            Return to Login
                        </button>

                    </div>

                `;

                document
                    .getElementById("retryAuth")
                    ?.addEventListener(
                        "click",
                        () => {
                            location.reload();
                        }
                    );

                document
                    .getElementById("returnLogin")
                    ?.addEventListener(
                        "click",
                        async () => {

                            try {
                                await signOut(auth);
                            } catch (e) {
                                console.warn(e);
                            }

                            window.location.replace(
                                "login.html"
                            );
                        }
                    );
            }
        }
    }
);

// ============================================================
// LOGOUT
// ============================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            logoutBtn.disabled = true;

            logoutBtn.textContent =
                "Logging out...";

            try {

                const user =
                    auth.currentUser;

                // --------------------------------------------
                // Mark user offline
                // --------------------------------------------

                if (user) {

                    try {

                        await updateDoc(
                            doc(
                                db,
                                "users",
                                user.uid
                            ),
                            {
                                online: false,
                                lastSeen:
                                    serverTimestamp()
                            }
                        );

                    } catch (error) {

                        console.warn(
                            "Could not update offline status:",
                            error
                        );
                    }
                }

                // --------------------------------------------
                // Firebase sign out
                // --------------------------------------------

                await signOut(auth);

                // --------------------------------------------
                // Immediately hide dashboard
                // --------------------------------------------

                currentUser = null;
                authenticationVerified = false;

                hideDashboard();

                // --------------------------------------------
                // Redirect
                // --------------------------------------------

                window.location.replace(
                    "login.html"
                );

            } catch (error) {

                console.error(
                    "Logout failed:",
                    error
                );

                logoutBtn.disabled = false;

                logoutBtn.textContent =
                    "Logout";

                alert(
                    "Unable to logout. Please try again."
                );
            }
        }
    );
}
