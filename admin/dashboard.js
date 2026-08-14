// ============================================================
// DASHBOARD.JS
// Firebase Admin Portfolio Dashboard
// Firebase SDK 10.12.2
// ============================================================

import { auth, db, storage } from "../config/firebase-config.js";

import {
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


// ============================================================
// DOM HELPERS
// ============================================================

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) =>
    Array.from(document.querySelectorAll(selector));


// ============================================================
// APPLICATION STATE
// ============================================================

const state = {
    user: null,
    userData: null,

    messages: [],
    currentMessage: null,

    unsubscribeMessages: null,

    initialized: false,
    authStarted: false,

    toastTimer: null
};


// ============================================================
// FIRESTORE REFERENCES
// ============================================================

const profileRef = () =>
    doc(db, "siteSettings", "profile");

const contactRef = () =>
    doc(db, "siteSettings", "contact");

const userRef = (uid) =>
    doc(db, "users", uid);

const messagesRef = () =>
    collection(db, "messages");


// ============================================================
// GENERAL HELPERS
// ============================================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value ?? "";
    }
}


function escapeHTML(value) {
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}


function formatDate(value) {
    if (!value) {
        return "—";
    }

    try {
        let date;

        if (typeof value?.toDate === "function") {
            date = value.toDate();
        } else if (value instanceof Date) {
            date = value;
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString();
    } catch (error) {
        console.error("Date formatting error:", error);

        return "—";
    }
}


function getMessageStatus(message) {
    if (message?.replied === true) {
        return "replied";
    }

    return message?.status || "unread";
}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {
    const toast = $("#dashboardToast");
    const toastMessage = $("#toastMessage");

    if (!toast || !toastMessage) {
        console.warn("Toast:", message);
        return;
    }

    toastMessage.textContent = message;

    toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


// ============================================================
// AUTH LOCK
// ============================================================

function hideAuthLock() {
    const lock = $("#dashboardAuthLock");

    if (!lock) {
        return;
    }

    lock.classList.add("hidden");

    setTimeout(() => {
        lock.remove();
    }, 300);
}


function showAuthError(message) {
    const lock = $("#dashboardAuthLock");

    if (!lock) {
        return;
    }

    lock.innerHTML = `
        <div class="auth-error">
            <div class="auth-error-icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h2>Dashboard Access Error</h2>

            <p>${escapeHTML(message)}</p>

            <button
                type="button"
                id="authErrorLoginBtn"
            >
                Return to Login
            </button>
        </div>
    `;

    $("#authErrorLoginBtn")?.addEventListener(
        "click",
        () => {
            window.location.replace("login.html");
        }
    );
}


// ============================================================
// FIREBASE ERROR HANDLER
// ============================================================

function firebaseErrorMessage(error) {
    if (!error) {
        return "An unknown Firebase error occurred.";
    }

    switch (error.code) {
        case "permission-denied":
            return "Permission denied. Check your Firestore security rules.";

        case "unauthenticated":
            return "Your authentication session has expired.";

        case "unavailable":
            return "Firebase is temporarily unavailable. Check your internet connection.";

        case "failed-precondition":
            return "Firebase failed a required condition. Check your Firebase configuration.";

        case "network-request-failed":
            return "Network error. Check your internet connection.";

        case "storage/unauthorized":
            return "You do not have permission to upload this file.";

        case "storage/canceled":
            return "The upload was canceled.";

        case "storage/quota-exceeded":
            return "Firebase Storage quota has been exceeded.";

        default:
            return error.message || "An unexpected Firebase error occurred.";
    }
}


// ============================================================
// ADMIN VERIFICATION
// ============================================================

async function verifyAdmin(firebaseUser) {
    if (!firebaseUser) {
        return {
            valid: false,
            reason: "No authenticated user was found."
        };
    }

    try {
        const snapshot = await getDoc(
            userRef(firebaseUser.uid)
        );

        if (!snapshot.exists()) {
            return {
                valid: false,
                reason: "Administrator profile was not found."
            };
        }

        const data = snapshot.data();

        const role = String(data.role || "")
            .trim()
            .toLowerCase();

        if (role !== "admin") {
            return {
                valid: false,
                reason: "This account does not have administrator access."
            };
        }

        if (
            data.uid &&
            data.uid !== firebaseUser.uid
        ) {
            return {
                valid: false,
                reason: "Administrator UID does not match the authenticated account."
            };
        }

        return {
            valid: true,
            data
        };

    } catch (error) {
        console.error("Admin verification failed:", error);

        return {
            valid: false,
            reason: firebaseErrorMessage(error)
        };
    }
}


// ============================================================
// AUTHENTICATION
// ============================================================

function startAuthentication() {
    if (state.authStarted) {
        return;
    }

    state.authStarted = true;

    onAuthStateChanged(
        auth,
        async (firebaseUser) => {

            // ------------------------------------------------
            // NOT LOGGED IN
            // ------------------------------------------------

            if (!firebaseUser) {
                window.location.replace("login.html");
                return;
            }


            // ------------------------------------------------
            // VERIFY ADMIN
            // ------------------------------------------------

            const verification = await Promise.race([
                verifyAdmin(firebaseUser),

                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            valid: false,
                            reason:
                                "Administrator verification timed out."
                        });
                    }, 10000);
                })
            ]);


            if (!verification.valid) {

                showAuthError(
                    verification.reason
                );

                try {
                    await signOut(auth);
                } catch (error) {
                    console.error(
                        "Sign-out after failed verification:",
                        error
                    );
                }

                return;
            }


            // ------------------------------------------------
            // ADMIN VERIFIED
            // ------------------------------------------------

            state.user = firebaseUser;
            state.userData = verification.data;

            hideAuthLock();

            updateAdminDisplay(
                firebaseUser,
                verification.data
            );

            initializeDashboard();
        }
    );
}


// ============================================================
// ADMIN DISPLAY
// ============================================================

function updateAdminDisplay(firebaseUser, data = {}) {

    const name =
        data.name ||
        firebaseUser.displayName ||
        "Isaack Shapashina";

    const photo =
        data.photoURL ||
        firebaseUser.photoURL ||
        "../images/default-avatar.png";


    setText(
        "sidebarAdminName",
        name
    );


    setText(
        "topbarUserName",
        name.split(" ")[0]
    );


    const sidebarImage =
        $("#sidebarProfileImage");

    const topbarImage =
        $("#topbarProfileImage");

    const dashboardImage =
        $("#dashboardProfileImage");


    if (sidebarImage) {
        sidebarImage.src = photo;
    }

    if (topbarImage) {
        topbarImage.src = photo;
    }

    if (dashboardImage) {
        dashboardImage.src = photo;
    }
}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const links =
        $$(".sidebar-link[data-section]");

    const sections =
        $$(".dashboard-section");


    function openSection(sectionName) {

        if (!sectionName) {
            return;
        }


        links.forEach((link) => {
            link.classList.toggle(
                "active",
                link.dataset.section === sectionName
            );
        });


        sections.forEach((section) => {
            section.classList.toggle(
                "active",
                section.id === `section-${sectionName}`
            );
        });


        const activeLink =
            links.find(
                (link) =>
                    link.dataset.section === sectionName
            );


        const title =
            activeLink?.querySelector("span")?.textContent ||
            "Dashboard";


        setText(
            "pageTitle",
            title
        );


        closeMobileSidebar();
    }


    links.forEach((link) => {

        link.addEventListener(
            "click",
            () => {
                openSection(
                    link.dataset.section
                );
            }
        );

    });


    $$("[data-open-section]").forEach(
        (element) => {

            element.addEventListener(
                "click",
                () => {

                    openSection(
                        element.dataset.openSection
                    );

                }
            );

        }
    );
}


// ============================================================
// MOBILE SIDEBAR
// ============================================================

function setupMobileMenu() {

    const menu =
        $("#mobileMenu");

    const sidebar =
        $("#sidebar");

    const overlay =
        $("#sidebarOverlay");


    if (!menu || !sidebar || !overlay) {
        console.warn(
            "Mobile sidebar elements were not found."
        );

        return;
    }


    function openSidebar() {

        sidebar.classList.add("open");

        overlay.classList.add("show");

        document.body.style.overflow =
            "hidden";


        menu.setAttribute(
            "aria-label",
            "Close menu"
        );


        const icon =
            menu.querySelector("i");


        if (icon) {
            icon.classList.remove(
                "fa-bars"
            );

            icon.classList.add(
                "fa-xmark"
            );
        }
    }


    function closeSidebar() {

        sidebar.classList.remove("open");

        overlay.classList.remove("show");

        document.body.style.overflow =
            "";


        menu.setAttribute(
            "aria-label",
            "Open menu"
        );


        const icon =
            menu.querySelector("i");


        if (icon) {
            icon.classList.remove(
                "fa-xmark"
            );

            icon.classList.add(
                "fa-bars"
            );
        }
    }


    window.dashboardOpenSidebar =
        openSidebar;

    window.dashboardCloseSidebar =
        closeSidebar;


    menu.addEventListener(
        "click",
        () => {

            if (
                sidebar.classList.contains("open")
            ) {
                closeSidebar();
            } else {
                openSidebar();
            }

        }
    );


    overlay.addEventListener(
        "click",
        closeSidebar
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {
                closeSidebar();
            }

        }
    );


    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 800) {
                closeSidebar();
            }

        }
    );
}


function closeMobileSidebar() {

    if (
        typeof window.dashboardCloseSidebar ===
        "function"
    ) {
        window.dashboardCloseSidebar();
    }
}


// ============================================================
// THEME
// ============================================================

function applyTheme(theme) {

    const validTheme =
        theme === "dark"
            ? "dark"
            : "light";


    document.documentElement.dataset.theme =
        validTheme;

    document.body.dataset.theme =
        validTheme;


    localStorage.setItem(
        "admin-dashboard-theme",
        validTheme
    );


    const themeButtonIcon =
        $("#themeBtn i");


    if (themeButtonIcon) {

        themeButtonIcon.classList.toggle(
            "fa-moon",
            validTheme === "light"
        );

        themeButtonIcon.classList.toggle(
            "fa-sun",
            validTheme === "dark"
        );
    }


    const switchElement =
        $("#themeSwitch");


    if (switchElement) {
        switchElement.classList.toggle(
            "active",
            validTheme === "dark"
        );
    }
}


function setupTheme() {

    const savedTheme =
        localStorage.getItem(
            "admin-dashboard-theme"
        );


    const initialTheme =
        savedTheme ||
        "light";


    applyTheme(
        initialTheme
    );


    function toggleTheme() {

        const current =
            document.body.dataset.theme ||
            "light";


        applyTheme(
            current === "dark"
                ? "light"
                : "dark"
        );
    }


    $("#themeBtn")?.addEventListener(
        "click",
        toggleTheme
    );


    $("#themeSwitch")?.addEventListener(
        "click",
        toggleTheme
    );
}


// ============================================================
// LOGOUT
// ============================================================

function setupLogout() {

    $$(".logout-btn").forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    if (button.disabled) {
                        return;
                    }


                    button.disabled = true;


                    try {

                        await signOut(auth);

                        stopMessageListener();

                        window.location.replace(
                            "login.html"
                        );

                    } catch (error) {

                        console.error(
                            "Logout error:",
                            error
                        );

                        button.disabled = false;

                        showToast(
                            firebaseErrorMessage(error)
                        );
                    }

                }
            );

        }
    );
}


// ============================================================
// LOAD PROFILE
// ============================================================

async function loadProfile() {

    try {

        const snapshot =
            await getDoc(
                profileRef()
            );


        if (!snapshot.exists()) {
            return;
        }


        const data =
            snapshot.data();


        const fields = {
            profileName: data.name,
            profileTitle: data.title,
            profileDescription: data.description,
            specialty1: data.specialty1,
            specialty2: data.specialty2,
            specialty3: data.specialty3
        };


        Object.entries(fields).forEach(
            ([id, value]) => {

                const field =
                    document.getElementById(id);

                if (field) {
                    field.value =
                        value || "";
                }

            }
        );


        if (data.photoURL) {

            updateAllProfileImages(
                data.photoURL
            );
        }


        if (data.cvURL) {

            setText(
                "cvFileName",
                data.cvName ||
                "CV uploaded"
            );


            setText(
                "cvStatus",
                "CV ready to view"
            );


            const viewButton =
                $("#viewCvBtn");


            if (viewButton) {

                viewButton.href =
                    data.cvURL;

                viewButton.classList.remove(
                    "disabled"
                );
            }
        }

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

        showToast(
            "Unable to load profile."
        );
    }
}


// ============================================================
// PROFILE FORM
// ============================================================

function setupProfileForm() {

    const form =
        $("#profileForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const button =
                event.submitter;


            if (button) {
                button.disabled = true;
            }


            try {

                const name =
                    $("#profileName")?.value.trim() ||
                    "";

                const title =
                    $("#profileTitle")?.value.trim() ||
                    "";

                const description =
                    $("#profileDescription")?.value.trim() ||
                    "";

                const specialty1 =
                    $("#specialty1")?.value.trim() ||
                    "";

                const specialty2 =
                    $("#specialty2")?.value.trim() ||
                    "";

                const specialty3 =
                    $("#specialty3")?.value.trim() ||
                    "";


                await setDoc(
                    profileRef(),
                    {
                        name,
                        title,
                        description,
                        specialty1,
                        specialty2,
                        specialty3,
                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );


                if (state.user) {

                    await setDoc(
                        userRef(
                            state.user.uid
                        ),
                        {
                            name,
                            title,
                            updatedAt:
                                serverTimestamp()
                        },
                        {
                            merge: true
                        }
                    );
                }


                updateAdminDisplay(
                    state.user,
                    {
                        ...state.userData,
                        name
                    }
                );


                showToast(
                    "Profile saved successfully."
                );

            } catch (error) {

                console.error(
                    "Profile save error:",
                    error
                );

                showToast(
                    firebaseErrorMessage(error)
                );

            } finally {

                if (button) {
                    button.disabled = false;
                }

            }

        }
    );
}


// ============================================================
// PROFILE PHOTO
// ============================================================

function setupProfilePhoto() {

    const input =
        $("#profilePhotoInput");

    const button =
        $("#uploadProfileBtn");


    if (!input || !button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {
            input.click();
        }
    );


    input.addEventListener(
        "change",
        async () => {

            const file =
                input.files?.[0];


            if (!file) {
                return;
            }


            if (!state.user) {
                showToast(
                    "You are not authenticated."
                );

                return;
            }


            if (!file.type.startsWith("image/")) {

                showToast(
                    "Please select a valid image."
                );

                input.value = "";

                return;
            }


            if (
                file.size >
                5 * 1024 * 1024
            ) {

                showToast(
                    "Profile image must be below 5MB."
                );

                input.value = "";

                return;
            }


            button.disabled = true;


            try {

                const fileExtension =
                    file.name
                        .split(".")
                        .pop()
                        .toLowerCase();


                const storagePath =
                    `profile/${state.user.uid}/profile-${Date.now()}.${fileExtension}`;


                const storageReference =
                    ref(
                        storage,
                        storagePath
                    );


                await uploadBytes(
                    storageReference,
                    file
                );


                const downloadURL =
                    await getDownloadURL(
                        storageReference
                    );


                await setDoc(
                    profileRef(),
                    {
                        photoURL:
                            downloadURL,

                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );


                await setDoc(
                    userRef(
                        state.user.uid
                    ),
                    {
                        photoURL:
                            downloadURL,

                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );


                updateAllProfileImages(
                    downloadURL
                );


                state.userData = {
                    ...state.userData,
                    photoURL: downloadURL
                };


                showToast(
                    "Profile photo updated successfully."
                );

            } catch (error) {

                console.error(
                    "Profile photo upload error:",
                    error
                );

                showToast(
                    firebaseErrorMessage(error)
                );

            } finally {

                button.disabled = false;

                input.value = "";
            }
        }
    );
}


function updateAllProfileImages(url) {

    const imageIds = [
        "dashboardProfileImage",
        "sidebarProfileImage",
        "topbarProfileImage"
    ];


    imageIds.forEach(
        (id) => {

            const image =
                document.getElementById(id);

            if (image) {
                image.src = url;
            }

        }
    );
}


// ============================================================
// CV UPLOAD
// ============================================================

function setupCVUpload() {

    const input =
        $("#cvInput");

    const button =
        $("#uploadCvBtn");


    if (!input || !button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {
            input.click();
        }
    );


    input.addEventListener(
        "change",
        async () => {

            const file =
                input.files?.[0];


            if (!file) {
                return;
            }


            if (!state.user) {
                showToast(
                    "You are not authenticated."
                );

                return;
            }


            const validExtension =
                /\.(pdf|doc|docx)$/i.test(
                    file.name
                );


            if (!validExtension) {

                showToast(
                    "Only PDF, DOC and DOCX files are allowed."
                );

                input.value = "";

                return;
            }


            if (
                file.size >
                10 * 1024 * 1024
            ) {

                showToast(
                    "CV must be below 10MB."
                );

                input.value = "";

                return;
            }


            button.disabled = true;


            try {

                const safeName =
                    file.name.replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );


                const storagePath =
                    `cv/${state.user.uid}/${Date.now()}-${safeName}`;


                const storageReference =
                    ref(
                        storage,
                        storagePath
                    );


                await uploadBytes(
                    storageReference,
                    file
                );


                const downloadURL =
                    await getDownloadURL(
                        storageReference
                    );


                await setDoc(
                    profileRef(),
                    {
                        cvURL:
                            downloadURL,

                        cvName:
                            file.name,

                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );


                setText(
                    "cvFileName",
                    file.name
                );


                setText(
                    "cvStatus",
                    "CV uploaded successfully"
                );


                const viewButton =
                    $("#viewCvBtn");


                if (viewButton) {

                    viewButton.href =
                        downloadURL;

                    viewButton.classList.remove(
                        "disabled"
                    );
                }


                showToast(
                    "CV uploaded successfully."
                );

            } catch (error) {

                console.error(
                    "CV upload error:",
                    error
                );

                showToast(
                    firebaseErrorMessage(error)
                );

            } finally {

                button.disabled = false;

                input.value = "";
            }
        }
    );
}


// ============================================================
// LOAD CONTACT INFORMATION
// ============================================================

async function loadContactInformation() {

    try {

        const snapshot =
            await getDoc(
                contactRef()
            );


        if (!snapshot.exists()) {
            return;
        }


        const data =
            snapshot.data();


        const fields = {
            contactPhone: data.phone,
            contactEmail: data.email,
            contactLocation: data.location,
            contactWhatsApp: data.whatsapp,
            contactLinkedIn: data.linkedin,
            contactGithub: data.github
        };


        Object.entries(fields).forEach(
            ([id, value]) => {

                const field =
                    document.getElementById(id);

                if (field) {
                    field.value =
                        value || "";
                }

            }
        );

    } catch (error) {

        console.error(
            "Contact loading error:",
            error
        );

        showToast(
            "Unable to load contact information."
        );
    }
}


// ============================================================
// CONTACT FORM
// ============================================================

function setupContactForm() {

    const form =
        $("#contactSettingsForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const button =
                event.submitter;


            if (button) {
                button.disabled = true;
            }


            try {

                await setDoc(
                    contactRef(),
                    {
                        phone:
                            $("#contactPhone")?.value.trim() ||
                            "",

                        email:
                            $("#contactEmail")?.value.trim() ||
                            "",

                        location:
                            $("#contactLocation")?.value.trim() ||
                            "",

                        whatsapp:
                            $("#contactWhatsApp")?.value.trim() ||
                            "",

                        linkedin:
                            $("#contactLinkedIn")?.value.trim() ||
                            "",

                        github:
                            $("#contactGithub")?.value.trim() ||
                            "",

                        updatedAt:
                            serverTimestamp()
                    },
                    {
                        merge: true
                    }
                );


                showToast(
                    "Contact information saved."
                );

            } catch (error) {

                console.error(
                    "Contact save error:",
                    error
                );

                showToast(
                    firebaseErrorMessage(error)
                );

            } finally {

                if (button) {
                    button.disabled = false;
                }

            }

        }
    );
}


// ============================================================
// REAL-TIME MESSAGE LISTENER
// ============================================================

function startMessageListener() {

    stopMessageListener();


    const messageQuery =
        query(
            messagesRef(),
            orderBy(
                "createdAt",
                "desc"
            )
        );


    state.unsubscribeMessages =
        onSnapshot(
            messageQuery,

            (snapshot) => {

                state.messages =
                    snapshot.docs.map(
                        (messageDoc) => ({
                            id:
                                messageDoc.id,

                            ...messageDoc.data()
                        })
                    );


                updateMessageStatistics();

                renderMessages();

                renderRecentMessages();
            },

            (error) => {

                console.error(
                    "Message listener error:",
                    error
                );


                if (
                    error.code ===
                    "failed-precondition"
                ) {

                    showToast(
                        "Messages need a Firestore index. Check the browser console."
                    );

                } else {

                    showToast(
                        "Unable to receive messages."
                    );
                }
            }
        );
}


function stopMessageListener() {

    if (
        typeof state.unsubscribeMessages ===
        "function"
    ) {

        state.unsubscribeMessages();

        state.unsubscribeMessages =
            null;
    }
}


// ============================================================
// MESSAGE STATISTICS
// ============================================================

function updateMessageStatistics() {

    const total =
        state.messages.length;


    const unread =
        state.messages.filter(
            (message) =>
                getMessageStatus(message) ===
                "unread"
        ).length;


    const replied =
        state.messages.filter(
            (message) =>
                getMessageStatus(message) ===
                "replied"
        ).length;


    setText(
        "totalMessages",
        total
    );

    setText(
        "unreadMessages",
        unread
    );

    setText(
        "repliedMessages",
        replied
    );


    setText(
        "messageTotalStat",
        total
    );

    setText(
        "messageUnreadStat",
        unread
    );

    setText(
        "messageRepliedStat",
        replied
    );


    setText(
        "navUnreadCount",
        unread
    );


    const notificationBadge =
        $("#notificationBadge");


    if (notificationBadge) {

        notificationBadge.textContent =
            unread;

        notificationBadge.hidden =
            unread === 0;
    }
}


// ============================================================
// MESSAGE SEARCH + FILTER
// ============================================================

function setupMessageControls() {

    $("#messageSearch")?.addEventListener(
        "input",
        renderMessages
    );


    $("#messageFilter")?.addEventListener(
        "change",
        renderMessages
    );


    $("#notificationBtn")?.addEventListener(
        "click",
        () => {

            const messagesLink =
                document.querySelector(
                    '.sidebar-link[data-section="messages"]'
                );

            messagesLink?.click();
        }
    );


    $("#closeMessageModal")?.addEventListener(
        "click",
        closeMessageModal
    );


    $("#messageModal")?.addEventListener(
        "click",
        (event) => {

            if (
                event.target.id ===
                "messageModal"
            ) {
                closeMessageModal();
            }
        }
    );


    $("#markReadBtn")?.addEventListener(
        "click",
        markCurrentMessageRead
    );


    $("#deleteMessageBtn")?.addEventListener(
        "click",
        () => {

            if (
                state.currentMessage?.id
            ) {

                deleteMessage(
                    state.currentMessage.id
                );
            }

        }
    );


    $("#replyMessageBtn")?.addEventListener(
        "click",
        replyToCurrentMessage
    );
}


// ============================================================
// RENDER ALL MESSAGES
// ============================================================

function renderMessages() {

    const container =
        $("#messagesList");


    if (!container) {
        return;
    }


    const search =
        (
            $("#messageSearch")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filter =
        $("#messageFilter")?.value ||
        "all";


    const filteredMessages =
        state.messages.filter(
            (message) => {

                const status =
                    getMessageStatus(message);


                const matchesFilter =
                    filter === "all" ||

                    (
                        filter === "unread" &&
                        status === "unread"
                    ) ||

                    (
                        filter === "read" &&
                        status === "read"
                    ) ||

                    (
                        filter === "replied" &&
                        status === "replied"
                    );


                const searchableText = [
                    message.name,
                    message.email,
                    message.phone,
                    message.topic,
                    message.message
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return (
                    matchesFilter &&
                    (
                        !search ||
                        searchableText.includes(search)
                    )
                );
            }
        );


    if (!filteredMessages.length) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-envelope"></i>
                <h4>No messages</h4>
                <p>
                    No messages match your current search or filter.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        filteredMessages
            .map(
                createMessageHTML
            )
            .join("");


    container
        .querySelectorAll(
            ".view-message-btn"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        openMessageModal(
                            button.dataset.id
                        );

                    }
                );
            }
        );


    container
        .querySelectorAll(
            ".delete-message-btn"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteMessage(
                            button.dataset.id
                        );

                    }
                );
            }
        );
}


// ============================================================
// MESSAGE HTML
// ============================================================

function createMessageHTML(message) {

    const status =
        getMessageStatus(message);


    const name =
        message.name ||
        "Unknown Visitor";


    const email =
        message.email ||
        "";


    const body =
        message.message ||
        "No message content.";


    return `
        <article
            class="message-item ${escapeHTML(status)}"
            data-id="${escapeHTML(message.id)}"
        >

            <div class="message-content">

                <div class="message-top">

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                    <span
                        class="message-status ${escapeHTML(status)}"
                    >
                        ${escapeHTML(status)}
                    </span>

                </div>

                ${
                    email
                        ? `
                            <small>
                                ${escapeHTML(email)}
                            </small>
                        `
                        : ""
                }

                <p>
                    ${escapeHTML(body)}
                </p>

                <time>
                    ${escapeHTML(
                        formatDate(
                            message.createdAt
                        )
                    )}
                </time>

            </div>


            <div class="message-actions">

                <button
                    type="button"
                    class="view-message-btn"
                    data-id="${escapeHTML(message.id)}"
                    title="View message"
                    aria-label="View message"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>


                <button
                    type="button"
                    class="delete-message-btn"
                    data-id="${escapeHTML(message.id)}"
                    title="Delete message"
                    aria-label="Delete message"
                >
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>

        </article>
    `;
}


// ============================================================
// RECENT MESSAGES
// ============================================================

function renderRecentMessages() {

    const container =
        $("#recentMessages");


    if (!container) {
        return;
    }


    const recent =
        state.messages.slice(0, 5);


    if (!recent.length) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-envelope"></i>
                <h4>No messages yet</h4>
                <p>
                    Messages from your contact form
                    will appear here.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        recent
            .map(
                (message) => {

                    const name =
                        message.name ||
                        "Visitor";


                    const preview =
                        message.message ||
                        "No message content.";


                    return `
                        <button
                            class="recent-message"
                            type="button"
                            data-id="${escapeHTML(message.id)}"
                        >

                            <span class="recent-avatar">
                                <i class="fa-solid fa-user"></i>
                            </span>

                            <span class="recent-info">

                                <strong>
                                    ${escapeHTML(name)}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        preview.slice(0, 80)
                                    )}
                                </small>

                            </span>

                            <i class="fa-solid fa-chevron-right"></i>

                        </button>
                    `;
                }
            )
            .join("");


    container
        .querySelectorAll(
            ".recent-message"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        openMessageModal(
                            button.dataset.id
                        );

                    }
                );
            }
        );
}


// ============================================================
// OPEN MESSAGE MODAL
// ============================================================

async function openMessageModal(messageId) {

    const message =
        state.messages.find(
            (item) =>
                item.id === messageId
        );


    if (!message) {
        return;
    }


    state.currentMessage =
        message;


    setText(
        "modalMessageName",
        message.name ||
        "Visitor"
    );


    setText(
        "modalMessageEmail",
        message.email ||
        ""
    );


    setText(
        "modalMessagePhone",
        message.phone ||
        "—"
    );


    setText(
        "modalMessageTopic",
        message.topic ||
        "—"
    );


    setText(
        "modalMessageDate",
        formatDate(
            message.createdAt
        )
    );


    setText(
        "modalMessageBody",
        message.message ||
        "—"
    );


    const reply =
        $("#replyMessage");


    if (reply) {
        reply.value =
            message.reply ||
            "";
    }


    const modal =
        $("#messageModal");


    if (modal) {

        modal.hidden =
            false;

        document.body.classList.add(
            "modal-open"
        );
    }


    // --------------------------------------------------------
    // Automatically mark unread message as read
    // --------------------------------------------------------

    if (
        getMessageStatus(message) ===
        "unread"
    ) {

        try {

            await updateDoc(
                doc(
                    db,
                    "messages",
                    messageId
                ),
                {
                    status: "read",
                    readAt:
                        serverTimestamp()
                }
            );

        } catch (error) {

            console.error(
                "Unable to mark message as read:",
                error
            );
        }
    }
}


// ============================================================
// CLOSE MESSAGE MODAL
// ============================================================

function closeMessageModal() {

    const modal =
        $("#messageModal");


    if (modal) {

        modal.hidden =
            true;
    }


    document.body.classList.remove(
        "modal-open"
    );


    state.currentMessage =
        null;
}


// ============================================================
// MARK CURRENT MESSAGE READ
// ============================================================

async function markCurrentMessageRead() {

    const message =
        state.currentMessage;


    if (!message) {
        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "messages",
                message.id
            ),
            {
                status: "read",
                readAt:
                    serverTimestamp()
            }
        );


        showToast(
            "Message marked as read."
        );

    } catch (error) {

        console.error(
            "Mark read error:",
            error
        );

        showToast(
            firebaseErrorMessage(error)
        );
    }
}


// ============================================================
// DELETE MESSAGE
// ============================================================

async function deleteMessage(messageId) {

    if (!messageId) {
        return;
    }


    const message =
        state.messages.find(
            (item) =>
                item.id === messageId
        );


    if (!message) {
        return;
    }


    const visitorName =
        message.name ||
        "this visitor";


    const confirmed =
        window.confirm(
            `Delete the message from ${visitorName}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "messages",
                messageId
            )
        );


        if (
            state.currentMessage?.id ===
            messageId
        ) {
            closeMessageModal();
        }


        showToast(
            "Message deleted successfully."
        );

    } catch (error) {

        console.error(
            "Delete message error:",
            error
        );

        showToast(
            firebaseErrorMessage(error)
        );
    }
}


// ============================================================
// REPLY TO MESSAGE
// ============================================================

async function replyToCurrentMessage() {

    const message =
        state.currentMessage;


    if (!message) {
        return;
    }


    const email =
        message.email;


    if (!email) {

        showToast(
            "This message does not contain an email address."
        );

        return;
    }


    const reply =
        $("#replyMessage")?.value.trim() ||
        "";


    if (!reply) {

        showToast(
            "Write a reply before sending."
        );

        return;
    }


    try {

        await updateDoc(
            doc(
                db,
                "messages",
                message.id
            ),
            {
                status: "replied",
                replied: true,
                reply,
                repliedAt:
                    serverTimestamp()
            }
        );


        const subject =
            encodeURIComponent(
                `Re: ${message.topic || "Your message"}`
            );


        const body =
            encodeURIComponent(
                reply
            );


        window.location.href =
            `mailto:${email}?subject=${subject}&body=${body}`;


        showToast(
            "Message marked as replied."
        );

    } catch (error) {

        console.error(
            "Reply error:",
            error
        );

        showToast(
            firebaseErrorMessage(error)
        );
    }
}


// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

function setupKeyboardControls() {

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                closeMessageModal();

                closeMobileSidebar();
            }

        }
    );
}


// ============================================================
// INITIALIZE DASHBOARD
// ============================================================

async function initializeDashboard() {

    if (state.initialized) {
        return;
    }


    state.initialized = true;


    setupNavigation();

    setupMobileMenu();

    setupTheme();

    setupLogout();

    setupProfileForm();

    setupContactForm();

    setupProfilePhoto();

    setupCVUpload();

    setupMessageControls();

    setupKeyboardControls();


    await Promise.allSettled([
        loadProfile(),
        loadContactInformation()
    ]);


    startMessageListener();
}


// ============================================================
// CLEANUP
// ============================================================

window.addEventListener(
    "beforeunload",
    () => {
        stopMessageListener();
    }
);


// ============================================================
// START APPLICATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            !document.body.classList.contains(
                "dashboard-page"
            )
        ) {
            return;
        }


        startAuthentication();
    }
);
