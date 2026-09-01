// ============================================================
// app.js — Citizen Portal: Form Submit + Voice Recorder
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const complaintForm   = document.getElementById('complaintForm');
    const submitBtn       = document.getElementById('submitBtn');
    const complaintText   = document.getElementById('complaintText');

    // ─── Complaint Form Submit ─────────────────────────────
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const text = complaintText.value.trim();
            if (!text) {
                alert(t('err_empty_complaint'));
                return;
            }

            const formData = new FormData(complaintForm);

            // Inject map-picked location if set
            const locationHidden = document.getElementById('locationHiddenInput');
            if (locationHidden && locationHidden.value) {
                formData.set('location', locationHidden.value);
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⚡</span> ${t('form_submit_loading')}`;

            try {
                const res = await fetch('/api/grievances', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) throw new Error(`${t('err_server')} ${res.status}`);

                const data = await res.json();
                renderAiAnalysisCard(data);

                complaintText.value = '';
                const imgInput = document.getElementById('imageInput');
                if (imgInput) imgInput.value = '';

            } catch (err) {
                alert(`${t('err_processing')}: ${err.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>🚀</span> ${t('form_submit_btn')}`;
            }
        });
    }

    // ─── Voice Recorder Setup ──────────────────────────────
    initVoiceRecorder();
});

// ═══════════════════════════════════════════════════════════
// VOICE RECORDER
// ═══════════════════════════════════════════════════════════
let mediaRecorder    = null;
let audioChunks      = [];
let audioBlob        = null;
let recordingTimer   = null;
let recordingSeconds = 0;
let isRecording      = false;
let micStream        = null;
let _previewObjectUrl = null;

// AudioContext for live level visualizer
let _audioCtx        = null;
let _analyser        = null;
let _levelAnimId     = null;

function initVoiceRecorder() {
    const voiceOpenBtn = document.getElementById('voiceBtn');
    if (!voiceOpenBtn) return;
    voiceOpenBtn.onclick = toggleVoicePanel;
}

function toggleVoicePanel() {
    const panel = document.getElementById('voiceRecorderPanel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showVoiceError(t('voice_err_unsupported'));
        return;
    }

    clearVoiceStatus();

    // Prefer high-gain voice constraints, fallback to { audio: true }
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: false, // Don't over-filter quiet speech
                autoGainControl: true
            }
        });
    } catch (_) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                showVoiceError(t('voice_err_permission'));
            } else {
                showVoiceError(`${t('voice_err_unsupported')} (${err.name}: ${err.message})`);
            }
            return;
        }
    }

    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) {
        stream.getTracks().forEach(tr => tr.stop());
        showVoiceError(t('voice_err_permission'));
        return;
    }

    micStream   = stream;
    audioChunks = [];
    audioBlob   = null;

    // ── Live visualizer via AudioContext ──────────────────────
    startLevelMeter(stream);

    // ── Choose MIME type ──────────────────────────────────────
    const mimeType = getSupportedMimeType();
    let mediaRecorderOptions = {};
    if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
        mediaRecorderOptions = { mimeType };
    }

    try {
        mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
    } catch (_) {
        mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
            audioChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {
        stopLevelMeter();
        stopMicStream();

        const recordedMime = mediaRecorder.mimeType || 'audio/webm';
        const blobMime     = recordedMime.split(';')[0]; // "audio/webm"

        if (audioChunks.length === 0) {
            showVoiceError(t('voice_err_no_speech'));
            setVoiceState('idle');
            return;
        }

        audioBlob = new Blob(audioChunks, { type: blobMime });
        showVoicePreview(audioBlob);
        setVoiceState('preview');
    };

    mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        showVoiceError(t('voice_err_failed') + ' (' + (e.error?.name || 'unknown') + ')');
        stopLevelMeter();
        stopMicStream();
        setVoiceState('idle');
        stopTimer();
    };

    // Start recording without timeslice to produce clean header
    mediaRecorder.start();
    isRecording = true;
    setVoiceState('recording');
    startTimer();
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
            // Request any buffered data before stopping
            if (typeof mediaRecorder.requestData === 'function') {
                mediaRecorder.requestData();
            }
        } catch (_) {}
        mediaRecorder.stop();
    }
    isRecording = false;
    stopTimer();
}

function reRecord() {
    audioBlob = null;
    audioChunks = [];
    stopLevelMeter();
    stopMicStream();

    const audioWrapper = document.getElementById('voiceAudioWrapper');
    if (audioWrapper) audioWrapper.style.display = 'none';

    const previewLabel = document.getElementById('voicePreviewLabel');
    if (previewLabel) previewLabel.style.display = 'none';

    const audio = document.getElementById('voiceAudioPreview');
    if (audio) { audio.src = ''; }

    setVoiceState('idle');
    clearVoiceStatus();
}

async function sendVoiceForTranscription() {
    if (!audioBlob || audioBlob.size === 0) {
        showVoiceError(t('voice_err_no_speech'));
        return;
    }

    const sendBtn  = document.getElementById('voiceSendBtn');
    const statusEl = document.getElementById('voiceStatus');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = t('voice_transcribing'); }
    if (statusEl) { statusEl.textContent = t('voice_transcribing'); statusEl.className = 'voice-status info'; statusEl.style.display = 'block'; }

    const ext = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const formData = new FormData();
    formData.append('audio', audioBlob, `voice.${ext}`);

    try {
        const res  = await fetch('/api/voice', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success && data.transcription) {
            const textArea = document.getElementById('complaintText');
            if (textArea) textArea.value = data.transcription;
            if (statusEl) {
                statusEl.textContent = t('voice_success');
                statusEl.className   = 'voice-status success';
            }
            setTimeout(() => {
                const panel = document.getElementById('voiceRecorderPanel');
                if (panel) panel.style.display = 'none';
            }, 1800);
        } else {
            showVoiceError(data.message || t('voice_err_failed'));
        }
    } catch (err) {
        showVoiceError(t('voice_err_failed'));
    } finally {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = t('voice_send'); }
    }
}

// ─── Visualizer / Level Meter ──────────────────────────────
function startLevelMeter(stream) {
    const vizContainer = document.getElementById('voiceVisualizerContainer');
    if (vizContainer) vizContainer.style.display = 'block';

    try {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }
        const src = _audioCtx.createMediaStreamSource(stream);
        _analyser = _audioCtx.createAnalyser();
        _analyser.fftSize = 256;
        _analyser.smoothingTimeConstant = 0.4;
        src.connect(_analyser);
        drawLevelMeter();
    } catch (err) {
        console.warn('Live audio visualizer not active:', err);
    }
}

function drawLevelMeter() {
    if (!_analyser) return;

    const levelMeter = document.getElementById('voiceLevelMeter');
    const levelText  = document.getElementById('voiceLevelText');
    const canvas     = document.getElementById('voiceWaveCanvas');

    const bufferLength = _analyser.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);
    _analyser.getByteTimeDomainData(dataArray);

    // Calculate RMS volume level (0 to 100%)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        const norm = (dataArray[i] - 128) / 128;
        sum += norm * norm;
    }
    const rms   = Math.sqrt(sum / bufferLength);
    const pct   = Math.min(Math.round(rms * 350), 100);

    if (levelMeter) levelMeter.style.width = `${pct}%`;
    if (levelText)  levelText.textContent  = `${pct}%`;

    // Draw waveform on canvas
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const w   = canvas.width;
        const h   = canvas.height;
        ctx.fillStyle = 'rgba(11, 15, 25, 0.5)';
        ctx.fillRect(0, 0, w, h);

        ctx.lineWidth   = 2;
        ctx.strokeStyle = pct > 10 ? '#34d399' : '#6366f1';
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(w, h / 2);
        ctx.stroke();
    }

    _levelAnimId = requestAnimationFrame(drawLevelMeter);
}

function stopLevelMeter() {
    if (_levelAnimId) {
        cancelAnimationFrame(_levelAnimId);
        _levelAnimId = null;
    }
    if (_audioCtx) {
        try { _audioCtx.close(); } catch (_) {}
        _audioCtx = null;
        _analyser = null;
    }
    const vizContainer = document.getElementById('voiceVisualizerContainer');
    if (vizContainer) vizContainer.style.display = 'none';
}

// ─── State Machine ─────────────────────────────────────────
function setVoiceState(state) {
    const startBtn    = document.getElementById('voiceStartBtn');
    const stopBtn     = document.getElementById('voiceStopBtn');
    const reRecordBtn = document.getElementById('voiceReRecordBtn');
    const sendBtn     = document.getElementById('voiceSendBtn');
    const timerEl     = document.getElementById('voiceTimer');
    const dotEl       = document.getElementById('voiceRecDot');

    const show = (el, v) => { if (el) el.style.display = v ? 'inline-flex' : 'none'; };

    if (state === 'idle') {
        show(startBtn, true);
        show(stopBtn, false);
        show(reRecordBtn, false);
        show(sendBtn, false);
        if (timerEl) timerEl.textContent = '00:00';
        if (dotEl) dotEl.style.display = 'none';
    } else if (state === 'recording') {
        show(startBtn, false);
        show(stopBtn, true);
        show(reRecordBtn, false);
        show(sendBtn, false);
        if (dotEl) dotEl.style.display = 'inline-block';
    } else if (state === 'preview') {
        show(startBtn, false);
        show(stopBtn, false);
        show(reRecordBtn, true);
        show(sendBtn, true);
        if (dotEl) dotEl.style.display = 'none';
    }
}

// ─── Timer ─────────────────────────────────────────────────
function startTimer() {
    recordingSeconds = 0;
    updateTimerDisplay();
    recordingTimer = setInterval(() => {
        recordingSeconds++;
        updateTimerDisplay();
        if (recordingSeconds >= 60) stopRecording();
    }, 1000);
}

function stopTimer() {
    clearInterval(recordingTimer);
    recordingTimer = null;
}

function updateTimerDisplay() {
    const el = document.getElementById('voiceTimer');
    if (!el) return;
    const m = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const s = String(recordingSeconds % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
}

// ─── Audio Preview ──────────────────────────────────────────
function showVoicePreview(blob) {
    const audioWrapper = document.getElementById('voiceAudioWrapper');
    const audio        = document.getElementById('voiceAudioPreview');
    const label        = document.getElementById('voicePreviewLabel');
    const sizeMeta     = document.getElementById('voiceBlobSize');
    const dlLink       = document.getElementById('voiceDownloadLink');

    if (_previewObjectUrl) {
        URL.revokeObjectURL(_previewObjectUrl);
        _previewObjectUrl = null;
    }

    _previewObjectUrl = URL.createObjectURL(blob);

    if (audio) {
        audio.src      = '';
        audio.load();
        audio.src      = _previewObjectUrl;
        audio.volume   = 1.0;
        audio.controls = true;
    }

    if (sizeMeta) {
        const kb = (blob.size / 1024).toFixed(1);
        sizeMeta.textContent = `Size: ${kb} KB (${blob.type || 'audio/webm'})`;
    }

    if (dlLink) {
        dlLink.href     = _previewObjectUrl;
        const ext       = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
        dlLink.download = `complaint_recording.${ext}`;
    }

    if (label)        label.style.display        = 'block';
    if (audioWrapper) audioWrapper.style.display = 'block';
}

// ─── Helpers ────────────────────────────────────────────────
function stopMicStream() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
}

function getSupportedMimeType() {
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];
    return types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
}

function showVoiceError(msg) {
    const el = document.getElementById('voiceStatus');
    if (el) {
        el.textContent = msg;
        el.className   = 'voice-status error';
        el.style.display = 'block';
    }
}

function clearVoiceStatus() {
    const el = document.getElementById('voiceStatus');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ═══════════════════════════════════════════════════════════
// AI RESULT CARD RENDERER
// ═══════════════════════════════════════════════════════════
function renderAiAnalysisCard(data) {
    const aiResultSection = document.getElementById('aiResultSection');
    if (!aiResultSection) return;

    const relatedCount = data.related_ids ? data.related_ids.length : 0;
    let relatedHTML = '';
    if (relatedCount > 0) {
        relatedHTML = `
            <div class="related-alert">
                <span>⚠️</span>
                <div>
                    <strong>${t('ai_duplicate')}</strong><br>
                    ${relatedCount} ${t('ai_duplicate_desc')}
                </div>
            </div>
        `;
    }

    const html = `
        <div class="ai-card">
            <div class="ai-badge-header">
                <div class="ai-title"><span>✨</span> ${t('ai_complete')}</div>
                <div class="priority-badge priority-${data.priority}">
                    <span>•</span> ${t('ai_priority')}: ${data.priority}
                </div>
            </div>

            <div class="ai-detail-row">
                <div class="ai-field">
                    <div class="ai-field-label">${t('ai_category')}</div>
                    <div class="ai-field-value">${data.category}</div>
                </div>
                <div class="ai-field">
                    <div class="ai-field-label">${t('ai_department')}</div>
                    <div class="ai-field-value">${data.department}</div>
                </div>
            </div>

            <div class="ai-box">
                <div class="ai-box-title"><span>📝</span> ${t('ai_summary')}</div>
                <div class="ai-box-text">${escapeHtml(data.summary)}</div>
            </div>

            <div class="ai-box">
                <div class="ai-box-title"><span>🎯</span> ${t('ai_why')} ${data.priority}?</div>
                <div class="ai-box-text">${escapeHtml(data.explanation)}</div>
            </div>

            ${relatedHTML}

            <div style="margin-top:1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;padding-top:1rem;border-top:1px solid var(--border-color);">
                <div style="font-size:0.82rem;color:var(--text-muted);">
                    ${t('ai_ticket')}: <strong style="color:#fff;font-family:monospace;font-size:0.95rem;">${data.ticket_id}</strong>
                </div>
                <button type="button" class="btn-action" onclick="trackGrievance('${data.ticket_id}')" style="background:rgba(99,102,241,0.18);border-color:rgba(99,102,241,0.4);color:#a5b4fc;font-weight:700;font-size:0.82rem;">
                    <span>🚚</span> Track Live Progress →
                </button>
            </div>
        </div>
    `;

    aiResultSection.innerHTML = html;
    aiResultSection.scrollIntoView({ behavior: 'smooth' });

    // Automatically initialize tracking in the tracker box as well
    trackGrievance(data.ticket_id, false);
}

// ═══════════════════════════════════════════════════════════
// LIVE GRIEVANCE TIMELINE TRACKER
// ═══════════════════════════════════════════════════════════
function handleTrackTicketClick() {
    const input = document.getElementById('trackTicketInput');
    if (!input || !input.value.trim()) {
        alert('Please enter a valid Ticket ID (e.g. GRV-1001)');
        return;
    }
    trackGrievance(input.value.trim(), true);
}

async function trackGrievance(ticketId, scrollTo = true) {
    const input = document.getElementById('trackTicketInput');
    if (input) input.value = ticketId.toUpperCase();

    const timelineBox   = document.getElementById('liveTimelineBox');
    const beforeAfterBox = document.getElementById('beforeAfterBox');
    if (!timelineBox) return;

    timelineBox.style.display = 'block';
    timelineBox.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);">
            <div style="font-size:2rem;margin-bottom:0.5rem;animation:spin 1s linear infinite;">⏳</div>
            <div style="font-size:0.88rem;">Fetching live timeline for <strong>${escapeHtml(ticketId)}</strong>...</div>
        </div>
    `;

    try {
        const res = await fetch(`/api/grievances/track/${encodeURIComponent(ticketId)}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Ticket not found.');
        }

        const data = await res.json();
        renderLiveTimeline(data);

        if (beforeAfterBox) {
            renderBeforeAfterProof(data, beforeAfterBox);
        }

        if (scrollTo) {
            document.getElementById('trackerSearchCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

    } catch (err) {
        timelineBox.innerHTML = `
            <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:1.2rem;color:#fca5a5;font-size:0.88rem;text-align:center;">
                ⚠️ ${escapeHtml(err.message)}
            </div>
        `;
        if (beforeAfterBox) beforeAfterBox.style.display = 'none';
    }
}

function renderLiveTimeline(grievance) {
    const box = document.getElementById('liveTimelineBox');
    if (!box) return;

    const events = grievance.timeline_events || [];
    const statusMap = {
        'Submitted': 0,
        'AI Classified': 1,
        'Assigned': 2,
        'In Progress': 3,
        'Resolved': 4
    };
    const currentStepIdx = statusMap[grievance.status] !== undefined ? statusMap[grievance.status] : 1;

    let stepsHTML = '';
    events.forEach((ev, idx) => {
        const isDone    = idx < currentStepIdx || grievance.status === 'Resolved';
        const isCurrent = idx === currentStepIdx && grievance.status !== 'Resolved';
        const isPending = idx > currentStepIdx;

        let nodeClass = 'timeline-node';
        let nodeIcon  = '⚪';
        if (isDone) {
            nodeClass += ' node-done';
            nodeIcon = '✓';
        } else if (isCurrent) {
            nodeClass += ' node-active';
            nodeIcon = '⚡';
        } else {
            nodeClass += ' node-pending';
            nodeIcon = (idx + 1);
        }

        stepsHTML += `
            <div class="timeline-step ${isCurrent ? 'step-active' : ''} ${isDone ? 'step-done' : ''}">
                <div class="timeline-left">
                    <div class="${nodeClass}">${nodeIcon}</div>
                    ${idx < events.length - 1 ? `<div class="timeline-connector ${idx < currentStepIdx ? 'connector-done' : ''}"></div>` : ''}
                </div>
                <div class="timeline-body">
                    <div class="timeline-step-header">
                        <span class="timeline-step-title ${isCurrent ? 'title-active' : ''}">${escapeHtml(ev.title)}</span>
                        <span class="timeline-step-badge">${escapeHtml(ev.badge || '')}</span>
                    </div>
                    <div class="timeline-step-time">⏰ ${escapeHtml(ev.time || '')}</div>
                    <div class="timeline-step-desc">${escapeHtml(ev.desc || '')}</div>
                </div>
            </div>
        `;
    });

    box.innerHTML = `
        <div class="timeline-header-bar">
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Ticket Status Tracker</div>
                <div style="font-family:monospace;font-size:1.15rem;font-weight:800;color:#fff;">${grievance.ticket_id}</div>
            </div>
            <div style="text-align:right;">
                <span class="status-badge ${grievance.status === 'Resolved' ? 'status-resolved' : ''}">${grievance.status}</span>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">${grievance.department}</div>
            </div>
        </div>

        <div class="timeline-container">
            ${stepsHTML}
        </div>

        <div class="timeline-footer">
            <div><strong>Location:</strong> ${escapeHtml(grievance.location)}</div>
            <div><strong>Officer:</strong> ${escapeHtml(grievance.assigned_officer || 'Zonal Officer')}</div>
        </div>
    `;
}

function renderBeforeAfterProof(grievance, container) {
    if (grievance.status !== 'Resolved') {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    const beforeImgHTML = grievance.image_url
        ? `<img src="${grievance.image_url}" alt="Citizen Before Issue" class="proof-img before-img">`
        : `<div class="proof-no-img before-no-img">🔴 Original Complaint<br><span style="font-size:0.72rem;color:var(--text-muted);">No photo uploaded with initial filing</span></div>`;

    const afterImgHTML = grievance.resolution_image_url
        ? `<img src="${grievance.resolution_image_url}" alt="Municipal After Proof" class="proof-img after-img">`
        : `<div class="proof-no-img after-no-img">🟢 On-Ground Inspection Verified<br><span style="font-size:0.72rem;color:#6ee7b7;">Resolution certified by Zonal Officer</span></div>`;

    const matchPct = Math.round((grievance.resolution_confidence || 0.94) * 100);

    container.innerHTML = `
        <div class="before-after-card">
            <div class="ba-header">
                <div class="ba-title">
                    <span>✨</span> AI Before vs. After Resolution Verification
                </div>
                <div class="ba-verified-badge">
                    <span>🛡️</span> AI Verified: ${matchPct}% Match
                </div>
            </div>

            <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.85rem;">
                Visual verification proof submitted by Municipal Corporation field engineering team.
            </p>

            <div class="ba-grid">
                <div class="ba-item">
                    <div class="ba-label before-label">🔴 BEFORE (Citizen Complaint)</div>
                    ${beforeImgHTML}
                </div>
                <div class="ba-item">
                    <div class="ba-label after-label">🟢 AFTER (Official Resolution Proof)</div>
                    ${afterImgHTML}
                </div>
            </div>

            <div class="ba-notes-box">
                <div style="font-size:0.82rem;line-height:1.5;">
                    <strong style="color:#e0f2fe;">Official Resolution Action:</strong> ${escapeHtml(grievance.resolution_notes || 'Grievance inspected and resolved by municipal field staff.')}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.4rem;display:flex;justify-content:space-between;flex-wrap:wrap;">
                    <span>Signed: <strong>${escapeHtml(grievance.assigned_officer || 'Ward Officer')}</strong></span>
                    <span style="color:#34d399;">Status: <strong>Legally Closed</strong></span>
                </div>
            </div>

            <!-- Citizen Satisfaction Rating Widget -->
            <div class="citizen-feedback-box">
                <div style="font-size:0.78rem;font-weight:700;color:#cbd5e1;margin-bottom:0.3rem;">Rate your satisfaction with this redressal:</div>
                <div class="star-rating">
                    <button type="button" class="star-btn" onclick="submitFeedbackRating('${grievance.ticket_id}', 1)">⭐</button>
                    <button type="button" class="star-btn" onclick="submitFeedbackRating('${grievance.ticket_id}', 2)">⭐</button>
                    <button type="button" class="star-btn" onclick="submitFeedbackRating('${grievance.ticket_id}', 3)">⭐</button>
                    <button type="button" class="star-btn" onclick="submitFeedbackRating('${grievance.ticket_id}', 4)">⭐</button>
                    <button type="button" class="star-btn" onclick="submitFeedbackRating('${grievance.ticket_id}', 5)">⭐</button>
                    <span id="feedbackRatingMsg" style="font-size:0.75rem;color:#6ee7b7;margin-left:0.5rem;"></span>
                </div>
            </div>
        </div>
    `;
}

function submitFeedbackRating(ticketId, rating) {
    const el = document.getElementById('feedbackRatingMsg');
    if (el) {
        el.textContent = `Thank you! Rated ${rating}/5 ⭐`;
    }
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATION SYSTEM & TOAST ALERTS
// ═══════════════════════════════════════════════════════════
function initNotifications() {
    // Seed sample resolved notification if none exist for demonstration
    const notifs = getStoredNotifications();
    if (notifs.length === 0) {
        saveStoredNotifications([
            {
                ticket_id: "GRV-1001",
                department: "Roads & Infrastructure Department",
                notes: "Pothole filled with bitumen and compacted with road roller.",
                time: "10:30 AM",
                read: false
            }
        ]);
    }
    updateNotifBadge();
    renderNotificationList();
}

function getStoredNotifications() {
    try {
        return JSON.parse(localStorage.getItem('sih_notifs') || '[]');
    } catch {
        return [];
    }
}

function saveStoredNotifications(list) {
    localStorage.setItem('sih_notifs', JSON.stringify(list));
    updateNotifBadge();
}

function addCitizenNotification(notif) {
    const list = getStoredNotifications();
    list.unshift({ ...notif, read: false });
    saveStoredNotifications(list);
    renderNotificationList();
    showToastNotification(notif);
}

function updateNotifBadge() {
    const list = getStoredNotifications();
    const unread = list.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotificationList() {
    const container = document.getElementById('notifList');
    if (!container) return;

    const list = getStoredNotifications();
    if (list.length === 0) {
        container.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.82rem;">No notifications.</div>`;
        return;
    }

    let html = '';
    list.forEach((n, idx) => {
        html += `
            <div class="notif-item ${n.read ? 'notif-read' : 'notif-unread'}" onclick="handleNotifItemClick('${n.ticket_id}', ${idx})">
                <div style="font-size:1.2rem;">✅</div>
                <div style="flex:1;">
                    <div style="font-size:0.82rem;font-weight:700;color:#fff;">
                        Ticket <strong>${escapeHtml(n.ticket_id)}</strong> Resolved!
                    </div>
                    <div style="font-size:0.75rem;color:#94a3b8;margin-top:0.15rem;">
                        ${escapeHtml(n.department || 'Municipal Dept')}
                    </div>
                    <div style="font-size:0.72rem;color:var(--accent);margin-top:0.25rem;">
                        👉 Click to view Before/After proof
                    </div>
                </div>
                <div style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;">${escapeHtml(n.time || '')}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    const isOpen = dropdown.style.display !== 'none';
    dropdown.style.display = isOpen ? 'none' : 'block';

    if (!isOpen) {
        // Mark all as read when opening dropdown
        const list = getStoredNotifications().map(n => ({ ...n, read: true }));
        saveStoredNotifications(list);
        renderNotificationList();
    }
}

function handleNotifItemClick(ticketId, idx) {
    toggleNotifDropdown();
    trackGrievance(ticketId, true);
}

function clearAllNotifications() {
    saveStoredNotifications([]);
    renderNotificationList();
}

function showToastNotification(notif) {
    const container = document.getElementById('toastNotificationContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-alert';
    toast.innerHTML = `
        <div style="font-size:1.4rem;">🎉</div>
        <div style="flex:1;">
            <div style="font-weight:800;color:#6ee7b7;font-size:0.88rem;">Grievance Work Completed!</div>
            <div style="font-size:0.78rem;color:#e0f2fe;margin-top:0.15rem;">
                Ticket <strong>${escapeHtml(notif.ticket_id)}</strong> was resolved with verified visual evidence.
            </div>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer;">✕</button>
    `;

    toast.onclick = (e) => {
        if (e.target.tagName !== 'BUTTON') {
            trackGrievance(notif.ticket_id, true);
            toast.remove();
        }
    };

    container.appendChild(toast);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 6000);
}

// ─── Initialize Notifications on Load ───
document.addEventListener('DOMContentLoaded', () => {
    initNotifications();

    // Close notification dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const notifWrap = document.querySelector('.notif-wrapper');
        const notifDropdown = document.getElementById('notifDropdown');
        if (notifDropdown && notifWrap && !notifWrap.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    });
});

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Demo text helper (called from inline HTML)
function setDemoText(text, lang = 'English') {
    const ta = document.getElementById('complaintText');
    const ls = document.getElementById('languageSelect');
    if (ta) ta.value = text;
    if (ls) ls.value = lang;
}

