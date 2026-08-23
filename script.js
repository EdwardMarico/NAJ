// ==========================================
// 1. ตั้งค่าข้อมูล GITHUB ของคุณตรงนี้
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "games.json"; 
const GITHUB_TOKEN = "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"; 

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
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModalBtn = document.querySelector(".close-btn");
    const gameForm = document.getElementById("gameForm");
    const modalTitle = document.getElementById("modalTitle");
    const deleteBtn = document.getElementById("deleteBtn");

    // เปิด Pop-up Add Game
    if (openModalBtn) {
        openModalBtn.onclick = () => {
            modalTitle.textContent = "Add New Game";
            gameForm.reset();
            document.getElementById("gameId").value = "";
            originalGameObj = null;
            if (deleteBtn) deleteBtn.style.display = "none"; // ซ่อนปุ่มลบเมื่อเป็นการเพิ่มเกมใหม่
            modal.style.display = "flex";
        };
    }

    if (closeModalBtn) closeModalBtn.onclick = () => modal.style.display = "none";

    // จัดการเมื่อกดปุ่ม ลบเกม ใน Modal
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const id = document.getElementById("gameId").value;
            if (id) {
                deleteGame(id);
            }
        };
    }

    // Submit Form (ทั้ง Add และ Edit)
    if (gameForm) {
        gameForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("gameId").value;
            const title = document.getElementById("gameTitle").value.trim();
            const actionUrl = document.getElementById("gameUrl").value.trim();

            // ตรวจจับกรณีแก้ไข แต่ข้อมูลไม่ได้เปลี่ยน
            if (id && originalGameObj) {
                if (originalGameObj.title === title && originalGameObj.actionUrl === actionUrl) {
                    alert("ไม่มีการเปลี่ยนแปลงข้อมูล");
                    modal.style.display = "none";
                    return;
                }
            }

            const submitBtn = document.getElementById("submitBtn");
            submitBtn.textContent = "Saving...";
            submitBtn.disabled = true;

            if (id) {
                // กรณี Edit
                const index = currentGamesData.findIndex(g => g.id == id);
                if (index !== -1) {
                    currentGamesData[index].title = title;
                    currentGamesData[index].actionUrl = actionUrl;
                    currentGamesData[index].updatedAt = new Date().toLocaleString('th-TH');
                }
            } else {
                // กรณี Add New
                const newGame = {
                    id: Date.now(),
                    title: title,
                    actionText: "Install",
                    actionUrl: actionUrl,
                    createdAt: new Date().toLocaleString('th-TH')
                };
                currentGamesData.push(newGame);
            }

            // บันทึกลง GitHub
            await updateGitHubJSON(currentGamesData, id ? `Edit game: ${title}` : `Add game: ${title}`);
        });
    }
});

// ==========================================
// 6. FUNCTIONS (LOAD, RENDER, GITHUB API)
// ==========================================

// ดึงข้อมูลเกมมาแสดง
async function loadGames() {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    try {
        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` }
        });

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

    games.forEach(game => {
        const item = document.createElement("div");
        item.className = "game-item";
        item.innerHTML = `
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <a href="${game.actionUrl}" class="game-action-btn" target="_blank">&#10515; ${game.actionText || 'Install'}</a>
            </div>
            <div style="color: #666; font-size: 11px; margin-right: 15px;">${game.updatedAt || game.createdAt || ''}</div>
            <button class="game-more-btn" onclick="toggleMenu(event, ${game.id})">&#8226;&#8226;&#8226;</button>
            <div class="action-menu" id="menu-${game.id}">
                <button onclick="openEditModal(${game.id})">Edit Game Info</button>
                <button onclick="deleteGame(${game.id})" style="color: #ef4444;">Delete Game</button>
            </div>
        `;
        container.appendChild(item);
    });
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

// เปิด Pop-up โหมด Edit
function openEditModal(id) {
    const game = currentGamesData.find(g => g.id == id);
    if (!game) return;

    originalGameObj = { ...game };

    document.getElementById("modalTitle").textContent = "Edit Game Info";
    document.getElementById("gameId").value = game.id;
    document.getElementById("gameTitle").value = game.title;
    document.getElementById("gameUrl").value = game.actionUrl;

    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) deleteBtn.style.display = "block"; // แสดงปุ่มลบเมื่อเปิดการแก้ไข

    document.getElementById("gameModal").style.display = "flex";
}

// ฟังก์ชันสำหรับลบเกม
async function deleteGame(id) {
    const game = currentGamesData.find(g => g.id == id);
    if (!game) return;

    if (confirm(`คุณต้องการลบเกม "${game.title}" ใช่หรือไม่?`)) {
        currentGamesData = currentGamesData.filter(g => g.id != id);
        await updateGitHubJSON(currentGamesData, `Delete game: ${game.title}`);
    }
}

// ส่งอัปเดตไฟล์กลับไปที่ GitHub API
async function updateGitHubJSON(updatedData, commitMessage) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    try {
        const getRes = await fetch(url, {
            headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` }
        });
        const fileData = await getRes.json();

        const updatedContentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));

        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
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
            alert("เกิดข้อผิดพลาดในการอัปเดตไฟล์");
        }
    } catch (err) {
        console.error("Error updating GitHub:", err);
    }
}
