import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./grievances.db")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

CATEGORIES = [
    "Roads",
    "Waste Management",
    "Water Supply",
    "Electricity",
    "Street Lighting",
    "Drainage",
    "Public Safety",
    "Sanitation",
    "Parks",
    "Other"
]

DEPARTMENTS = {
    "Roads": "Roads & Infrastructure Department",
    "Waste Management": "Solid Waste Management Department",
    "Water Supply": "Water Supply & Sewerage Department",
    "Electricity": "Electrical Services Department",
    "Street Lighting": "Street Lighting & Urban Energy",
    "Drainage": "Stormwater & Drainage Maintenance",
    "Public Safety": "Public Safety & Emergency Response",
    "Sanitation": "Sanitation & Public Hygiene",
    "Parks": "Parks & Horticulture Department",
    "Other": "General Civic Grievance Cell"
}

PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
STATUSES = ["Submitted", "AI Classified", "Assigned", "In Progress", "Resolved"]
