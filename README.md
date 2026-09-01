# SIH26-S02: AI Citizen Grievance Platform

A demo-ready, production-grade prototype for **Smart India Hackathon SIH26-S02**: *AI-Based Citizen Grievance Classification, Prioritization, Duplicate Detection and Smart Routing*.

---

## 🌟 Project Purpose

Municipal grievance systems often suffer from delayed manual routing, misclassification, unprioritized emergency complaints, and massive duplicate submissions for the same localized issues. 

This platform delivers an automated, end-to-end AI pipeline that:
1. **Classifies complaints** instantly across 10 municipal categories.
2. **Assigns priority levels** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) based on urgency, public safety risks, and duration.
3. **Detects near-duplicate grievances** in English, Hindi, and Marathi using multi-stage NLP token comparison.
4. **Smart-routes complaints** to the responsible municipal department.
5. **Empowers municipal officers** with automated Officer Assistant recommendations, action checklists, and draft citizen response messages.
6. **Visualizes live complaint hotspots** geographically for municipal authority planning.

---

## 🚀 Key Features

- **Citizen Portal**: Clean, modern single-page submission form with language selection (English, Hindi, Marathi), location picker, photo attachment, voice input capability, and an instant **AI Analysis Card**.
- **Multilingual Support**: Supports complaints written in **English**, **Hindi** (e.g. *"हमारे इलाके में पांच दिनों से कचरा नहीं उठाया गया।"*), and **Marathi** (e.g. *"आमच्या रस्त्यावर मोठा खड्डा पडला आहे."*).
- **AI Classification & Priority Engine**: Extracts category, assigns priority with justification explanations, and creates concise summaries. Integrates with OpenAI LLM when configured, with automatic seamless fallback to a local multi-lingual NLP rule engine.
- **Duplicate & Related Complaint Detection**: Token normalization, stopword filtering across 3 languages, Jaccard token similarity, bi-gram overlap, difflib sequence matching, and location proximity scoring.
- **Officer Assistant (`POST /api/officer_assist`)**: Fast, deterministic recommendation engine generating suggested actions (e.g. `site-inspect`, `temporary-barricade`), evidence checklists, draft citizen responses, and risk explanations.
- **Municipal Authority Dashboard**: Summary metrics (Total, Pending, High Priority, Resolved, Related Clusters), filterable grievance table, status updater, and live **Hotspot Radar Visualizer**.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13, FastAPI, Uvicorn
- **Database**: SQLite, SQLAlchemy
- **AI & NLP**: OpenAI API (optional), Custom Multi-lingual NLP Rule Engine (Jaccard, N-Gram, difflib)
- **Frontend**: Vanilla HTML5, Modern CSS3 (Dark civic-tech design system with glassmorphism), JavaScript (ES6+), Leaflet/SVG Radar Hotspot Visualizer

---

## 📦 Installation & Setup

1. **Clone or Open Project Directory**:
   ```bash
   cd c:\Users\hp\Desktop\sih_ai
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (Optional)**:
   Copy `.env.example` to `.env`:
   ```bash
   PORT=8000
   HOST=127.0.0.1
   DATABASE_URL=sqlite:///./grievances.db
   OPENAI_API_KEY=
   ```
   *(Note: If `OPENAI_API_KEY` is left blank, the application will seamlessly use the built-in multi-lingual NLP fallback engine without crashing or throwing errors).*

---

## 📊 How to Seed Demo Data

Run the seeding script to populate 15 realistic grievances in English, Hindi, and Marathi across different priorities, categories, and duplicate clusters:

```bash
python scripts/seed_demo.py
```

---

## 🏃 How to Run the Application

Start the FastAPI application server:

```bash
uvicorn app.main:app --reload --port 8000
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🧪 Running Automated Tests

Run the complete test suite:

### 1. Backend Smoke Tests:
```bash
python scripts/smoke_test.py
```

### 2. Duplicate Detection Tests:
```bash
python scripts/duplicate_test.py
```

### 3. Full Demo Walkthrough Validator:
```bash
python scripts/ui_walkthrough.py
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Web Application Interface (Citizen Portal & Dashboard) |
| `GET` | `/health` | Application health & voice status check |
| `POST` | `/api/grievances` | Submit complaint (text, language, location, image upload) |
| `GET` | `/api/grievances` | List complaints with category, priority, status & search filters |
| `GET` | `/api/grievances/{id}` | Get detailed complaint record |
| `PATCH` | `/api/grievances/{id}/status` | Update grievance status |
| `GET` | `/api/dashboard/stats` | Summary statistics metrics |
| `GET` | `/api/hotspots` | Geographic hotspot clusters & breakdown |
| `POST` | `/api/officer_assist` | Deterministic Officer Assistant recommendations |
| `POST` | `/api/voice` | Speech-to-text audio transcription |

---

## 🛡️ AI Fallback Behavior

The application is engineered for **100% hackathon demo reliability**. If an OpenAI API key is unavailable or encounters rate limits/network failures:
- Classification automatically uses keyword density and Devanagari multi-lingual tokenizers.
- Priority engine uses context rules (danger, school/college/hospital proximity, issue duration).
- Duplicate detection uses deterministic Jaccard + N-gram + difflib algorithms.
- Officer Assistant uses deterministic decision matrix rules.

---

## 🎬 90-120 Second Hackathon Demo Guide

1. Open `http://127.0.0.1:8000`.
2. **Step 1 (Citizen Portal)**: Click `Pothole 1 (EN)` button -> Click `Submit Complaint & Process AI`. View Category: **Roads**, Priority: **HIGH**, Department: **Roads & Infrastructure**.
3. **Step 2 (Duplicate Detection)**: Click `Pothole 2 Near-Duplicate (EN)` -> Click `Submit`. Notice the yellow **⚠️ Duplicate / Related Complaints Detected!** badge linking to Ticket `GRV-1001`.
4. **Step 3 (Multilingual)**: Click `Garbage (HI)` -> Submit -> View **Waste Management**. Click `Road Pothole (MR)` -> Submit -> View **Roads**.
5. **Step 4 (Authority Dashboard)**: Switch to **Municipal Authority Dashboard** tab. Highlight metric cards and live hotspot radar map.
6. **Step 5 (Officer Assistant)**: Click row `GRV-1001` -> Inspect suggested actions, evidence checklist, draft citizen message, and officer recommendations.
