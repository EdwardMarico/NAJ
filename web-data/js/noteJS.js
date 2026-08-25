// ==========================================
// GITHUB CONFIGURATION & NOTE DATA
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "web-data/json/note-data.json"; 
const GITHUB_TOKEN = ""; 

let currentNotesData = [];
let originalNoteObj = null; // เก็บค่าเดิมไว้เปรียบเทียบ

// Safe wrapper สำหรับเรียกใช้ openModal / closeModal จาก -script.js
function safeOpenModal(modalEl) {
    if (typeof openModal === "function") {
        openModal(modalEl);
    } else if (modalEl) {
        modalEl.style.display = "flex";
    }
}

function safeCloseModal(modalEl) {
    if (typeof closeModal === "function") {
        closeModal(modalEl);
    } else if (modalEl) {
        modalEl.style.display = "none";
    }
}

// ฟังก์ชันสำหรับ Set ค่า Profile (ยกมาไว้นอก DOMContentLoaded เพื่อให้ openEditModal เรียกใช้ได้)
function setCustomSelectValue(val) {
    const targetVal = val || "Kawin";
    const noteAuthorInput = document.getElementById("noteAuthor");
    const selectedAuthorText = document.getElementById("selectedAuthorText");
    const customOptions = document.querySelectorAll(".custom-option");

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
            
            setCustomSelectValue("Kawin");

            originalNoteObj = null;
            safeOpenModal(modal);
        });
    }

    // ปิด Pop-up เมื่อกดปุ่ม ×
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            safeCloseModal(modal);
        });
    }

    // คลิกพื้นหลังนอก Pop-up เพื่อปิด
    window.addEventListener("click", (e) => {
        if (e.target === modal) safeCloseModal(modal);
        const deleteModal = document.getElementById("deleteModal");
        if (e.target === deleteModal) safeCloseModal(deleteModal);
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
            
            const authorInput = document.getElementById("noteAuthor");
            const author = authorInput ? authorInput.value : "guest";

            if (!token) {
                alert("กรุณากรอก GitHub Token");
                return;
            }

            // เช็กกรณีเป็น Edit แล้วไม่มีการแก้ไขข้อมูล
            if (id && typeof originalNoteObj !== "undefined" && originalNoteObj) {
                if (
                    originalNoteObj.title === title && 
                    originalNoteObj.content === content &&
                    originalNoteObj.author === author
                ) {
                    alert("ไม่มีการเปลี่ยนแปลงข้อมูล");
                    safeCloseModal(modal);
                    return;
                }
            }

            if (submitBtn) {
                submitBtn.textContent = "Saving...";
                submitBtn.disabled = true;
            }

            try {
                const nowFormatted = new Date().toLocaleString('th-TH');

                if (id) {
                    const index = currentNotesData.findIndex(n => n.id == id);
                    if (index !== -1) {
                        currentNotesData[index].title = title;
                        currentNotesData[index].content = content;
                        currentNotesData[index].author = author;
                        currentNotesData[index].time = nowFormatted;
                    }
                } else {
                    const newNote = {
                        id: String(Date.now()),
                        time: nowFormatted,
                        title: title,
                        content: content,
                        author: author
                    };
                    currentNotesData.unshift(newNote);
                }

                const commitMsg = id ? `Edit note: ${title}` : `Add note: ${title}`;
                await updateGitHubJSON(currentNotesData, commitMsg, token);

                safeCloseModal(modal);
                
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
    const doneTypingInterval = 300;

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
                    (note.title && note.title.toLowerCase().includes(keyword)) ||
                    (note.content && note.content.toLowerCase().includes(keyword)) ||
                    (note.author && note.author.toLowerCase().includes(keyword))
                );
                renderNotes(filteredNotes);
            }, doneTypingInterval);
        });
    }

    // ---------- CKHECK TAB ----------
    const noteContentInput = document.getElementById("noteContent");

    if (noteContentInput) {
        noteContentInput.addEventListener("keydown", function(e) {
            // เช็กว่าเป็นปุ่ม Tab หรือไม่
            if (e.key === "Tab") {
                e.preventDefault(); // ป้องกันไม่ให้ Cursor กระโดดเปลี่ยน Focus ไป Element อื่น

                const start = this.selectionStart;
                const end = this.selectionEnd;
                const spaces = "   "; // เว้นวรรค 3 ช่อง

                // แทรกช่องว่าง 3 ตัวลงตรงตำแหน่งเคอร์เซอร์
                this.value = this.value.substring(0, start) + spaces + this.value.substring(end);

                // ย้ายเคอร์เซอร์ไปต่อท้ายช่องว่างที่พึ่งแทรกเข้าไป
                this.selectionStart = this.selectionEnd = start + spaces.length;
            }
        });
    }

    // ---------- DELETE NOTE FORM EVENTS ----------
    const deleteModal = document.getElementById("deleteModal");
    const closeDeleteModal = document.getElementById("closeDeleteModal");
    const deleteForm = document.getElementById("deleteForm");

    if (closeDeleteModal) {
        closeDeleteModal.onclick = () => {
            safeCloseModal(deleteModal);
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
                await deleteNote(id, token);
                safeCloseModal(deleteModal);
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

    // ---------- CUSTOM DROPDOWN ----------
    const selectWrapper = document.querySelector(".custom-select-wrapper");
    const selectTrigger = document.getElementById("customSelectTrigger");
    const customOptions = document.querySelectorAll(".custom-option");
    const noteAuthorInput = document.getElementById("noteAuthor");
    const selectedAuthorText = document.getElementById("selectedAuthorText");

    if (selectTrigger && selectWrapper) {
        selectTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            selectWrapper.classList.toggle("open");
        });
    }

    customOptions.forEach(option => {
        option.addEventListener("click", function() {
            const value = this.getAttribute("data-value");
            
            if (noteAuthorInput) noteAuthorInput.value = value;
            if (selectedAuthorText) selectedAuthorText.textContent = value;

            customOptions.forEach(opt => opt.classList.remove("selected"));
            this.classList.add("selected");

            if (selectWrapper) selectWrapper.classList.remove("open");
        });
    });

    document.addEventListener("click", (e) => {
        if (selectWrapper && !selectWrapper.contains(e.target)) {
            selectWrapper.classList.remove("open");
        }
    });
});

// ==========================================
// FUNCTIONS (LOAD, RENDER, MODAL & GITHUB API)
// ==========================================

async function loadNotes() {
    try {
        const localRes = await fetch(GITHUB_FILE_PATH);
        if (localRes.ok) {
            currentNotesData = await localRes.json();
            renderNotes(currentNotesData);
            return;
        }
    } catch (err) {
        console.warn("ไม่สามารถอ่านไฟล์ Local ได้ จะลองโหลดผ่าน GitHub API...", err);
    }

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
        } else {
            console.error("หาไฟล์ note.json ไม่พบทั้งแบบ Local และ GitHub API");
        }
    } catch (err) {
        console.error("Error loading note.json:", err);
    }
}

function renderNotes(notes) {
    const container = document.getElementById("noteList");
    if (!container) return;
    container.innerHTML = "";

    if (!notes || notes.length === 0) {
        container.innerHTML = `<div class="no-results">ไม่พบ Note ที่ตรงกับการค้นหา</div>`;
        return;
    }

    notes.forEach((note, index) => {
        const item = document.createElement("div");
        item.className = "note-item animate-in";
        item.style.animationDelay = `${index * 0.05}s`;

        const displayTime = note.time || note.updatedAt || note.createdAt || '';

        item.innerHTML = `
                    <div class="note-info">
                        <h3 class="note-title">${escapeHtml(note.title)}</h3>
                        <p class="note-content-preview">${escapeHtml(note.content || '')}</p>
                    </div>
                    <div class="note-meta">
                        <span class="note-author">@${escapeHtml(note.author || 'guest')}</span>
                        <span class="note-date">${displayTime}</span>
                    </div>
                    <button class="note-more-btn" onclick="toggleMenu(event, '${note.id}')">&#8226;&#8226;&#8226;</button>
                    <div class="action-menu" id="menu-${note.id}">
                        <button onclick="openEditModal('${note.id}')">Edit Note</button>
                        <button onclick="openDeleteModal('${note.id}')" style="color: #ef4444;">Delete Note</button>
                    </div>
                `;
        container.appendChild(item);
    });
}

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

    setCustomSelectValue(note.author || "Kawin");

    safeOpenModal(modal);
}

function toggleMenu(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('active'));
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.toggle('active');
}

document.addEventListener('click', () => {
    document.querySelectorAll('.action-menu').forEach(m => m.classList.remove('active'));
});

function openDeleteModal(id) {
    const deleteModal = document.getElementById("deleteModal");
    const deleteGameIdInput = document.getElementById("deleteGameId");
    const deleteTokenInput = document.getElementById("deleteGithubToken");

    if (deleteModal && deleteGameIdInput) {
        deleteGameIdInput.value = id;
        safeOpenModal(deleteModal);
        
        if (deleteTokenInput) {
            deleteTokenInput.focus();
        }
    }
}

async function deleteNote(id, token) {
    const note = currentNotesData.find(n => n.id == id);
    if (!note) return;

    // กรองเอา Note ที่ต้องการลบออก
    const updatedNotes = currentNotesData.filter(n => n.id != id);

    // ส่งไปอัปเดต GitHub (ให้ updateGitHubJSON จัดการอัปเดต state และ render)
    await updateGitHubJSON(updatedNotes, `Delete note: ${note.title}`, token);
}

async function updateGitHubJSON(updatedData, commitMessage, token) {
    const authToken = token || GITHUB_TOKEN;

    if (!authToken) {
        alert("กรุณากรอก GitHub Token ก่อนทำรายการ");
        throw new Error("Missing GitHub Token");
    }

    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    try {
        // 1. ดึง sha ล่าสุดของไฟล์
        const getRes = await fetch(url, {
            headers: { 
                "Authorization": `Bearer ${authToken}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!getRes.ok) {
            const errData = await getRes.json();
            console.error("GitHub Fetch Error:", errData);
            throw new Error("ไม่สามารถอ่านข้อมูลจาก GitHub ได้ เช็ก Token หรือ Repo อีกครั้ง");
        }

        const fileData = await getRes.json();

        // 2. แปลง JSON เป็น Base64 แบบปลอดภัยรองรับภาษาไทย 100%
        const jsonString = JSON.stringify(updatedData, null, 2);
        const bytes = new TextEncoder().encode(jsonString);
        const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
        const updatedContentBase64 = btoa(binString);

        // 3. ส่งข้อมูลไปอัปเดต
        const putRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github.v3+json"
            },
            body: JSON.stringify({
                message: commitMessage,
                content: updatedContentBase64,
                sha: fileData.sha
            })
        });

        if (putRes.ok) {
            alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
            
            // สำคัญมาก: อัปเดตตัวแปร Global หลักให้เป็นข้อมูลล่าสุดทันที
            currentNotesData = updatedData; 
            
            // วาด UI ใหม่ด้วยข้อมูลล่าสุด
            renderNotes(currentNotesData); 
        } else {
            const errorData = await putRes.json();
            alert(`เกิดข้อผิดพลาด: ${errorData.message || 'อัปเดตไฟล์ไม่สำเร็จ'}`);
        }
    } catch (err) {
        console.error("Error updating GitHub:", err);
        throw err;
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
