# SIH26-S02 Demo Script (90–120 Seconds)

## Live Presentation Walkthrough

### 1. Introduction (15 Seconds)
> "Good morning judges! We present our AI-Based Citizen Grievance Platform for **SIH26-S02**. Our solution automatically classifies grievances, detects priority, routes complaints to responsible municipal departments, identifies duplicate issues, and assists officers with AI recommendation workflows."

---

### 2. Citizen Complaint Submission & AI Processing (30 Seconds)

1. Open `http://127.0.0.1:8000` on the **Citizen Portal** tab.
2. Click the quick button: **Pothole 1 (EN)**
   - Text: `"There is a large pothole near ABC College causing danger to students."`
   - Click **Submit Complaint & Process AI**.
3. **Point out the AI Analysis Card**:
   - **Category**: Roads
   - **Priority**: HIGH
   - **Department**: Roads & Infrastructure Department
   - **Why HIGH?**: *"Public safety risk or near sensitive area (danger, college, students)"*

---

### 3. Duplicate Complaint Detection (25 Seconds)

1. Click quick button: **Pothole 2 Near-Duplicate (EN)**
   - Text: `"A huge pothole has appeared outside ABC College and is dangerous."`
   - Click **Submit Complaint & Process AI**.
2. **Point out the Yellow Warning Badge**:
   - **"⚠️ Duplicate / Related Complaints Detected!"**
   - Show how the algorithm linked it to Ticket `GRV-1001` automatically without manual intervention.

---

### 4. Multilingual Grievances (Hindi & Marathi) (20 Seconds)

1. Click quick button: **Garbage (HI)**
   - Text: `"हमारे इलाके में पांच दिनों से कचरा नहीं उठाया गया।"`
   - Language: Hindi
   - Click **Submit**. Show auto-classification to **Waste Management**.
2. Click quick button: **Road Pothole (MR)**
   - Text: `"आमच्या रस्त्यावर मोठा खड्डा पडला आहे."`
   - Language: Marathi
   - Click **Submit**. Show auto-classification to **Roads**.

---

### 5. Municipal Authority Dashboard & Officer Assistant (30 Seconds)

1. Switch to the **Municipal Authority Dashboard** tab at top.
2. Highlight:
   - **Metric Cards**: Real-time counter of total complaints, pending, high priority, and related clusters.
   - **Live Hotspot Radar**: Visual geographic cluster map showing complaint density.
3. Click on the first complaint row (`GRV-1001`).
4. **Point out the Officer Assistant Card**:
   - **Suggested Actions**: `site-inspect`, `temporary-barricade`, `cluster-review`.
   - **Evidence Required**: Photo of pothole, GPS verification.
   - **Draft Response**: Automated polite citizen update ready to copy & send.
5. Click **Set In Progress** or **Mark Resolved**.

---

### 6. Conclusion (10 Seconds)
> "Our platform operates seamlessly with 100% reliability both with LLMs and using lightweight deterministic NLP fallbacks. Thank you!"
