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
    const authBtn = document.getElementById('navAuthBtn');
    const adminTabBtn = document.getElementById('adminNavTab');

    if (currentUser) {
        if (userBadge) {
            userBadge.style.display = 'inline-flex';
            if (currentUser.role === 'admin') {
                userBadge.innerHTML = `🛡️ Official Admin: <strong>${escapeHtml(currentUser.full_name || currentUser.username)}</strong> (${currentUser.department || 'MC'})`;
                userBadge.style.borderColor = 'rgba(6, 182, 212, 0.5)';
                userBadge.style.color = '#67e8f9';
            } else {
                userBadge.innerHTML = `👤 Citizen: <strong>${escapeHtml(currentUser.full_name || currentUser.username)}</strong>`;
                userBadge.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                userBadge.style.color = '#a5b4fc';
            }
        }
        if (authBtn) {
            authBtn.innerHTML = `<span>🚪</span> Logout`;
            authBtn.onclick = logout;
        }
    } else {
        if (userBadge) userBadge.style.display = 'none';
        if (authBtn) {
            authBtn.innerHTML = `<span>🔑</span> Login / Portal Select`;
            authBtn.onclick = () => openAuthModal('citizen');
        }
    }
}

function openAuthModal(defaultPortal = 'citizen') {
    const modal = document.getElementById('authModal');
    if (modal) {
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
    // Role check before switching to Admin Dashboard tab
    if (targetId === 'dashboardView') {
        if (!currentUser || currentUser.role !== 'admin') {
            alert("🔒 Access Restricted: Municipal Authority Admin Dashboard is reserved for Municipal Officers. Please log in through the Official Municipal Admin Portal.");
            openAuthModal('admin');
            return;
        }
    }

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add('active');

    if (targetId === 'dashboardView' && typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}
