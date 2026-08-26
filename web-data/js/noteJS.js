// ==========================================
// GITHUB CONFIGURATION & NOTE DATA
// ==========================================
const GITHUB_USERNAME = "EdwardMarico";
const GITHUB_REPO = "NAJ";
const GITHUB_FILE_PATH = "web-data/json/note-data.json"; 

// 🔗 อัปเดต URL ปลายทาง Backend บน Render ให้ตรงกับภาพ Error
const BACKEND_API_URL = "https://naj-backend.onrender.com/api/save-notes";

let currentNotesData = [];
let originalNoteObj = null; 

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
    
    loadNotes();

    const modal = document.getElementById("noteModal");
    const openModalBtn = document.getElementById("addNoteBtn") || document.getElementById("openModalBtn");
    const closeModalBtn = modal ? modal.querySelector(".close-btn") : null;
    const noteForm = document.getElementById("noteForm");
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");

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

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            safeCloseModal(modal);
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === modal) safeCloseModal(modal);
        const deleteModal = document.getElementById("deleteModal");
        if (e.target === deleteModal) safeCloseModal(deleteModal);
    });

    if (noteForm) {
        noteForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("noteId").value;
            const title = document.getElementById("noteTitle").value.trim();
            
            let rawContent = document.getElementById("noteContent").innerHTML;

            const content = rawContent
                .replace(/<div><br><\/div>/gi, "\n")
                .replace(/<div>/gi, "\n")
                .replace(/<\/div>/gi, "")
                .replace(/<br\s*[\/]?>/gi, "\n")
                .trim();
            
            const authorInput = document.getElementById("noteAuthor");
            const author = authorInput ? authorInput.value : "guest";

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

    const noteContentInput = document.getElementById("noteContent");

    if (noteContentInput) {
        noteContentInput.addEventListener("keydown", function(e) {
            if (e.key === "Tab") {
                e.preventDefault(); 
                document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;");
            }
        });
    }

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
// FUNCTIONS 
// ==========================================

async function loadNotes() {
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

function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
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

async function deleteNote(id) {
    const note = currentNotesData.find(n => n.id == id);
    if (!note) return;

    const updatedNotes = currentNotesData.filter(n => n.id != id);
    await updateGitHubJSON(updatedNotes, `Delete note: ${note.title}`);
}

async function updateGitHubJSON(updatedNotes, commitMessage) {
    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updatedNotes: updatedNotes,  
                commitMessage: commitMessage 
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            alert("บันทึก Note ลง GitHub เรียบร้อยแล้ว!");
            await loadNotes();
        } else {
            alert(`เกิดข้อผิดพลาดจาก Backend: ${JSON.stringify(result.error)}`);
        }

        return result;
    } catch (error) {
        console.error('Error updating via backend:', error);
        alert(`ไม่สามารถบันทึกข้อมูลได้: ${error.message}`);
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
