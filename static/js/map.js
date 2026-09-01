// Lightweight Hotspot Visualizer Logic

async function fetchAndRenderHotspots() {
    const mapElement = document.getElementById('hotspotMap');
    const listElement = document.getElementById('hotspotList');
    if (!mapElement || !listElement) return;

    try {
        const res = await fetch('/api/hotspots');
        const hotspots = await res.json();

        if (!hotspots || hotspots.length === 0) {
            listElement.innerHTML = `<div style="color: var(--text-muted); padding: 1rem;">No hotspot clusters detected.</div>`;
            return;
        }

        // Render Hotspots List
        let listHTML = '';
        hotspots.forEach(h => {
            const categoriesText = Object.entries(h.categories || {})
                .map(([cat, count]) => `${count} ${cat}`)
                .join(', ');

            listHTML += `
                <div class="hotspot-list-item">
                    <div>
                        <div style="font-weight: 700; color: #fff;">${escapeHtml(h.name)}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${categoriesText}</div>
                    </div>
                    <div style="text-align: right;">
                        <span class="priority-badge priority-${h.highest_priority}">${h.highest_priority}</span>
                        <div style="font-size: 0.85rem; font-weight: 700; margin-top: 0.2rem; color: var(--accent);">
                            ${h.complaint_count} Complaints
                        </div>
                    </div>
                </div>
            `;
        });
        listElement.innerHTML = listHTML;

        // Visual Map Representation (Canvas / Lightweight SVG radar visualization)
        renderVisualMap(mapElement, hotspots);

    } catch (e) {
        console.error("Error fetching hotspots:", e);
    }
}

function renderVisualMap(container, hotspots) {
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 350;

    let svgHTML = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.15"/>
                    <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
                </radialGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <!-- Background Grid -->
            <rect width="100%" height="100%" fill="#0b0f19" />
            <rect width="100%" height="100%" fill="url(#gridGlow)" />
            
            <g stroke="rgba(255, 255, 255, 0.05)" stroke-width="1">
                ${Array.from({length: 10}).map((_, i) => `<line x1="0" y1="${i * 40}" x2="${width}" y2="${i * 40}" />`).join('')}
                ${Array.from({length: 15}).map((_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="${height}" />`).join('')}
            </g>
    `;

    // Plot hotspot nodes across SVG grid
    const positions = [
        { x: width * 0.25, y: height * 0.35 },
        { x: width * 0.65, y: height * 0.25 },
        { x: width * 0.45, y: height * 0.70 },
        { x: width * 0.80, y: height * 0.60 },
        { x: width * 0.15, y: height * 0.75 }
    ];

    hotspots.forEach((h, idx) => {
        const pos = positions[idx % positions.length];
        const radius = Math.min(25 + (h.complaint_count * 3), 55);
        let color = '#34d399';
        if (h.highest_priority === 'CRITICAL') color = '#ef4444';
        else if (h.highest_priority === 'HIGH') color = '#f59e0b';
        else if (h.highest_priority === 'MEDIUM') color = '#3b82f6';

        svgHTML += `
            <g filter="url(#glow)">
                <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2">
                    <animate attributeName="r" values="${radius};${radius + 8};${radius}" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.25;0.1;0.25" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="${pos.x}" cy="${pos.y}" r="6" fill="${color}" />
                <text x="${pos.x}" y="${pos.y - radius - 8}" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle" font-family="Outfit, sans-serif">
                    ${escapeHtml(h.name)} (${h.complaint_count})
                </text>
            </g>
        `;
    });

    svgHTML += `</svg>`;
    container.innerHTML = svgHTML;
}
