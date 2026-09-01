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

            <div style="margin-top:1.25rem;font-size:0.8rem;color:var(--text-muted);text-align:right;">
                ${t('ai_ticket')}: <strong>${data.ticket_id}</strong> | ${t('ai_status')}: <span class="status-badge">${data.status}</span>
            </div>
        </div>
    `;

    aiResultSection.innerHTML = html;
    aiResultSection.scrollIntoView({ behavior: 'smooth' });
}

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
