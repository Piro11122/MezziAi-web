
// ===================================
// MezziAI - Official Website
// Main JavaScript
// ===================================

document.addEventListener("DOMContentLoaded", function () {

    // MOBILE MENU
    const menuBtn = document.querySelector(".menu-btn");
    const navLinks = document.getElementById("navLinks");

    function toggleMenu() {
        navLinks.classList.toggle("active");

        const isOpen = navLinks.classList.contains("active");

        menuBtn.textContent = isOpen ? "✕" : "☰";
        menuBtn.setAttribute("aria-expanded", isOpen);
    }

    function closeMenu() {
        navLinks.classList.remove("active");
        menuBtn.textContent = "☰";
        menuBtn.setAttribute("aria-expanded", "false");
    }

    if (menuBtn && navLinks) {

        menuBtn.addEventListener("click", toggleMenu);

        // Close menu after clicking a link
        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", closeMenu);
        });

        // Close menu when clicking outside
        document.addEventListener("click", function (event) {
            if (
                navLinks.classList.contains("active") &&
                !navLinks.contains(event.target) &&
                !menuBtn.contains(event.target)
            ) {
                closeMenu();
            }
        });

        // Close menu with Escape key
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closeMenu();
            }
        });

    }

    // SMOOTH SCROLL
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (targetId === "#") return;

            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        });

    });

    // FOOTER YEAR
    const yearElement = document.querySelector(".copyright-year");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // DOWNLOAD BUTTON
    const downloadButton = document.querySelector(".download .btn");

    if (downloadButton) {

        downloadButton.addEventListener("click", function () {

            console.log("MezziAI APK download requested.");

        });

    }

    console.log("MezziAI Website Loaded Successfully.");

});
