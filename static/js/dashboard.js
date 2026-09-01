let currentGrievances = [];

document.addEventListener('DOMContentLoaded', () => {
    // Filters event listeners
    const filterCategory = document.getElementById('filterCategory');
    const filterPriority = document.getElementById('filterPriority');
    const filterStatus = document.getElementById('filterStatus');
    const searchInput = document.getElementById('searchInput');

    [filterCategory, filterPriority, filterStatus].forEach(select => {
        if (select) select.addEventListener('change', fetchAndRenderGrievances);
    });

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fetchAndRenderGrievances, 300);
        });
    }

    // Initial load of dashboard if user is admin
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin') {
        loadDashboardData();
    }
});


async function loadDashboardData() {
    await fetchStats();
    await fetchAndRenderGrievances();
    await fetchAndRenderHotspots();
}

async function fetchStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();

        document.getElementById('statTotal').innerText = data.total_complaints || 0;
        document.getElementById('statPending').innerText = data.pending || 0;
        document.getElementById('statHighPriority').innerText = data.high_priority || 0;
        document.getElementById('statResolved').innerText = data.resolved || 0;
        document.getElementById('statRelated').innerText = data.related_complaints || 0;
    } catch (e) {
        console.error("Error fetching stats:", e);
    }
}

async function fetchAndRenderGrievances() {
    const tableBody = document.getElementById('grievanceTableBody');
    if (!tableBody) return;

    const category = document.getElementById('filterCategory')?.value || '';
    const priority = document.getElementById('filterPriority')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const search = document.getElementById('searchInput')?.value || '';

    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (priority) params.append('priority', priority);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem;">Loading complaints...</td></tr>`;

    try {
        const res = await fetch(`/api/grievances?${params.toString()}`);
        const grievances = await res.json();
        currentGrievances = grievances;

        if (!grievances || grievances.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No complaints found matching filters.</td></tr>`;
            return;
        }

        let html = '';
        grievances.forEach(g => {
            const dateStr = new Date(g.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            const relatedCount = g.related_ids ? g.related_ids.length : 0;

            html += `
                <tr onclick="openGrievanceModal(${g.id})">
                    <td><strong>${g.ticket_id}</strong></td>
                    <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(g.summary || g.text)}
                    </td>
                    <td>${g.category}</td>
                    <td><span class="priority-badge priority-${g.priority}">${g.priority}</span></td>
                    <td>${g.department}</td>
                    <td><span class="status-badge">${g.status}</span></td>
                    <td>${dateStr}</td>
                    <td>
                        ${relatedCount > 0 
                            ? `<span style="color: #fbbf24; font-weight: 700;">⚠️ ${relatedCount} Linked</span>` 
                            : `<span style="color: var(--text-muted);">None</span>`}
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #f87171;">Error loading data: ${e.message}</td></tr>`;
    }
}

async function openGrievanceModal(id) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalContentBody');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `<div style="text-align: center; padding: 3rem;">Loading complaint & Officer Assistant...</div>`;
    modal.classList.add('active');

    try {
        // Fetch detail and officer assist in parallel
        const [detailRes, officerRes] = await Promise.all([
            fetch(`/api/grievances/${id}`),
            fetch(`/api/officer_assist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ complaint_id: id })
            })
        ]);

        const detail = await detailRes.json();
        const officer = await officerRes.json();

        renderModalDetails(detail, officer);
    } catch (e) {
        modalBody.innerHTML = `<div style="color: #f87171;">Error loading modal details: ${e.message}</div>`;
    }
}

function renderModalDetails(detail, officer) {
    const modalBody = document.getElementById('modalContentBody');
    if (!modalBody) return;

    const imageHTML = detail.image_url 
        ? `<div style="margin-top: 1rem;"><img src="${detail.image_url}" alt="Complaint Image" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 1px solid var(--border-color);" /></div>`
        : `<div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">No image uploaded.</div>`;

    const actionsHTML = (officer.actions || []).map(a => `<span class="action-chip">⚙️ ${a}</span>`).join('');
    const checklistHTML = (officer.evidence_checklist || []).map(c => `<div class="checklist-item"><span>📋</span> ${escapeHtml(c)}</div>`).join('');

    const html = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <div>
                <h3 style="font-size: 1.3rem; margin-bottom: 0.3rem;">Ticket ${detail.ticket_id}</h3>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Location: ${escapeHtml(detail.location)} | Lang: ${detail.language}</div>
            </div>
            <div>
                <span class="priority-badge priority-${detail.priority}">${detail.priority}</span>
            </div>
        </div>

        <div class="ai-box">
            <div class="ai-box-title">Citizen Original Grievance Text</div>
            <div class="ai-box-text">${escapeHtml(detail.text)}</div>
            ${imageHTML}
        </div>

        <div class="ai-detail-row">
            <div class="ai-field">
                <div class="ai-field-label">Category</div>
                <div class="ai-field-value">${detail.category}</div>
            </div>
            <div class="ai-field">
                <div class="ai-field-label">Assigned Department</div>
                <div class="ai-field-value">${detail.department}</div>
            </div>
        </div>

        <!-- Officer Assistant Section -->
        <div class="officer-assistant-card">
            <div class="officer-card-header">
                <span>🤖</span> OFFICER ASSISTANT RECOMMENDATIONS
            </div>

            <div style="margin-bottom: 1rem;">
                <div class="form-label" style="color: var(--accent);">Suggested Actions:</div>
                <div class="action-chips">
                    ${actionsHTML}
                </div>
            </div>

            <div style="margin-bottom: 1rem;">
                <div class="form-label" style="color: var(--accent);">Evidence Checklist Required:</div>
                ${checklistHTML}
            </div>

            <div style="margin-bottom: 1rem;">
                <div class="form-label" style="color: var(--accent);">Recommended Officer/Unit:</div>
                <div style="font-weight: 600; color: #fff;">${escapeHtml(officer.recommended_officer)}</div>
            </div>

            <div class="ai-box" style="margin-bottom: 1rem; background: rgba(0,0,0,0.3);">
                <div class="ai-box-title">Draft Response Message (Copy & Send):</div>
                <div class="ai-box-text" style="font-style: italic;">"${escapeHtml(officer.draft_message)}"</div>
            </div>

            <div style="font-size: 0.82rem; color: var(--text-muted);">
                💡 <strong>Explanation:</strong> ${escapeHtml(officer.explanation)}
            </div>
        </div>

        <!-- Status Action Bar -->
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <div>
                <span style="font-size: 0.85rem; color: var(--text-muted);">Current Status:</span>
                <span class="status-badge" style="margin-left: 0.5rem;">${detail.status}</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn-action" onclick="updateStatus(${detail.id}, 'In Progress')">Set In Progress</button>
                <button class="btn-action" style="background: rgba(16, 185, 129, 0.2); color: #34d399;" onclick="updateStatus(${detail.id}, 'Resolved')">Mark Resolved</button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
}

async function updateStatus(id, newStatus) {
    try {
        const res = await fetch(`/api/grievances/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error('Status update failed');
        
        closeModal();
        await loadDashboardData();
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
}
