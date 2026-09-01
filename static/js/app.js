// Citizen Portal JavaScript Logic
document.addEventListener('DOMContentLoaded', () => {
    const complaintForm = document.getElementById('complaintForm');
    const aiResultSection = document.getElementById('aiResultSection');
    const submitBtn = document.getElementById('submitBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const complaintText = document.getElementById('complaintText');

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    // Handle Form Submit
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const text = complaintText.value.trim();
            if (!text) {
                alert('Please enter a complaint description.');
                return;
            }

            const formData = new FormData(complaintForm);

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>⚡</span> AI Analyzing Complaint...`;

            try {
                const res = await fetch('/api/grievances', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    throw new Error(`Server returned ${res.status}`);
                }

                const data = await res.json();

                // Render AI Result Card
                renderAiAnalysisCard(data);

                // Clear form except default location
                complaintText.value = '';
                document.getElementById('imageInput').value = '';

            } catch (err) {
                alert('Error processing grievance: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>🚀</span> Submit Complaint & Process AI`;
            }
        });
    }

    // Handle Voice Button Recording
    if (voiceBtn) {
        voiceBtn.addEventListener('click', async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (event) => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                        const formData = new FormData();
                        formData.append('audio', audioBlob, 'voice.mp3');

                        voiceBtn.innerHTML = `<span>⏳</span> Transcribing...`;
                        try {
                            const vRes = await fetch('/api/voice', {
                                method: 'POST',
                                body: formData
                            });
                            const vData = await vRes.json();
                            if (vData.success && vData.transcription) {
                                complaintText.value = vData.transcription;
                                alert('Voice transcribed successfully!');
                            } else {
                                alert(vData.message || 'Voice transcription unconfigured. Please type text.');
                            }
                        } catch (err) {
                            alert('Voice processing failed: ' + err.message);
                        } finally {
                            voiceBtn.classList.remove('recording');
                            voiceBtn.innerHTML = `<span>🎙️</span> Voice Input`;
                        }
                    };

                    mediaRecorder.start();
                    isRecording = true;
                    voiceBtn.classList.add('recording');
                    voiceBtn.innerHTML = `<span>🔴</span> Recording... (Click to stop)`;
                } catch (e) {
                    alert('Microphone permission denied or unsupported in browser.');
                }
            } else {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                isRecording = false;
            }
        });
    }
});

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
                    <strong>Duplicate / Related Complaints Detected!</strong><br>
                    ${relatedCount} existing report(s) found describing the same issue at this location cluster.
                </div>
            </div>
        `;
    }

    const html = `
        <div class="ai-card">
            <div class="ai-badge-header">
                <div class="ai-title">
                    <span>✨</span> AI ANALYSIS COMPLETE
                </div>
                <div class="priority-badge priority-${data.priority}">
                    <span>•</span> Priority: ${data.priority}
                </div>
            </div>

            <div class="ai-detail-row">
                <div class="ai-field">
                    <div class="ai-field-label">Category</div>
                    <div class="ai-field-value">${data.category}</div>
                </div>
                <div class="ai-field">
                    <div class="ai-field-label">Routing Department</div>
                    <div class="ai-field-value">${data.department}</div>
                </div>
            </div>

            <div class="ai-box">
                <div class="ai-box-title"><span>📝</span> Issue Summary</div>
                <div class="ai-box-text">${escapeHtml(data.summary)}</div>
            </div>

            <div class="ai-box">
                <div class="ai-box-title"><span>🎯</span> Why ${data.priority}?</div>
                <div class="ai-box-text">${escapeHtml(data.explanation)}</div>
            </div>

            ${relatedHTML}

            <div style="margin-top: 1.25rem; font-size: 0.8rem; color: var(--text-muted); text-align: right;">
                Ticket Ref: <strong>${data.ticket_id}</strong> | Status: <span class="status-badge">${data.status}</span>
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
