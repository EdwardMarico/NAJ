// ==========================================
// GITHUB CONFIGURATION & NOTE DATA
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "web-data/json/note.json"; 
const GITHUB_TOKEN = ""; 

let currentNotesData = [];
let originalNoteObj = null; // เก็บค่าเดิมไว้เปรียบเทียบ

document.addEventListener("DOMContentLoaded", () => {
    
    // ---------- LOAD DATA & INITIALIZE ----------
    loadNotes();

    // ---------- MODAL & FORM EVENTS ----------
    const modal = document.getElementById("noteModal");
    const openModalBtn = document.getElementById("addNoteBtn") || document.getElementById("openModalBtn");
    const closeModalBtn = modal ? modal.querySelector(".close-btn") : null;
    const noteForm = document.getElementById("noteForm");
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");

    // เปิด Pop-up Add Note
    if (openModalBtn) {
        openModalBtn.addEventListener("click", () => {
            if (modalTitle) modalTitle.textContent = "Add New Note";
            
            const noteIdInput = document.getElementById("noteId");
            const titleInput = document.getElementById("noteTitle");
            const contentInput = document.getElementById("noteContent");
            
            if (noteIdInput) noteIdInput.value = "";
            if (titleInput) titleInput.value = "";
            if (contentInput) contentInput.value = "";
            
            originalNoteObj = null;
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
    if (noteForm) {
        noteForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("noteId").value;
            const tokenInput = document.getElementById("githubToken");
            const token = tokenInput ? tokenInput.value.trim() : "";
            const title = document.getElementById("noteTitle").value.trim();
            const content = document.getElementById("noteContent").value.trim();

            if (!token) {
                alert("กรุณากรอก GitHub Token");
                return;
            }

            // เช็กกรณีเป็น Edit แล้วไม่มีการแก้ไขข้อมูล
            if (id && typeof originalNoteObj !== "undefined" && originalNoteObj) {
                if (originalNoteObj.title === title && originalNoteObj.content === content) {
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
                    const index = currentNotesData.findIndex(n => n.id == id);
                    if (index !== -1) {
                        currentNotesData[index].title = title;
                        currentNotesData[index].content = content;
                        currentNotesData[index].updatedAt = new Date().toLocaleString('th-TH');
                    }
                } else {
                    const newNote = {
                        id: Date.now(),
                        title: title,
                        content: content,
                        author: "guest", // หรือปรับใส่ author ตามต้องการ
                        createdAt: new Date().toLocaleString('th-TH')
                    };
                    currentNotesData.push(newNote);
                }

                const commitMsg = id ? `Edit note: ${title}` : `Add note: ${title}`;
                await updateGitHubJSON(currentNotesData, commitMsg, token);

                closeModal(modal);
                
                // เคลียร์เฉพาะช่องข้อมูล Note
                document.getElementById("noteTitle").value = "";
                document.getElementById("noteContent").value = "";
                document.getElementById("noteId").value = "";

            } catch (error) {
                console.error(error);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาเช็ก Token อีกครั้ง");
            } finally {
                if (submitBtn) {
                    submitBtn.textContent = "Save Note";
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
                renderNotes(currentNotesData);
                return;
            }

            typingTimer = setTimeout(() => {
                const filteredNotes = currentNotesData.filter(note =>
                    note.title.toLowerCase().includes(keyword) ||
                    (note.content && note.content.toLowerCase().includes(keyword))
                );
                renderNotes(filteredNotes);
            }, doneTypingInterval);
        });
    }

    // ---------- DELETE NOTE FORM EVENTS ----------
    const deleteModal = document.getElementById("deleteModal");
    const closeDeleteModal = document.getElementById("closeDeleteModal");
    const deleteForm = document.getElementById("deleteForm");

    // ปิด Modal ลบ Note
    if (closeDeleteModal) {
        closeDeleteModal.onclick = () => {
            closeModal(deleteModal);
        };
    }

    // Submit Form Delete Note
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
                await deleteNote(id, token);
                closeModal(deleteModal);
            } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล กรุณาเช็ก Token อีกครั้ง");
            } finally {
                if (confirmDeleteBtn) {
                    confirmDeleteBtn.textContent = "Delete Note";
                    confirmDeleteBtn.disabled = false;
                }
            }
        });
    }

    const selectWrapper = document.querySelector(".custom-select-wrapper");
    const selectTrigger = document.getElementById("customSelectTrigger");
    const customOptions = document.querySelectorAll(".custom-option");
    const noteAuthorInput = document.getElementById("noteAuthor");
    const selectedAuthorText = document.getElementById("selectedAuthorText");

    // เปิด/ปิด Dropdown
    if (selectTrigger && selectWrapper) {
        selectTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            selectWrapper.classList.toggle("open");
        });
    }

    // คลิกเลือกรายการ Option
    customOptions.forEach(option => {
        option.addEventListener("click", function() {
            const value = this.getAttribute("data-value");
            
            noteAuthorInput.value = value;
            selectedAuthorText.textContent = value;

            customOptions.forEach(opt => opt.classList.remove("selected"));
            this.classList.add("selected");

            selectWrapper.classList.remove("open");
        });
    });

    // คลิกที่อื่นข้างนอกกล่องให้ปิด Dropdown
    document.addEventListener("click", (e) => {
        if (selectWrapper && !selectWrapper.contains(e.target)) {
            selectWrapper.classList.remove("open");
        }
    });

    // ฟังก์ชันสำหรับ Set ค่า Profile เวลาเปิด Modal (Add / Edit)
    function setCustomSelectValue(val) {
        const targetVal = val || "Kawin";
        if (noteAuthorInput) noteAuthorInput.value = targetVal;
        if (selectedAuthorText) selectedAuthorText.textContent = targetVal;
        
        customOptions.forEach(opt => {
            if (opt.getAttribute("data-value") === targetVal) {
                opt.classList.add("selected");
            } else {
                opt.classList.remove("selected");
            }
        });
    }
});

// ==========================================
// FUNCTIONS (LOAD, RENDER, MODAL & GITHUB API)
// ==========================================

// ดึงข้อมูล Note มาแสดง
async function loadNotes() {
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
            currentNotesData = JSON.parse(jsonText);
            renderNotes(currentNotesData);
            return;
        }
    } catch (err) {
        console.warn("ไม่สามารถโหลดผ่าน GitHub API ได้ จะลองโหลดไฟล์ภายในเครื่อง...", err);
    }

    try {
        const localRes = await fetch(GITHUB_FILE_PATH);
        if (localRes.ok) {
            currentNotesData = await localRes.json();
            renderNotes(currentNotesData);
        } else {
            console.error("หาไฟล์ note.json ไม่พบ");
        }
    } catch (err) {
        console.error("Error loading note.json:", err);
    }
}

// แสดงผลรายการ Note ใน UI
function renderNotes(notes) {
    const container = document.getElementById("noteList");
    if (!container) return;
    container.innerHTML = "";

    if (notes.length === 0) {
        container.innerHTML = `<div class="no-results">ไม่พบ Note ที่ตรงกับการค้นหา</div>`;
        return;
    }

    notes.forEach((note, index) => {
        const item = document.createElement("div");
        item.className = "note-item animate-in";
        item.style.animationDelay = `${index * 0.05}s`;

        item.innerHTML = `
            <div class="note-info">
                <h3 class="note-title">${escapeHtml(note.title)}</h3>
                <p class="note-content-preview">${escapeHtml(note.content || '')}</p>
            </div>
            <div style="color: #666; font-size: 11px; margin-right: 15px;">${note.updatedAt || note.createdAt || ''}</div>
            <button class="game-more-btn" onclick="toggleMenu(event, ${note.id})">&#8226;&#8226;&#8226;</button>
            <div class="action-menu" id="menu-${note.id}">
                <button onclick="openEditModal(${note.id})">Edit Note</button>
                <button onclick="openDeleteModal(${note.id})" style="color: #ef4444;">Delete Note</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// เปิด Pop-up แก้ไขข้อมูล Note
function openEditModal(id) {
    const note = currentNotesData.find(n => n.id == id);
    if (!note) return;

    originalNoteObj = { ...note };

    const modal = document.getElementById("noteModal");
    const modalTitle = document.getElementById("modalTitle");
    const noteIdInput = document.getElementById("noteId");
    const titleInput = document.getElementById("noteTitle");
    const contentInput = document.getElementById("noteContent");

    if (modalTitle) modalTitle.textContent = "Edit Note Info";
    if (noteIdInput) noteIdInput.value = note.id;
    if (titleInput) titleInput.value = note.title;
    if (contentInput) contentInput.value = note.content;

    openModal(modal);
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

// ฟังก์ชันเปิด Pop-up ลบ Note
function openDeleteModal(id) {
    const deleteModal = document.getElementById("deleteModal");
    const deleteGameIdInput = document.getElementById("deleteGameId");
    const deleteTokenInput = document.getElementById("deleteGithubToken");

    if (deleteModal && deleteGameIdInput) {
        deleteGameIdInput.value = id;
        openModal(deleteModal);
        
        if (deleteTokenInput) {
            deleteTokenInput.focus();
        }
    }
}

// ฟังก์ชันลบ Note
async function deleteNote(id, token) {
    const note = currentNotesData.find(n => n.id == id);
    if (!note) return;

    currentNotesData = currentNotesData.filter(n => n.id != id);
    await updateGitHubJSON(currentNotesData, `Delete note: ${note.title}`, token);
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

// Utility กัน HTML XSS
function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}