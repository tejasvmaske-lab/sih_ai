// ============================================================
// location_picker.js — Interactive Map Location Picker
// Uses Leaflet.js (loaded via CDN in index.html)
// ============================================================

let pickerMap = null;
let pickerMarker = null;
let selectedLocation = { lat: null, lng: null, address: '' };

// ─── Open Map Modal ─────────────────────────────────────────
function openMapPicker() {
  const modal = document.getElementById('mapPickerModal');
  if (!modal) return;
  modal.classList.add('active');

  // Init map after modal is visible (requires DOM dimensions)
  setTimeout(() => initPickerMap(), 100);
}

function closeMapPicker() {
  const modal = document.getElementById('mapPickerModal');
  if (modal) modal.classList.remove('active');
}

// ─── Initialize Leaflet Map ─────────────────────────────────
function initPickerMap() {
  const container = document.getElementById('leafletPickerMap');
  if (!container) return;

  // Default center: India
  const defaultLat = 20.5937;
  const defaultLng = 78.9629;
  const defaultZoom = 5;

  if (pickerMap) {
    pickerMap.invalidateSize();
    return;
  }

  pickerMap = L.map('leafletPickerMap', {
    center: [defaultLat, defaultLng],
    zoom: defaultZoom,
    zoomControl: true,
  });

  // OpenStreetMap tiles (free, no API key)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(pickerMap);

  // Custom marker icon
  const markerIcon = L.divIcon({
    html: `<div style="
      width: 34px; height: 34px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(99,102,241,0.6);
    "></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    className: ''
  });

  // Click on map to place marker
  pickerMap.on('click', (e) => {
    placeMarker(e.latlng.lat, e.latlng.lng, markerIcon);
  });

  // If a location was previously selected, restore it
  if (selectedLocation.lat) {
    const latlng = [selectedLocation.lat, selectedLocation.lng];
    placeMarker(selectedLocation.lat, selectedLocation.lng, markerIcon);
    pickerMap.setView(latlng, 14);
  }
}

// ─── Place / Move Marker ────────────────────────────────────
function placeMarker(lat, lng, icon) {
  const markerIcon = icon || L.divIcon({
    html: `<div style="
      width: 34px; height: 34px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(99,102,241,0.6);
    "></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    className: ''
  });

  if (pickerMarker) {
    pickerMarker.setLatLng([lat, lng]);
  } else {
    pickerMarker = L.marker([lat, lng], {
      icon: markerIcon,
      draggable: true
    }).addTo(pickerMap);

    // Update on drag end
    pickerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      updateSelectedCoords(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    });
  }

  updateSelectedCoords(lat, lng);
  reverseGeocode(lat, lng);
}

// ─── Update coordinate display ──────────────────────────────
function updateSelectedCoords(lat, lng) {
  selectedLocation.lat = lat;
  selectedLocation.lng = lng;

  const coordEl = document.getElementById('pickerCoords');
  if (coordEl) {
    coordEl.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  const addrEl = document.getElementById('pickerAddress');
  if (addrEl) addrEl.textContent = t('map_geocoding');
}

// ─── Reverse Geocode via Nominatim (free, no API key) ────────
async function reverseGeocode(lat, lng) {
  const addrEl = document.getElementById('pickerAddress');
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    let address = data.display_name || t('map_no_address');
    
    // Format into a cleaner string if address object is available
    if (data.address) {
      const parts = [];
      if (data.address.amenity || data.address.building) parts.push(data.address.amenity || data.address.building);
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb || data.address.neighbourhood) parts.push(data.address.suburb || data.address.neighbourhood);
      if (data.address.city || data.address.town || data.address.county) parts.push(data.address.city || data.address.town || data.address.county);
      if (parts.length > 0) {
        address = parts.join(', ');
      }
    }
    
    selectedLocation.address = address;
    if (addrEl) addrEl.textContent = address;
  } catch {
    selectedLocation.address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (addrEl) addrEl.textContent = selectedLocation.address;
  }
}

// ─── Use GPS Location ────────────────────────────────────────
function useMyLocation() {
  const btn = document.getElementById('mapGpsBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '📡 Locating...';
  }

  if (!navigator.geolocation) {
    showMapError(t('map_gps_error'));
    if (btn) { btn.disabled = false; btn.textContent = t('map_use_gps'); }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      pickerMap.setView([lat, lng], 16);
      placeMarker(lat, lng);
      if (btn) { btn.disabled = false; btn.textContent = t('map_use_gps'); }
    },
    () => {
      showMapError(t('map_gps_error'));
      if (btn) { btn.disabled = false; btn.textContent = t('map_use_gps'); }
    },
    { timeout: 8000 }
  );
}

// ─── Confirm Location → fill the form ───────────────────────
function confirmLocation() {
  if (!selectedLocation.lat) {
    showMapError('Please click/tap on the map to select a location first.');
    return;
  }

  // Update the hidden location input in the form
  const locationInput = document.getElementById('locationHiddenInput');
  const locationDisplay = document.getElementById('locationDisplay');
  const locationSelectOld = document.querySelector('select[name="location"]');

  const locationStr = selectedLocation.address || `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`;

  if (locationInput) locationInput.value = locationStr;
  if (locationDisplay) {
    locationDisplay.innerHTML = `
      <span style="color:#34d399;">📍</span>
      <span style="font-size:0.85rem; color:#94a3b8; max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
            title="${locationStr}">${locationStr}</span>
      <span style="font-size:0.75rem; color:#64748b;">(${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)})</span>
    `;
  }
  // Also update old select element if it still exists
  if (locationSelectOld) {
    // Add custom option if not present
    let opt = locationSelectOld.querySelector(`option[value="${locationStr}"]`);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = locationStr;
      opt.textContent = locationStr.substring(0, 60);
      locationSelectOld.appendChild(opt);
    }
    locationSelectOld.value = locationStr;
  }

  closeMapPicker();
}

function showMapError(msg) {
  const errEl = document.getElementById('mapPickerError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    setTimeout(() => { errEl.style.display = 'none'; }, 4000);
  }
}

// ─── Close on backdrop click ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('mapPickerModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeMapPicker();
    });
  }
});
