// ==========================================
// 1. ตั้งค่าข้อมูล GITHUB ของคุณตรงนี้
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "games.json"; 
const GITHUB_TOKEN = ""; 

let currentGamesData = [];
let originalGameObj = null; // เก็บค่าเดิมไว้เปรียบเทียบ

document.addEventListener("DOMContentLoaded", () => {
    
    // ---------- 2. LOGO HOVER EFFECT ----------
    const logoSpan = document.getElementById("logoText");
    if (logoSpan) {
        logoSpan.addEventListener("mouseenter", () => logoSpan.textContent = "NuerAnnJim");
        logoSpan.addEventListener("mouseleave", () => logoSpan.textContent = "NAJ");
    }

    // ---------- 3. TOPBAR HAMBURGER MENU ----------
    const hamburgerMenu = document.getElementById("hamburgerMenu");
    const menuCard = document.querySelector(".menu-card");

    if (hamburgerMenu && menuCard) {
        hamburgerMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            hamburgerMenu.classList.toggle("active");
            menuCard.classList.toggle("visible");
        });

        document.addEventListener("click", (e) => {
            if (!menuCard.contains(e.target) && !hamburgerMenu.contains(e.target)) {
                hamburgerMenu.classList.remove("active");
                menuCard.classList.remove("visible");
            }
        });

        menuCard.addEventListener("wheel", (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                menuCard.scrollLeft += e.deltaY * 0.2;
            }
        }, { passive: false });
    }

    // ---------- 4. LOAD DATA & INITIALIZE ----------
    loadGames();

    // ---------- 5. MODAL & FORM EVENTS ----------
    const modal = document.getElementById("gameModal");
    const openModalBtn = document.getElementById("addGameBtn") || document.getElementById("openModalBtn");
    const closeModalBtn = document.querySelector(".close-btn");
    const gameForm = document.getElementById("gameForm");
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");

    // เปิด Pop-up Add Game
    if (openModalBtn) {
        openModalBtn.addEventListener("click", () => {
            if (modalTitle) modalTitle.textContent = "Add New Game";
            
            // เคลียร์ค่าเฉพาะช่องข้อความ (เว้นช่อง Token ไว้ให้เบราว์เซอร์จำค่าเดิมได้)
            const gameIdInput = document.getElementById("gameId");
            const titleInput = document.getElementById("gameTitle");
            const urlInput = document.getElementById("gameUrl");
            
            if (gameIdInput) gameIdInput.value = "";
            if (titleInput) titleInput.value = "";
            if (urlInput) urlInput.value = "";
            
            originalGameObj = null;
            if (modal) modal.style.display = "flex";
        });
    }

    // ปิด Pop-up เมื่อกดปุ่ม × หรือคลิกพื้นหลัง
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (modal) modal.style.display = "none";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
        const deleteModal = document.getElementById("deleteModal");
        if (e.target === deleteModal) deleteModal.style.display = "none";
    });

    // Submit Form (Add & Edit)
    if (gameForm) {
        gameForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("gameId").value;
            const tokenInput = document.getElementById("githubToken");
            const token = tokenInput ? tokenInput.value.trim() : "";
            const title = document.getElementById("gameTitle").value.trim();
            const actionUrl = document.getElementById("gameUrl").value.trim();

            if (!token) {
                alert("กรุณากรอก GitHub Token");
                return;
            }

            if (id && typeof originalGameObj !== "undefined" && originalGameObj) {
                if (originalGameObj.title === title && originalGameObj.actionUrl === actionUrl) {
                    alert("ไม่มีการเปลี่ยนแปลงข้อมูล");
                    if (modal) modal.style.display = "none";
                    return;
                }
            }

            if (submitBtn) {
                submitBtn.textContent = "Saving...";
                submitBtn.disabled = true;
            }

            try {
                if (id) {
                    const index = currentGamesData.findIndex(g => g.id == id);
                    if (index !== -1) {
                        currentGamesData[index].title = title;
                        currentGamesData[index].actionUrl = actionUrl;
                        currentGamesData[index].updatedAt = new Date().toLocaleString('th-TH');
                    }
                } else {
                    const newGame = {
                        id: Date.now(),
                        title: title,
                        actionText: "Install",
                        actionUrl: actionUrl,
                        createdAt: new Date().toLocaleString('th-TH')
                    };
                    currentGamesData.push(newGame);
                }

                const commitMsg = id ? `Edit game: ${title}` : `Add game: ${title}`;
                await updateGitHubJSON(currentGamesData, commitMsg, token);

                if (modal) modal.style.display = "none";
                
                // เคลียร์เฉพาะช่องข้อมูลเกม (ไม่รีเซ็ตช่อง Token เพื่อให้ปุ่มดวงตา/การจำรหัสยังอยู่)
                document.getElementById("gameTitle").value = "";
                document.getElementById("gameUrl").value = "";
                document.getElementById("gameId").value = "";

            } catch (error) {
                console.error(error);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาเช็ก Token อีกครั้ง");
            } finally {
                if (submitBtn) {
                    submitBtn.textContent = "Save Game";
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // ---------- 6. REAL-TIME SEARCH ----------
    const searchInput = document.getElementById("searchInput");
    let typingTimer;
    const doneTypingInterval = 500;

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(typingTimer);
            const keyword = e.target.value.toLowerCase().trim();

            if (keyword === "") {
                renderGames(currentGamesData);
                return;
            }

            typingTimer = setTimeout(() => {
                const filteredGames = currentGamesData.filter(game =>
                    game.title.toLowerCase().includes(keyword)
                );
                renderGames(filteredGames);
            }, doneTypingInterval);
        });
    }

    // ---------- 7. DELETE GAME FORM EVENTS ----------
    const deleteModal = document.getElementById("deleteModal");
    const closeDeleteModal = document.getElementById("closeDeleteModal");
    const deleteForm = document.getElementById("deleteForm");

    if (closeDeleteModal) {
        closeDeleteModal.onclick = () => {
            if (deleteModal) deleteModal.style.display = "none";
        };
    }

    if (deleteForm) {
        deleteForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("deleteGameId").value;
            const token = document.getElementById("deleteGithubToken").value.trim();
            const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

            if (!token) {
                alert("กรุณากรอก GitHub Token");
                return;
            }

            if (confirmDeleteBtn) {
                confirmDeleteBtn.textContent = "Deleting...";
                confirmDeleteBtn.disabled = true;
            }

            try {
                await deleteGame(id, token);
                if (deleteModal) deleteModal.style.display = "none";
            } catch (err) {
                console.error(err);
            } finally {
                if (confirmDeleteBtn) {
                    confirmDeleteBtn.textContent = "Delete Game";
                    confirmDeleteBtn.disabled = false;
                }
            }
        });
    }
});

// ==========================================
// FUNCTIONS (LOAD, RENDER, MODAL & GITHUB API)
// ==========================================

// ดึงข้อมูลเกมมาแสดง
async function loadGames() {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    try {
        const headers = {};
        if (GITHUB_TOKEN) {
            headers["Authorization"] = `token ${GITHUB_TOKEN}`;
        }

        const res = await fetch(url, { headers });

        if (res.ok) {
            const fileData = await res.json();
            const jsonText = decodeURIComponent(escape(atob(fileData.content)));
            currentGamesData = JSON.parse(jsonText);
            renderGames(currentGamesData);
            return;
        }
    } catch (err) {
        console.warn("ไม่สามารถโหลดผ่าน GitHub API ได้ จะลองโหลดไฟล์ภายในเครื่อง...", err);
    }

    try {
        const localRes = await fetch(GITHUB_FILE_PATH);
        if (localRes.ok) {
            currentGamesData = await localRes.json();
            renderGames(currentGamesData);
        } else {
            console.error("หาไฟล์ games.json ไม่พบ");
        }
    } catch (err) {
        console.error("Error loading games.json:", err);
    }
}

// แสดงผลรายการเกมใน UI
function renderGames(games) {
    const container = document.getElementById("gameList");
    if (!container) return;
    container.innerHTML = "";

    if (games.length === 0) {
        container.innerHTML = `<div class="no-results">ไม่พบเกมที่ตรงกับการค้นหา</div>`;
        return;
    }

    games.forEach((game, index) => {
        const item = document.createElement("div");
        item.className = "game-item animate-in";
        item.style.animationDelay = `${index * 0.05}s`;

        item.innerHTML = `
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <a href="${game.actionUrl}" class="game-action-btn" target="_blank">&#10515; ${game.actionText || 'Install'}</a>
            </div>
            <div style="color: #666; font-size: 11px; margin-right: 15px;">${game.updatedAt || game.createdAt || ''}</div>
            <button class="game-more-btn" onclick="toggleMenu(event, ${game.id})">&#8226;&#8226;&#8226;</button>
            <div class="action-menu" id="menu-${game.id}">
                <button onclick="openEditModal(${game.id})">Edit Game Info</button>
                <button onclick="openDeleteModal(${game.id})" style="color: #ef4444;">Delete Game</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// เปิด Pop-up แก้ไขข้อมูลเกม
function openEditModal(id) {
    const game = currentGamesData.find(g => g.id == id);
    if (!game) return;

    originalGameObj = { ...game };

    const modal = document.getElementById("gameModal");
    const modalTitle = document.getElementById("modalTitle");
    const gameIdInput = document.getElementById("gameId");
    const titleInput = document.getElementById("gameTitle");
    const urlInput = document.getElementById("gameUrl");

    if (modalTitle) modalTitle.textContent = "Edit Game Info";
    if (gameIdInput) gameIdInput.value = game.id;
    if (titleInput) titleInput.value = game.title;
    if (urlInput) urlInput.value = game.actionUrl;

    if (modal) modal.style.display = "flex";
}

// เปิด/ปิด เมนูปุ่มสามจุด
function toggleMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('active'));
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.toggle('active');
}

// คลิกข้างนอกเพื่อปิดเมนูสามจุด
document.addEventListener('click', () => {
    document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('active'));
});

// ฟังก์ชันเปิด Pop-up ลบเกม
function openDeleteModal(id) {
    const deleteModal = document.getElementById("deleteModal");
    const deleteGameIdInput = document.getElementById("deleteGameId");
    const deleteTokenInput = document.getElementById("deleteGithubToken");

    if (deleteModal && deleteGameIdInput) {
        deleteGameIdInput.value = id;
        deleteModal.style.display = "flex";
        
        // โฟกัสไปที่ช่องใส่ Token ทันทีเพื่อให้ปุ่มดวงตาของเบราว์เซอร์ปรากฏขึ้น
        if (deleteTokenInput) {
            deleteTokenInput.focus();
        }
    }
}

// ฟังก์ชันลบเกม
async function deleteGame(id, token) {
    const game = currentGamesData.find(g => g.id == id);
    if (!game) return;

    currentGamesData = currentGamesData.filter(g => g.id != id);
    await updateGitHubJSON(currentGamesData, `Delete game: ${game.title}`, token);
}

// อัปเดตไฟล์กลับไปที่ GitHub API
async function updateGitHubJSON(updatedData, commitMessage, token) {
    const authToken = token || GITHUB_TOKEN;

    if (!authToken) {
        alert("กรุณากรอก GitHub Token ก่อนทำรายการ");
        throw new Error("Missing GitHub Token");
    }

    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    try {
        const getRes = await fetch(url, {
            headers: { "Authorization": `token ${authToken}` }
        });

        if (!getRes.ok) {
            const errData = await getRes.json();
            console.error("GitHub Fetch Error:", errData);
            throw new Error("ไม่สามารถอ่านข้อมูลจาก GitHub ได้ เช็ก Token หรือ Repo อีกครั้ง");
        }

        const fileData = await getRes.json();
        const updatedContentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));

        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: commitMessage,
                content: updatedContentBase64,
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
            location.reload();
        } else {
            const errorData = await putRes.json();
            alert(`เกิดข้อผิดพลาด: ${errorData.message || 'อัปเดตไฟล์ไม่สำเร็จ'}`);
        }
    } catch (err) {
        console.error("Error updating GitHub:", err);
        throw err;
    }
}

// ==========================================
// ANIMATION FOR PAGE TRANSITIONS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => {
        document.body.classList.add("fade-in");
    });
});

function navigateTo(url) {
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
// PRESS & HOLD PASSWORD VISIBILITY
// ==========================================
function showPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = "text";
        btn.textContent = "Ø"; // เปลี่ยนเป็นสัญลักษณ์ขณะโชว์รหัส
    }
}

function hidePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = "password";
        btn.textContent = "O"; // กลับเป็นจุด/ซ่อนรหัส
    }
}