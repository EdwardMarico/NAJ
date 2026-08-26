// ==========================================
// GITHUB CONFIGURATION & NOTE DATA
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "web-data/json/note-data.json"; 

// 🔗 URL ปลายทาง Backend บน Render
const BACKEND_API_URL = "https://naj-note-backend.onrender.com/api/save-notes";

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

    // Submit Form (Add & Edit) - ตัดการเช็ก Token ออก
    if (noteForm) {
        noteForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("noteId").value;
            const title = document.getElementById("noteTitle").value.trim();
            
            // 1. ดึง HTML Raw จาก contenteditable
            let rawContent = document.getElementById("noteContent").innerHTML;

            // 2. คลีนแท็ก <div> และ <br> ให้แปลงเป็น \n หรือตัดแท็กส่วนเกินออก
            const content = rawContent
                .replace(/<div><br><\/div>/gi, "\n")
                .replace(/<div>/gi, "\n")
                .replace(/<\/div>/gi, "")
                .replace(/<br\s*[\/]?>/gi, "\n")
                .trim();
            
            const authorInput = document.getElementById("noteAuthor");
            const author = authorInput ? authorInput.value : "guest";

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
                await updateGitHubJSON(currentNotesData, commitMsg);

                safeCloseModal(modal);
                
                // ล้างค่าใน Form (ปรับ noteContent เป็น innerHTML)
                document.getElementById("noteTitle").value = "";
                document.getElementById("noteContent").innerHTML = "";
                document.getElementById("noteId").value = "";

            } catch (error) {
                console.error(error);
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
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
                renderNotes(sortNotes(currentNotesData));
                return;
            }

            typingTimer = setTimeout(() => {
                const filteredNotes = currentNotesData.filter(note =>
                    (note.title && note.title.toLowerCase().includes(keyword)) ||
                    (note.content && note.content.toLowerCase().includes(keyword)) ||
                    (note.author && note.author.toLowerCase().includes(keyword))
                );
                renderNotes(sortNotes(filteredNotes));
            }, doneTypingInterval);
        });
    }

    // ---------- CHECK TAB KEY ----------
    const noteContentInput = document.getElementById("noteContent");

    if (noteContentInput) {
        noteContentInput.addEventListener("keydown", function(e) {
            if (e.key === "Tab") {
                e.preventDefault(); 
                document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;");
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

    // Submit Form Delete Note - ตัดการเช็ก Token ออก
    if (deleteForm) {
        deleteForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("deleteGameId").value;
            const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

            if (confirmDeleteBtn) {
                confirmDeleteBtn.textContent = "Deleting...";
                confirmDeleteBtn.disabled = true;
            }

            try {
                await deleteNote(id);
                safeCloseModal(deleteModal);
            } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาดในการลบข้อมูล");
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
// FUNCTIONS (LOAD, RENDER, MODAL & BACKEND API)
// ==========================================

async function loadNotes() {
    // 1. อ่านไฟล์ Local แบบปิด Cache
    try {
        const cacheBuster = `?t=${Date.now()}`;
        const localRes = await fetch(GITHUB_FILE_PATH + cacheBuster, {
            cache: "no-store",
            headers: {
                "Pragma": "no-cache",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        });

        if (localRes.ok) {
            currentNotesData = await localRes.json();
            renderNotes(sortNotes(currentNotesData));
            return;
        }
    } catch (err) {
        console.warn("ไม่สามารถอ่านไฟล์ Local ได้ จะลองโหลดผ่าน GitHub API...", err);
    }

    // 2. ดึงจาก GitHub API แบบปิด Cache
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    try {
        const res = await fetch(url + `?t=${Date.now()}`, {
            cache: "no-store",
            headers: {
                "Pragma": "no-cache",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        });

        if (res.ok) {
            const fileData = await res.json();
            const jsonText = decodeURIComponent(escape(atob(fileData.content)));
            currentNotesData = JSON.parse(jsonText);
            renderNotes(sortNotes(currentNotesData));
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
                        <p class="note-content-preview">${renderFormattedText(note.content || '')}</p>
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

function sortNotes(notes) {
    if (!notes || notes.length === 0) return [];

    const sortMode = localStorage.getItem("note_sort_mode") || "newest";
    const sorted = [...notes];

    sorted.sort((a, b) => {
        if (sortMode === "newest") {
            return Number(b.id) - Number(a.id);
        } else if (sortMode === "oldest") {
            return Number(a.id) - Number(b.id);
        } else if (sortMode === "a-z") {
            return (a.title || "").localeCompare(b.title || "", 'th');
        } else if (sortMode === "z-a") {
            return (b.title || "").localeCompare(a.title || "", 'th');
        }
        return 0;
    });

    return sorted;
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
    if (contentInput) contentInput.innerHTML = note.content;

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

    if (deleteModal && deleteGameIdInput) {
        deleteGameIdInput.value = id;
        safeOpenModal(deleteModal);
    }
}

// ลบ Note (ไม่ต้องใช้ Token)
async function deleteNote(id) {
    const note = currentNotesData.find(n => n.id == id);
    if (!note) return;

    const updatedNotes = currentNotesData.filter(n => n.id != id);
    await updateGitHubJSON(updatedNotes, `Delete note: ${note.title}`);
}

// อัปเดตข้อมูลไปยัง Backend API (แก้ไขรับค่า updatedData และ commitMessage)
async function updateGitHubJSON(updatedData, commitMessage) {
    try {
        const response = await fetch('https://naj-backend.onrender.com/api/save-notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updatedNotes: updatedData,
                commitMessage: commitMessage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            alert("บันทึก Note เรียบร้อยแล้ว!");
            currentNotesData = updatedData;
            renderNotes(sortNotes(currentNotesData));
        } else {
            alert(`เกิดข้อผิดพลาดจาก Server: ${result.error}`);
        }

        return result;
    } catch (error) {
        console.error('Error updating via backend:', error);
        alert("ไม่สามารถเชื่อมต่อกับ Server เพื่อบันทึกข้อมูลได้");
    }
}

function renderFormattedText(text) {
    if (!text) return '';

    let content = text;

    const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
    content = content.replace(urlPattern, (url) => {
        const href = url.startsWith('www.') ? `http://${url}` : url;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; position: relative; z-index: 10;" onclick="event.stopPropagation();">${url}</a>`;
    });

    content = content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    content = content.replace(/\*(.*?)\*/g, '<i>$1</i>');

    return content;
}
