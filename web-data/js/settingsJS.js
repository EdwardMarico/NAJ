document.addEventListener("DOMContentLoaded", () => {
    const settingsData = [
        {
            category: "Appearance & Display",
            items: [
                { 
                    id: "theme", 
                    title: "Theme Mode", 
                    desc: "เลือกธีมการแสดงผลของเว็บไซต์", 
                    type: "select", 
                    value: localStorage.getItem("app_theme") || "light",
                    options: [{ value: "dark", label: "Dark Mode" }, { value: "light", label: "Light Mode" }] 
                },
                { 
                    id: "noteSort", 
                    title: "Note Sorting", 
                    desc: "เลือกรูปแบบการเรียงลำดับของ Note", 
                    type: "select", 
                    value: localStorage.getItem("note_sort_mode") || "newest",
                    options: [
                        { value: "newest", label: "Newest - Oldest" },
                        { value: "oldest", label: "Oldest - Newest" },
                        { value: "a-z", label: "ก-ฮ / A-Z" },
                        { value: "z-a", label: "ฮ-ก / Z-A" }
                    ] 
                }
            ]
        },
        {
            category: "Account & Security",
            items: [
                { id: "tokenAccessBtn", title: "Get Access Token", desc: "จัดการและรับ Token สำหรับเข้าถึงสิทธิ์พิเศษ", type: "button", btnText: "Manage Token", action: "openTokenModal" }
            ]
        }
    ];

    const settingsListContainer = document.getElementById("settingsList");
    const searchInput = document.getElementById("searchInput");

    let isInitialRender = true;

    function renderSettings(settingsGroups) {
        if (!settingsListContainer) return;
        
        settingsListContainer.innerHTML = "";

        if (settingsGroups.length === 0) {
            settingsListContainer.innerHTML = `<div class="no-results">ไม่พบรายการตั้งค่าที่ตรงกับการค้นหา</div>`;
            return;
        }

        settingsGroups.forEach((group, groupIndex) => {
            if (!group.items || group.items.length === 0) return;

            const groupEl = document.createElement("div");
            
            if (isInitialRender) {
                groupEl.className = "settings-group animate-in"; 
                groupEl.style.animationDelay = `${groupIndex * 0.15}s`;
            } else {
                groupEl.className = "settings-group"; 
            }

            const catTitle = document.createElement("h2");
            catTitle.className = "category-title";
            catTitle.textContent = group.category;
            groupEl.appendChild(catTitle);

            const wrapper = document.createElement("div");
            wrapper.className = "items-wrapper";

            group.items.forEach(item => {
                const itemEl = document.createElement("div");
                itemEl.className = "setting-item";

                itemEl.innerHTML = `
                    <div class="setting-info">
                        <div class="setting-title">${item.title}</div>
                        ${item.desc ? `<div class="setting-desc">${item.desc}</div>` : ""}
                    </div>
                    <div class="setting-control">
                        ${renderControl(item)}
                    </div>
                `;

                wrapper.appendChild(itemEl);
            });

            groupEl.appendChild(wrapper);
            settingsListContainer.appendChild(groupEl);
        });

        isInitialRender = false;

        bindControlEvents();
    }

    function renderControl(item) {
        if (item.type === "toggle") {
            return `
                <label class="switch">
                    <input type="checkbox" id="${item.id}" ${item.checked ? "checked" : ""}>
                    <span class="slider"></span>
                </label>
            `;
        } else if (item.type === "select") {
            const currentOpt = item.options.find(o => o.value === item.value) || item.options[0];
            const optionsHtml = item.options.map(opt => 
                `<li class="custom-option ${opt.value === item.value ? "selected" : ""}" data-value="${opt.value}">${opt.label}</li>`
            ).join("");

            return `
                <div class="custom-dropdown" id="dropdown-${item.id}" data-id="${item.id}">
                    <div class="custom-dropdown-trigger">
                        <span class="selected-text">${currentOpt.label}</span>
                        <span class="arrow-icon">▼</span>
                    </div>
                    <ul class="custom-options-list">
                        ${optionsHtml}
                    </ul>
                </div>
            `;
        } else if (item.type === "button") {
            return `
                <button type="button" class="settings-action-btn" data-action="${item.action}">
                    ${item.btnText}
                </button>
            `;
        }
        return "";
    }

    function bindControlEvents() {
        const tokenBtn = settingsListContainer.querySelector('[data-action="openTokenModal"]');
        if (tokenBtn) {
            tokenBtn.addEventListener("click", () => {
                const getTokenModal = document.getElementById("getTokenModal");
                if (typeof openModal === "function" && getTokenModal) {
                    openModal(getTokenModal);
                }
            });
        }

        // Bind Custom Dropdown Events
        const customDropdowns = settingsListContainer.querySelectorAll('.custom-dropdown');
        customDropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.custom-dropdown-trigger');
            const options = dropdown.querySelectorAll('.custom-option');
            const settingId = dropdown.dataset.id;

            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // ปิดตัวอื่นทั้งหมดก่อนเปิดตัวนี้
                customDropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });

                dropdown.classList.toggle('open');
            });

            options.forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const val = opt.dataset.value;
                    const label = opt.textContent.trim();

                    dropdown.querySelector('.selected-text').textContent = label;
                    options.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    dropdown.classList.remove('open');

                    if (settingId === "theme") {
                        localStorage.setItem("app_theme", val);
                        if (val === "dark") {
                            document.body.classList.add("dark-mode");
                        } else {
                            document.body.classList.remove("dark-mode");
                        }
                    }

                    if (settingId === "noteSort") {
                        localStorage.setItem("note_sort_mode", val);
                    }
                });
            });
        });
    }

    // ปิด Dropdown เมื่อกดที่อื่นบนหน้าจอ
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });

    // Realtime Search
    let typingTimer;
    let initialRenderTimer;
    const doneTypingInterval = 500;

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(typingTimer);
            clearTimeout(initialRenderTimer);

            const keyword = e.target.value.toLowerCase().trim();

            if (keyword === "") {
                isInitialRender = true;
                renderSettings(settingsData);
                return;
            }

            typingTimer = setTimeout(() => {
                const filteredSettings = settingsData.map(group => {
                    const filteredItems = group.items.filter(item =>
                        item.title.toLowerCase().includes(keyword) ||
                        (item.desc && item.desc.toLowerCase().includes(keyword))
                    );
                    return { ...group, items: filteredItems };
                }).filter(group => group.items.length > 0);

                isInitialRender = true;
                renderSettings(filteredSettings);
            }, doneTypingInterval);
        });
    }

    initialRenderTimer = setTimeout(() => {
        renderSettings(settingsData);
    }, 200);
});