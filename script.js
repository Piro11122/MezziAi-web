
// ===================================
// MezziAI - Official Website
// Main JavaScript
// ===================================

document.addEventListener("DOMContentLoaded", function () {

    // MOBILE MENU
    const menuBtn = document.querySelector(".menu-btn");
    const navLinks = document.getElementById("navLinks");

    function toggleMenu() {
        if (!menuBtn || !navLinks) return;

        navLinks.classList.toggle("active");

        const isOpen = navLinks.classList.contains("active");

        menuBtn.textContent = isOpen ? "✕" : "☰";
        menuBtn.setAttribute("aria-expanded", isOpen);
    }

    function closeMenu() {
        if (!menuBtn || !navLinks) return;

        navLinks.classList.remove("active");
        menuBtn.textContent = "☰";
        menuBtn.setAttribute("aria-expanded", "false");
    }

    if (menuBtn && navLinks) {

        menuBtn.addEventListener("click", toggleMenu);

        navLinks.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("click", function (event) {
            if (
                navLinks.classList.contains("active") &&
                !navLinks.contains(event.target) &&
                !menuBtn.contains(event.target)
            ) {
                closeMenu();
            }
        });

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

            if (!targetId || targetId === "#") return;

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
    // Download is handled directly by the HTML link.
    // No JavaScript interception is needed.

    console.log("MezziAI Website Loaded Successfully.");

});
