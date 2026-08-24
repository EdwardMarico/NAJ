// ==========================================
// GITHUB CONFIGURATION & GAME DATA
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "web-data/json/games-data.json"; 
const GITHUB_TOKEN = ""; 

let currentGamesData = [];
let originalGameObj = null; // เก็บค่าเดิมไว้เปรียบเทียบ

document.addEventListener("DOMContentLoaded", () => {
    
    // ---------- LOAD DATA & INITIALIZE ----------
    loadGames();

    // ---------- MODAL & FORM EVENTS ----------
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
            
            const gameIdInput = document.getElementById("gameId");
            const titleInput = document.getElementById("gameTitle");
            const urlInput = document.getElementById("gameUrl");
            
            if (gameIdInput) gameIdInput.value = "";
            if (titleInput) titleInput.value = "";
            if (urlInput) urlInput.value = "";
            
            originalGameObj = null;
            openModal(modal);
        });
    }

    // ปิด Pop-up เมื่อกดปุ่ม ×
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            closeModal(modal);
        });
    }

    // คลิกพื้นหลังนอก Pop-up เพื่อปิด
    window.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
        const deleteModal = document.getElementById("deleteModal");
        if (e.target === deleteModal) closeModal(deleteModal);
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

            // เช็กกรณีเป็น Edit แล้วไม่มีการแก้ไขข้อมูล
            if (id && typeof originalGameObj !== "undefined" && originalGameObj) {
                if (originalGameObj.title === title && originalGameObj.actionUrl === actionUrl) {
                    alert("ไม่มีการเปลี่ยนแปลงข้อมูล");
                    closeModal(modal);
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

                closeModal(modal);
                
                // เคลียร์เฉพาะช่องข้อมูลเกม
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

    // ---------- REAL-TIME SEARCH ----------
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

    // ---------- DELETE GAME FORM EVENTS ----------
    const deleteModal = document.getElementById("deleteModal");
    const closeDeleteModal = document.getElementById("closeDeleteModal");
    const deleteForm = document.getElementById("deleteForm");

    // ปิด Modal ลบเกม
    if (closeDeleteModal) {
        closeDeleteModal.onclick = () => {
            closeModal(deleteModal);
        };
    }

    // Submit Form Delete Game
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
                closeModal(deleteModal);
            } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล กรุณาเช็ก Token อีกครั้ง");
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
            console.error("หาไฟล์ games-data.json ไม่พบ");
        }
    } catch (err) {
        console.error("Error loading games-data.json:", err);
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

    openModal(modal); // <-- เปลี่ยนจาก modal.style.display = "flex";
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
        openModal(deleteModal); // <-- เปลี่ยนจาก deleteModal.style.display = "flex";
        
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