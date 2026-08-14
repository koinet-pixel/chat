/* =========================================================
   AOS INITIALIZATION
========================================================= */

if (typeof AOS !== "undefined") {
    AOS.init({
        duration: 700,
        once: true,
        easing: "ease-out-cubic"
    });
}


/* =========================================================
   MOBILE MENU
========================================================= */

const menuBtn = document.getElementById("menuBtn");
const mobilePanel = document.getElementById("mobilePanel");

function setMobileOpen(open) {

    if (!mobilePanel) return;

    mobilePanel.dataset.open = open ? "true" : "false";

    if (menuBtn) {
        menuBtn.setAttribute(
            "aria-label",
            open ? "Close menu" : "Open menu"
        );

        const icon = menuBtn.querySelector("i");

        if (icon) {
            icon.classList.toggle("fa-bars", !open);
            icon.classList.toggle("fa-xmark", open);
        }
    }
}

if (menuBtn && mobilePanel) {

    menuBtn.addEventListener("click", (e) => {

        e.stopPropagation();

        const isOpen =
            mobilePanel.dataset.open === "true";

        setMobileOpen(!isOpen);
    });
}


/* Close mobile menu when navigation link is clicked */

document
    .querySelectorAll("[data-close-mobile]")
    .forEach(el => {

        el.addEventListener("click", () => {
            setMobileOpen(false);
        });

    });


/* Close mobile menu when clicking outside */

document.addEventListener("click", (e) => {

    if (!mobilePanel) return;

    const isOpen =
        mobilePanel.dataset.open === "true";

    if (!isOpen) return;

    const panel =
        mobilePanel.querySelector(".panel");

    const clickedInside =
        panel && panel.contains(e.target);

    const clickedBtn =
        menuBtn && menuBtn.contains(e.target);

    if (!clickedInside && !clickedBtn) {
        setMobileOpen(false);
    }
});


/* =========================================================
   TYPING EFFECT
========================================================= */

const typeText =
    document.getElementById("typeText");

if (typeText) {

    const words = [
        "Computer Maintenance",
        "Troubleshooting",
        "Networking",
        "Software Installation",
        "Printer Installation",
        "User Training",
        "School Management Setup"
    ];

    let w = 0;
    let charIndex = 0;
    let forward = true;

    function step() {

        if (!typeText) return;

        const cursor =
            typeText.querySelector(".cursor");

        const current = words[w];

        if (forward) {

            charIndex++;

            typeText.innerHTML =
                current.slice(0, charIndex) +
                (
                    cursor
                        ? cursor.outerHTML
                        : '<span class="cursor" aria-hidden="true"></span>'
                );

            if (charIndex >= current.length) {

                forward = false;

                setTimeout(step, 650);

                return;
            }

        } else {

            charIndex--;

            if (charIndex <= 0) {

                forward = true;

                w = (w + 1) % words.length;

                typeText.innerHTML =
                    '<span class="cursor" aria-hidden="true"></span>';

                setTimeout(step, 200);

                return;
            }

            typeText.innerHTML =
                current.slice(0, charIndex) +
                (
                    cursor
                        ? cursor.outerHTML
                        : '<span class="cursor" aria-hidden="true"></span>'
                );
        }

        setTimeout(
            step,
            forward ? 70 : 45
        );
    }


    /* Initial cursor */

    if (!typeText.querySelector(".cursor")) {

        typeText.innerHTML =
            "Software Installation" +
            '<span class="cursor" aria-hidden="true"></span>';
    }

    setTimeout(step, 400);
}


/* =========================================================
   ANIMATED SKILL BARS
========================================================= */

const skillEls =
    Array.from(
        document.querySelectorAll("[data-skill]")
    );

if (skillEls.length > 0 && "IntersectionObserver" in window) {

    const io =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        const el = entry.target;

                        const pct =
                            el.getAttribute("data-skill");

                        const fill =
                            el.querySelector(".bar-fill");

                        if (fill) {
                            fill.style.width =
                                pct + "%";
                        }

                        io.unobserve(el);
                    }

                });

            },
            {
                threshold: 0.3
            }
        );

    skillEls.forEach(el => {
        io.observe(el);
    });
}


/* =========================================================
   DARK / LIGHT THEME
========================================================= */

const themeToggle =
    document.getElementById("themeToggle");

const body =
    document.body;


function updateThemeIcon(theme) {

    if (!themeToggle) return;

    const icon =
        themeToggle.querySelector("i");

    if (!icon) return;

    if (theme === "light") {

        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");

    } else {

        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
    }
}


function setTheme(theme) {

    if (!body) return;

    if (theme === "light") {

        body.setAttribute(
            "data-theme",
            "light"
        );

    } else {

        body.setAttribute(
            "data-theme",
            "dark"
        );
    }

    updateThemeIcon(theme);

    localStorage.setItem(
        "portfolio-theme",
        theme
    );
}


/* Load saved theme */

const savedTheme =
    localStorage.getItem("portfolio-theme");

if (savedTheme === "light") {

    setTheme("light");

} else {

    setTheme("dark");
}


/* Theme button */

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        () => {

            const currentTheme =
                body.getAttribute("data-theme");

            const newTheme =
                currentTheme === "light"
                    ? "dark"
                    : "light";

            setTheme(newTheme);
        }
    );
}


/* =========================================================
   BACK TO TOP
========================================================= */

const toTop =
    document.getElementById("toTop");


if (toTop) {

    const onScroll = () => {

        const show =
            window.scrollY > 700;

        toTop.dataset.show =
            show ? "true" : "false";
    };


    window.addEventListener(
        "scroll",
        onScroll,
        {
            passive: true
        }
    );


    onScroll();


    toTop.addEventListener(
        "click",
        () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    toTop.addEventListener(
        "keydown",
        (e) => {

            if (
                e.key === "Enter" ||
                e.key === " "
            ) {

                e.preventDefault();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }

        }
    );
}


/* =========================================================
   CONTACT FORM
========================================================= */

const form =
    document.getElementById("contactForm");

const toast =
    document.getElementById("toast");

const toastText =
    document.getElementById("toastText");


function showToast(msg) {

    if (!toast || !toastText) return;

    toastText.textContent = msg;

    toast.dataset.show = "true";

    clearTimeout(showToast._t);

    showToast._t =
        setTimeout(() => {

            toast.dataset.show = "false";

        }, 3200);
}


if (form) {

    form.addEventListener(
        "submit",
        (e) => {

            e.preventDefault();

            const data =
                Object.fromEntries(
                    new FormData(form).entries()
                );

            if (
                !data.name ||
                !data.phone ||
                !data.email ||
                !data.topic ||
                !data.message
            ) {

                showToast(
                    "Please fill in all required fields."
                );

                return;
            }


            showToast(
                "Thanks! Your message is ready to be sent. (Demo)"
            );

            form.reset();
        }
    );
}


/* =========================================================
   PROFILE PHOTO
========================================================= */

const uploadPhoto =
    document.getElementById("uploadPhoto");

const profileImage =
    document.getElementById("profileImage");

const removePhoto =
    document.getElementById("removePhoto");


/* Load saved image */

if (profileImage) {

    const savedImage =
        localStorage.getItem("profilePhoto");

    if (savedImage) {
        profileImage.src = savedImage;
    }
}


/* Upload image */

if (uploadPhoto && profileImage) {

    uploadPhoto.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            if (!file) return;


            /* Basic image validation */

            if (!file.type.startsWith("image/")) {

                showToast(
                    "Please select a valid image."
                );

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                function (e) {

                    profileImage.src =
                        e.target.result;

                    localStorage.setItem(
                        "profilePhoto",
                        e.target.result
                    );

                    showToast(
                        "Profile photo updated."
                    );
                };


            reader.readAsDataURL(file);
        }
    );
}


/* Remove photo */

if (removePhoto && profileImage) {

    removePhoto.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "profilePhoto"
            );

            profileImage.src =
                "images/default-avatar.png";

            showToast(
                "Profile photo removed."
            );
        }
    );
}