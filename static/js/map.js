// ============================================================
// map.js — Real GIS Hotspot Map Visualizer (Leaflet.js)
// Replaces abstract radar grid with an interactive real city map
// ============================================================

let hotspotLeafletMap = null;
let hotspotMarkersLayer = null;
let hotspotCirclesLayer = null;
let hotspotDataMap = {};

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
                <div class="hotspot-list-item" onclick="focusHotspotOnMap(${h.latitude}, ${h.longitude}, '${escapeHtml(h.name)}')" style="cursor: pointer; transition: all 0.2s;" title="Click to zoom on real map">
                    <div>
                        <div style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.4rem;">
                            <span>📍</span> ${escapeHtml(h.name)}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">${categoriesText}</div>
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

        // Render Real Interactive GIS Map
        renderRealGISMap(mapElement, hotspots);

    } catch (e) {
        console.error("Error fetching hotspots:", e);
    }
}

function renderRealGISMap(container, hotspots) {
    if (typeof L === 'undefined') {
        container.innerHTML = '<div style="color:#fca5a5;padding:2rem;text-align:center;">Leaflet.js map library not loaded.</div>';
        return;
    }

    if (!hotspotLeafletMap) {
        container.innerHTML = '';
        hotspotLeafletMap = L.map(container, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([19.0760, 72.8777], 13);

        // Standard OpenStreetMap Map Tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(hotspotLeafletMap);

        hotspotMarkersLayer = L.layerGroup().addTo(hotspotLeafletMap);
        hotspotCirclesLayer = L.layerGroup().addTo(hotspotLeafletMap);
    } else {
        hotspotMarkersLayer.clearLayers();
        hotspotCirclesLayer.clearLayers();
    }

    const bounds = [];
    hotspotDataMap = {};

    hotspots.forEach(h => {
        const lat = parseFloat(h.latitude) || 19.0760;
        const lng = parseFloat(h.longitude) || 72.8777;
        bounds.push([lat, lng]);

        let color = '#10b981';
        let badgeBg = '#059669';
        if (h.highest_priority === 'CRITICAL') {
            color = '#ef4444';
            badgeBg = '#dc2626';
        } else if (h.highest_priority === 'HIGH') {
            color = '#f59e0b';
            badgeBg = '#d97706';
        } else if (h.highest_priority === 'MEDIUM') {
            color = '#3b82f6';
            badgeBg = '#2563eb';
        }

        // 1. Pulsing Heatmap Circle Area
        const radius = Math.min(150 + (h.complaint_count * 60), 700);
        L.circle([lat, lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.22,
            weight: 2,
            radius: radius
        }).addTo(hotspotCirclesLayer);

        // 2. Custom Glowing Map Marker Pin with Count Badge
        const customIcon = L.divIcon({
            className: 'custom-gis-marker',
            html: `
                <div class="gis-marker-pin" style="border-color:${color};box-shadow:0 0 14px ${color};">
                    <span class="gis-marker-count" style="background:${badgeBg};">${h.complaint_count}</span>
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -18]
        });

        // 3. Category Breakdown HTML for Popup
        const catPills = Object.entries(h.categories || {})
            .map(([cat, cnt]) => `<span style="background:rgba(15,23,42,0.08);border:1px solid rgba(15,23,42,0.15);padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;margin-right:0.3rem;display:inline-block;margin-bottom:0.25rem;"><strong>${cnt}</strong> ${escapeHtml(cat)}</span>`)
            .join(' ');

        const popupContent = `
            <div style="min-width:230px;padding:0.3rem;font-family:'Plus Jakarta Sans',sans-serif;">
                <div style="font-size:0.95rem;font-weight:800;color:#0f172a;margin-bottom:0.3rem;">📍 ${escapeHtml(h.name)}</div>
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                    <span style="background:${color};color:#fff;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.72rem;font-weight:800;">${h.highest_priority}</span>
                    <span style="font-size:0.8rem;font-weight:800;color:#0f172a;">${h.complaint_count} Active Complaints</span>
                </div>
                <div style="margin-bottom:0.6rem;">${catPills}</div>
                <button onclick="filterDashboardByLocation('${escapeHtml(h.name)}')" style="width:100%;padding:0.45rem;background:#0f172a;color:#67e8f9;border:none;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;">
                    🔍 Filter Grievances in Table
                </button>
            </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon })
            .addTo(hotspotMarkersLayer)
            .bindPopup(popupContent);

        hotspotDataMap[h.name] = { marker, lat, lng };
    });

    if (bounds.length > 0) {
        hotspotLeafletMap.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }

    setTimeout(() => {
        if (hotspotLeafletMap) hotspotLeafletMap.invalidateSize();
    }, 250);
}

function focusHotspotOnMap(lat, lng, name) {
    if (!hotspotLeafletMap) return;
    hotspotLeafletMap.setView([lat, lng], 15, { animate: true });
    if (hotspotDataMap[name] && hotspotDataMap[name].marker) {
        hotspotDataMap[name].marker.openPopup();
    }
}

function filterDashboardByLocation(locationName) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = locationName;
        if (typeof fetchAndRenderGrievances === 'function') {
            fetchAndRenderGrievances();
        }
        document.getElementById('grievanceTableBody')?.scrollIntoView({ behavior: 'smooth' });
    }
}
