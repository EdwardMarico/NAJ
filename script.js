// ==========================================
// FORCE PAGE TO START FROM TOP ON LOAD
// ==========================================
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // INITIALIZE SETTINGS FROM LOCALSTORAGE
    // ==========================================
    const savedTheme = localStorage.getItem("app_theme") || "light";
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }

    const isAnimationEnabled = localStorage.getItem("setting_enableAnimation") !== "false";
    if (!isAnimationEnabled) {
        document.body.classList.add("no-animations");
    }
    
    // ---------- LOGO HOVER EFFECT ----------
    const logoSpan = document.getElementById("logoText");
    if (logoSpan) {
        logoSpan.addEventListener("mouseenter", () => logoSpan.textContent = "NuerAnnJim");
        logoSpan.addEventListener("mouseleave", () => logoSpan.textContent = "NAJ");
    }

    // ---------- TOPBAR HAMBURGER MENU ----------
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const menuCard = document.querySelector(".menu-card");
    const dropdownToggleBtn = document.getElementById("dropdownToggleBtn");
    const friendsSubmenu = document.getElementById("friendsSubmenu");
    const dropdownContainer = document.querySelector(".dropdown-container");

    if (hamburgerMenu && menuCard) {
        const closeSubmenu = () => {
            if (friendsSubmenu) {
                friendsSubmenu.classList.remove("show");
            }
        };

        const closeMenu = () => {
            hamburgerMenu.classList.remove("active");
            menuCard.classList.remove("visible");
            hamburgerMenu.setAttribute("aria-expanded", "false");
            closeSubmenu();
        };

        const openMenu = () => {
            hamburgerMenu.classList.add("active");
            menuCard.classList.add("visible");
            hamburgerMenu.setAttribute("aria-expanded", "true");
            syncMenuOverflow();
        };

        const syncMenuOverflow = () => {
            const maxAllowedWidth = Math.min(window.innerWidth * 0.4, window.innerWidth - 120);
            const shouldScroll = menuCard.scrollWidth > maxAllowedWidth;

            menuCard.style.maxWidth = `${maxAllowedWidth}px`;
            menuCard.style.overflowX = shouldScroll ? "auto" : "visible";
            menuCard.style.overflowY = "visible";
        };

        hamburgerMenu.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (menuCard.classList.contains("visible")) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        menuCard.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        window.addEventListener("resize", syncMenuOverflow);
        syncMenuOverflow();

        document.addEventListener("click", (e) => {
            const clickedInsideMenu = menuCard.contains(e.target);
            const clickedInsideDropdown = dropdownContainer && dropdownContainer.contains(e.target);
            const clickedHamburger = hamburgerMenu.contains(e.target);

            if (!clickedInsideMenu && !clickedHamburger) {
                closeMenu();
                return;
            }

            if (clickedInsideMenu && !clickedInsideDropdown && e.target !== dropdownToggleBtn) {
                closeSubmenu();
            }
        });

        let targetScrollLeft = 0;
        let isScrolling = false;

        function updateScroll() {
            const distance = targetScrollLeft - menuCard.scrollLeft;
            if (Math.abs(distance) > 0.5) {
                menuCard.scrollLeft += distance * 0.15;
                requestAnimationFrame(updateScroll);
            } else {
                menuCard.scrollLeft = targetScrollLeft;
                isScrolling = false;
            }
        }

        menuCard.addEventListener("wheel", (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                if (!isScrolling) {
                    targetScrollLeft = menuCard.scrollLeft;
                }
                const scrollSpeed = 0.5;
                const maxScroll = menuCard.scrollWidth - menuCard.clientWidth;
                targetScrollLeft = Math.max(0, Math.min(maxScroll, targetScrollLeft + (e.deltaY * scrollSpeed)));

                if (!isScrolling) {
                    isScrolling = true;
                    requestAnimationFrame(updateScroll);
                }
            }
        }, { passive: false });
    }

    // ==========================================
    // DROPDOWN SUBMENU
    // ==========================================
    if (dropdownToggleBtn && friendsSubmenu) {
        document.body.appendChild(friendsSubmenu);
        let isAutoScrolling = false;

        const updateSubmenuPosition = () => {
            const rect = dropdownToggleBtn.getBoundingClientRect();
            const topbar = document.querySelector(".topbar");
            const topbarHeight = topbar ? topbar.offsetHeight : 0;
            
            friendsSubmenu.style.position = "fixed";
            friendsSubmenu.style.top = `${topbarHeight + 5}px`;
            friendsSubmenu.style.left = `${rect.left}px`;
            friendsSubmenu.style.width = `${rect.width}px`; 
            friendsSubmenu.style.zIndex = "9999";
        };

        dropdownToggleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const willOpen = !friendsSubmenu.classList.contains("show");
            
            if (willOpen) {
                const isAtTop = window.scrollY === 0 || document.documentElement.scrollTop === 0;
                
                // เช็กค่า Auto Scroll จาก localStorage
                const isAutoScrollEnabled = localStorage.getItem("setting_autoScrollTop") !== "false";

                if (isAtTop || !isAutoScrollEnabled) {
                    updateSubmenuPosition();
                    friendsSubmenu.classList.add("show");
                } else {
                    isAutoScrolling = true;
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                    updateSubmenuPosition();
                    const animationDuration = 350;

                    setTimeout(() => {
                        friendsSubmenu.classList.add("show");
                        setTimeout(() => {
                            isAutoScrolling = false;
                        }, 100);
                    }, animationDuration);
                }
            } else {
                friendsSubmenu.classList.remove("show");
            }
        });

        if (menuCard) {
            menuCard.addEventListener("scroll", () => {
                if (friendsSubmenu.classList.contains("show")) {
                    updateSubmenuPosition();
                }
            });
        }

        let isClosingDropdown = false;
        const closeDropdownWithDelay = (e, target) => {
            const isInsideSubmenu = friendsSubmenu && friendsSubmenu.contains(target);

            if (friendsSubmenu.classList.contains("show") && !isInsideSubmenu) {
                if (e.cancelable) e.preventDefault();

                if (!isClosingDropdown) {
                    isClosingDropdown = true;
                    friendsSubmenu.classList.remove("show");
                    const animationDuration = 350;

                    setTimeout(() => {
                        isClosingDropdown = false;
                    }, animationDuration);
                }
            } else if (isClosingDropdown) {
                if (!isInsideSubmenu && e.cancelable) {
                    e.preventDefault();
                }
            }
        };

        window.addEventListener("wheel", (e) => closeDropdownWithDelay(e, e.target), { passive: false });
        window.addEventListener("touchmove", (e) => closeDropdownWithDelay(e, e.target), { passive: false });

        window.addEventListener("resize", () => {
            if (friendsSubmenu.classList.contains("show")) {
                updateSubmenuPosition();
            }
        });

        friendsSubmenu.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        if (menuCard) {
            menuCard.querySelectorAll("button").forEach((button) => {
                if (button !== dropdownToggleBtn) {
                    button.addEventListener("click", () => {
                        friendsSubmenu.classList.remove("show");
                    });
                }
            });
        }
    }

    // ---------- GET TOKEN MODALS ----------
    const openGetTokenBtn = document.getElementById("openGetTokenBtn");
    const getTokenModal = document.getElementById("getTokenModal");
    const showTokenModal = document.getElementById("showTokenModal");
    const closeGetTokenModal = document.getElementById("closeGetTokenModal");
    const closeShowTokenModal = document.getElementById("closeShowTokenModal");
    const getTokenForm = document.getElementById("getTokenForm");
    const doneTokenBtn = document.getElementById("doneTokenBtn");

    if (openGetTokenBtn) {
        openGetTokenBtn.addEventListener("click", () => {
            document.getElementById("tokenPassword").value = "";
            openModal(getTokenModal);
        });
    }

    if (closeGetTokenModal) {
        closeGetTokenModal.addEventListener("click", () => closeModal(getTokenModal));
    }
    if (closeShowTokenModal) {
        closeShowTokenModal.addEventListener("click", () => closeModal(showTokenModal));
    }

    if (doneTokenBtn) {
        doneTokenBtn.addEventListener("click", () => closeModal(showTokenModal));
    }

    if (getTokenForm) {
        getTokenForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const inputPassword = document.getElementById("tokenPassword").value.trim();
            
            // รายการรหัสผ่านที่อนุญาต
            const ALLOWED_PASSWORDS = ["NuerAnnJim", "NAJ", "naj"];

            if (ALLOWED_PASSWORDS.includes(inputPassword)) {
                closeModal(getTokenModal);
                openModal(showTokenModal);
            } else {
                alert("รหัสผ่านไม่ถูกต้อง!");
            }
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === getTokenModal) closeModal(getTokenModal);
        if (e.target === showTokenModal) closeModal(showTokenModal);
    });
});

// ==========================================
// ANIMATION FOR PAGE TRANSITIONS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => {
        document.body.classList.add("fade-in");
    });
});

function navigateTo(url) {
    // เช็ก Animation ก่อนทำ Transition
    if (document.body.classList.contains("no-animations")) {
        window.location.href = url;
        return;
    }
    
    document.body.classList.remove("fade-in");
    document.body.classList.add("fade-out");
    setTimeout(() => {
        window.location.href = url;
    }, 400);
}

document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.hostname === window.location.hostname && link.target !== "_blank") {
        if (link.getAttribute("href") && !link.getAttribute("href").startsWith("#")) {
            e.preventDefault();
            navigateTo(link.href);
            return;
        }
    }

    const menuBtn = e.target.closest(".menu-card button[data-href]");
    if (menuBtn) {
        e.preventDefault();
        navigateTo(menuBtn.dataset.href);
    }
});

// ==========================================
// GLOBAL MODAL FUNCTIONS
// ==========================================
function openModal(modalElement) {
    if (!modalElement) return;

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.style.overflow = "hidden";

    modalElement.classList.remove("closing");
    modalElement.style.display = "flex";
    requestAnimationFrame(() => {
        modalElement.classList.add("show");
    });
}

function closeModal(modalElement) {
    if (!modalElement || !modalElement.classList.contains("show")) return;

    document.body.style.overflow = "";
    modalElement.classList.remove("show");
    modalElement.classList.add("closing");
    
    setTimeout(() => {
        modalElement.style.display = "none";
        modalElement.classList.remove("closing");
    }, 250);
}

function showPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = "text";
        btn.textContent = "Ø";
    }
}

function hidePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = "password";
        btn.textContent = "O";
    }
}

// ==========================================
// PRESS & HOLD PASSWORD VISIBILITY
// ==========================================
function showPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = "text";
        btn.textContent = "Ø";
    }
}

function hidePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = "password";
        btn.textContent = "O";
    }
}