# SIH26-S02 Technical Architecture

## Overview

The **SIH26-S02 AI Citizen Grievance Platform** is designed as a modular, lightweight, high-performance civic technology application built using **Python FastAPI**, **SQLAlchemy SQLite**, **Jinja2**, and **Vanilla HTML5/CSS3/JavaScript**.

```text
                                  ┌───────────────────────────┐
                                  │    Citizen / Officer UI   │
                                  └─────────────┬─────────────┘
                                                │ REST API
                                                ▼
                                  ┌───────────────────────────┐
                                  │      FastAPI Engine       │
                                  └─────────────┬─────────────┘
                                                │
         ┌───────────────────┬──────────────────┼───────────────────┬───────────────────┐
         ▼                   ▼                  ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ ┌───────────────────┐ ┌───────────────┐
│ AI Engine &     │ │ Duplicate       │ │ Officer       │ │ Dynamic Hotspot   │ │ Voice / Audio │
│ Multilingual    │ │ Detection       │ │ Assistant     │ │ Visualizer        │ │ Transcription │
│ Fallback        │ │ (Jaccard/N-Gram)│ │ Rule Matrix   │ │ Radar Generator   │ │ Handler       │
└─────────────────┘ └─────────────────┘ └───────────────┘ └───────────────────┘ └───────────────┘
```

---

## Core Technical Pipelines

### 1. End-to-End Complaint Pipeline
1. **Submission**: Received via `POST /api/grievances` (supports text, language selection, location, and photo upload).
2. **Language Processing & AI Classification**: Evaluates input in English, Hindi, or Marathi against category keywords (`Roads`, `Waste Management`, `Water Supply`, `Electricity`, `Street Lighting`, `Drainage`, `Public Safety`, `Sanitation`, `Parks`).
3. **Priority Matrix**: Detects urgency level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) using danger indicators, location context (schools, hospitals, main roads), and issue duration.
4. **Duplicate Detection Engine**: Performs multi-lingual text normalization, token Jaccard similarity, bi-gram overlap, difflib sequence matching, and location proximity scoring.
5. **Smart Routing**: Directs grievance to the exact municipal department.

### 2. Officer Assistant Engine (`POST /api/officer_assist`)
Operates deterministically per hackathon guidelines without external LLM latency:
- **Priority Rules**: High -> `site-inspect`, Critical -> `urgent-escalation` + `site-inspect`.
- **Category Rules**: Roads -> `temporary-barricade`, Drainage -> `desiltation-dispatch`, etc.
- **Evidence Checklist**: Requires location verification, photos, or site reports.
- **Draft Message**: Auto-generates polite citizen response with status and reference ticket.

### 3. Hotspot Visualization Engine
Dynamic spatial clustering groups grievances by location coordinates and calculates complaint counts, highest priority level, and category breakdowns.

### 4. Zero-Downtime Fallback Capability
If an OpenAI API key is unconfigured or encounters network failures, the platform instantly switches to the built-in multi-lingual NLP rule engine without crashing or throwing errors.
