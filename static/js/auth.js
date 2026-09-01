// Authentication & Role Access Control JavaScript Logic

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check saved session in localStorage
    const savedUser = localStorage.getItem('sih_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUserUI();
        } catch (e) {
            localStorage.removeItem('sih_user');
        }
    }

    // Citizen Login Form
    const citizenLoginForm = document.getElementById('citizenLoginForm');
    if (citizenLoginForm) {
        citizenLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('citizenEmail').value;
            const password = document.getElementById('citizenPassword').value;
            await handleLogin(email, password, 'citizen');
        });
    }

    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            await handleLogin(email, password, 'admin');
        });
    }

    // Register Form
    const citizenRegisterForm = document.getElementById('citizenRegisterForm');
    if (citizenRegisterForm) {
        citizenRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const fullName = document.getElementById('regFullName').value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password, full_name: fullName })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Registration failed.');
                }

                alert('Registration successful! Logging in...');
                await handleLogin(email, password, 'citizen');
            } catch (err) {
                showAuthError(err.message, 'citizenAuthError');
            }
        });
    }
});

async function handleLogin(email, password, portalType) {
    const errorElId = portalType === 'admin' ? 'adminAuthError' : 'citizenAuthError';
    clearAuthErrors();

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, portal_type: portalType })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Login failed.');
        }

        // Login Success
        currentUser = data;
        localStorage.setItem('sih_user', JSON.stringify(currentUser));
        updateUserUI();
        closeAuthModal();

        if (currentUser.role === 'admin') {
            switchTab('dashboardView');
        } else {
            switchTab('citizenView');
        }

    } catch (err) {
        showAuthError(err.message, errorElId);
    }
}

function demoQuickLogin(role) {
    if (role === 'citizen') {
        document.getElementById('citizenEmail').value = 'citizen@city.gov.in';
        document.getElementById('citizenPassword').value = 'citizen123';
        handleLogin('citizen@city.gov.in', 'citizen123', 'citizen');
    } else if (role === 'admin') {
        document.getElementById('adminEmail').value = 'admin@mc.gov.in';
        document.getElementById('adminPassword').value = 'admin123';
        handleLogin('admin@mc.gov.in', 'admin123', 'admin');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('sih_user');
    updateUserUI();
    openAuthModal('citizen');
}

function updateUserUI() {
    const userBadge = document.getElementById('userNavBadge');
    const authContainer = document.getElementById('navAuthBtn');

    if (currentUser) {
        if (userBadge) {
            userBadge.style.display = 'inline-flex';
            if (currentUser.role === 'admin') {
                userBadge.innerHTML = `🛡️ Official: <strong>${escapeHtml(currentUser.full_name || currentUser.username)}</strong>`;
                userBadge.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                userBadge.style.color = '#67e8f9';
            } else {
                userBadge.innerHTML = `👤 Citizen: <strong>${escapeHtml(currentUser.full_name || currentUser.username)}</strong>`;
                userBadge.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                userBadge.style.color = '#a5b4fc';
            }
        }
        if (authContainer) {
            authContainer.innerHTML = `<button class="btn-action" style="padding:0.6rem 1.1rem;font-weight:700;" onclick="logout()">🚪 Logout</button>`;
        }
    } else {
        if (userBadge) userBadge.style.display = 'none';
        if (authContainer) {
            authContainer.innerHTML = `
                <a href="/login" style="
                    padding:0.55rem 1rem;
                    font-weight:700;
                    font-size:0.85rem;
                    text-decoration:none;
                    display:inline-flex;
                    align-items:center;
                    gap:0.4rem;
                    background:rgba(99,102,241,0.15);
                    border:1px solid rgba(99,102,241,0.4);
                    color:#a5b4fc;
                    border-radius:9px;
                    transition:all 0.2s;
                " onmouseover="this.style.background='rgba(99,102,241,0.28)'" onmouseout="this.style.background='rgba(99,102,241,0.15)'">
                    👤 Citizen Login
                </a>
                <a href="/admin/login" style="
                    padding:0.55rem 1rem;
                    font-weight:700;
                    font-size:0.85rem;
                    text-decoration:none;
                    display:inline-flex;
                    align-items:center;
                    gap:0.4rem;
                    background:rgba(6,182,212,0.12);
                    border:1px solid rgba(6,182,212,0.4);
                    color:#67e8f9;
                    border-radius:9px;
                    transition:all 0.2s;
                    margin-left:0.4rem;
                " onmouseover="this.style.background='rgba(6,182,212,0.22)'" onmouseout="this.style.background='rgba(6,182,212,0.12)'">
                    🛡️ Admin Login
                </a>
            `;
        }
    }
}


function openAuthModal(defaultPortal = 'citizen') {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.zIndex = '2000';
        modal.classList.add('active');
        switchAuthSubTab(defaultPortal);
    }
}


function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
}

function switchAuthSubTab(portal) {
    clearAuthErrors();
    const citizenCard = document.getElementById('citizenAuthCard');
    const adminCard = document.getElementById('adminAuthCard');
    const subTabBtns = document.querySelectorAll('.auth-subtab-btn');

    subTabBtns.forEach(btn => btn.classList.remove('active'));

    if (portal === 'admin') {
        if (citizenCard) citizenCard.style.display = 'none';
        if (adminCard) adminCard.style.display = 'block';
        document.getElementById('subTabAdmin')?.classList.add('active');
    } else {
        if (citizenCard) citizenCard.style.display = 'block';
        if (adminCard) adminCard.style.display = 'none';
        document.getElementById('subTabCitizen')?.classList.add('active');
    }
}

function toggleRegisterMode(showRegister) {
    clearAuthErrors();
    const loginSection = document.getElementById('citizenLoginSection');
    const regSection = document.getElementById('citizenRegisterSection');
    if (showRegister) {
        if (loginSection) loginSection.style.display = 'none';
        if (regSection) regSection.style.display = 'block';
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (regSection) regSection.style.display = 'none';
    }
}

function showAuthError(msg, elId) {
    const el = document.getElementById(elId);
    if (el) {
        el.innerHTML = msg;
        el.style.display = 'block';
    }
}

function clearAuthErrors() {
    document.querySelectorAll('.auth-error-box').forEach(box => {
        box.innerHTML = '';
        box.style.display = 'none';
    });
}

function switchTab(targetId) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add('active');

    if (targetId === 'dashboardView') {
        if (!currentUser || currentUser.role !== 'admin') {
            // Show restricted access screen inside dashboard
            renderDashboardAccessRestricted();
        } else {
            if (typeof loadDashboardData === 'function') loadDashboardData();
        }
    }
}

function renderDashboardAccessRestricted() {
    const dashSection = document.getElementById('dashboardView');
    if (!dashSection) return;

    dashSection.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            padding: 3rem;
        ">
            <div style="font-size: 4rem; margin-bottom: 1.5rem;">🏢</div>
            <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: #fff; margin-bottom: 0.75rem;">
                Municipal Authority Dashboard
            </h2>
            <p style="color: #94a3b8; font-size: 0.95rem; max-width: 480px; margin-bottom: 0.5rem; line-height: 1.7;">
                This dashboard is exclusively managed by <strong style="color:#67e8f9;">Municipal Corporation Officials</strong>.
                Please log in with your official government credentials to access grievance monitoring, hotspot radar, and the Officer Assistant.
            </p>
            <div style="
                margin: 1.5rem 0;
                padding: 0.85rem 1.25rem;
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.3);
                border-radius: 12px;
                font-size: 0.85rem;
                color: #fca5a5;
                max-width: 420px;
            ">
                ⛔ <strong>Citizens are not permitted</strong> to access the Municipal Authority Dashboard.
            </div>
            <a href="/admin/login" style="
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: linear-gradient(135deg, #06b6d4, #0284c7);
                color: #fff;
                text-decoration: none;
                padding: 0.9rem 2rem;
                border-radius: 12px;
                font-weight: 700;
                font-size: 1rem;
                box-shadow: 0 4px 16px rgba(6,182,212,0.35);
                transition: all 0.2s;
            ">
                🛡️ Go to Municipal Admin Login
            </a>
            <div style="margin-top: 1rem; font-size: 0.83rem; color: #64748b;">
                Are you a citizen? <a href="/login" style="color: #a5b4fc; font-weight: 700;">Citizen Login →</a>
            </div>
        </div>
    `;
}

