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
let mediaRecorder = null;
let audioChunks   = [];
let audioBlob     = null;
let recordingTimer = null;
let recordingSeconds = 0;
let isRecording   = false;
let micStream     = null;

function initVoiceRecorder() {
    const voiceOpenBtn = document.getElementById('voiceBtn');
    if (!voiceOpenBtn) return;

    // Replace button to open the dedicated voice panel
    voiceOpenBtn.onclick = toggleVoicePanel;
}

function toggleVoicePanel() {
    const panel = document.getElementById('voiceRecorderPanel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showVoiceError(t('voice_err_unsupported'));
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            micStream = stream;
            audioChunks = [];
            audioBlob = null;

            // Pick best supported MIME type
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : {};

            try {
                mediaRecorder = new MediaRecorder(stream, options);
            } catch {
                mediaRecorder = new MediaRecorder(stream);
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stopMicStream();
                const type = mediaRecorder.mimeType || 'audio/webm';
                audioBlob = new Blob(audioChunks, { type });
                showVoicePreview(audioBlob);
                setVoiceState('preview');
            };

            mediaRecorder.start(200); // collect data every 200ms
            isRecording = true;
            setVoiceState('recording');
            startTimer();
        })
        .catch(err => {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                showVoiceError(t('voice_err_permission'));
            } else {
                showVoiceError(t('voice_err_unsupported'));
            }
        });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    isRecording = false;
    stopTimer();
}

function reRecord() {
    audioBlob = null;
    audioChunks = [];
    stopMicStream();

    const preview = document.getElementById('voiceAudioPreview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }

    const previewLabel = document.getElementById('voicePreviewLabel');
    if (previewLabel) previewLabel.style.display = 'none';

    const sendBtn = document.getElementById('voiceSendBtn');
    if (sendBtn) sendBtn.style.display = 'none';

    setVoiceState('idle');
    clearVoiceStatus();
}

async function sendVoiceForTranscription() {
    if (!audioBlob) {
        showVoiceError(t('voice_err_no_speech'));
        return;
    }

    const sendBtn = document.getElementById('voiceSendBtn');
    const statusEl = document.getElementById('voiceStatus');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = t('voice_transcribing'); }
    if (statusEl) { statusEl.textContent = t('voice_transcribing'); statusEl.className = 'voice-status info'; statusEl.style.display='block'; }

    const ext = audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const formData = new FormData();
    formData.append('audio', audioBlob, `voice.${ext}`);

    try {
        const res = await fetch('/api/voice', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success && data.transcription) {
            const textArea = document.getElementById('complaintText');
            if (textArea) textArea.value = data.transcription;
            if (statusEl) {
                statusEl.textContent = t('voice_success');
                statusEl.className = 'voice-status success';
            }
            // Collapse panel after a moment
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

// ─── State Machine ─────────────────────────────────────────
function setVoiceState(state) {
    const startBtn    = document.getElementById('voiceStartBtn');
    const stopBtn     = document.getElementById('voiceStopBtn');
    const reRecordBtn = document.getElementById('voiceReRecordBtn');
    const sendBtn     = document.getElementById('voiceSendBtn');
    const timerEl     = document.getElementById('voiceTimer');
    const dotEl       = document.getElementById('voiceRecDot');

    const show = (el, v) => { if(el) el.style.display = v ? 'inline-flex' : 'none'; };

    if (state === 'idle') {
        show(startBtn, true); show(stopBtn, false);
        show(reRecordBtn, false); show(sendBtn, false);
        if (timerEl) timerEl.textContent = '00:00';
        if (dotEl) dotEl.style.display = 'none';
    } else if (state === 'recording') {
        show(startBtn, false); show(stopBtn, true);
        show(reRecordBtn, false); show(sendBtn, false);
        if (dotEl) dotEl.style.display = 'inline-block';
    } else if (state === 'preview') {
        show(startBtn, false); show(stopBtn, false);
        show(reRecordBtn, true); show(sendBtn, true);
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
        // Auto stop at 60 seconds
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
    const url = URL.createObjectURL(blob);
    const audio = document.getElementById('voiceAudioPreview');
    const label = document.getElementById('voicePreviewLabel');
    if (audio) { audio.src = url; audio.style.display = 'block'; }
    if (label) label.style.display = 'block';
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
        el.className = 'voice-status error';
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
