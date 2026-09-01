import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.database import SessionLocal, engine, Base
from app.models import Grievance

client = TestClient(app)

class TestGrievancePlatform(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)

    def test_01_health_check(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        print("[PASS] Health check passed.")

    def test_02_submit_english_pothole_complaint(self):
        payload = {
            "text": "There is a large pothole near ABC College causing danger to students.",
            "language": "English",
            "location": "ABC Road, near ABC College"
        }
        response = client.post("/api/grievances", data=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["category"], "Roads")
        self.assertEqual(data["priority"], "HIGH")
        self.assertIn("Roads", data["department"])
        self.assertIn("GRV-", data["ticket_id"])
        print(f"[PASS] English pothole complaint test passed ({data['ticket_id']}: {data['category']} / {data['priority']}).")

    def test_03_submit_hindi_garbage_complaint(self):
        payload = {
            "text": "हमारे इलाके में पांच दिनों से कचरा नहीं उठाया गया।",
            "language": "Hindi",
            "location": "Station Square, Main Market"
        }
        response = client.post("/api/grievances", data=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["category"], "Waste Management")
        self.assertIn("Waste Management", data["department"])
        print(f"[PASS] Hindi garbage complaint test passed ({data['ticket_id']}: {data['category']}).")

    def test_04_submit_marathi_pothole_complaint(self):
        payload = {
            "text": "आमच्या रस्त्यावर मोठा खड्डा पडला आहे.",
            "language": "Marathi",
            "location": "MG Road, Sector 4"
        }
        response = client.post("/api/grievances", data=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["category"], "Roads")
        print(f"[PASS] Marathi pothole complaint test passed ({data['ticket_id']}: {data['category']}).")

    def test_05_dashboard_stats(self):
        response = client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["total_complaints"], 3)
        self.assertIn("pending", data)
        self.assertIn("high_priority", data)
        print("[PASS] Dashboard stats test passed.")

    def test_06_officer_assistant(self):
        db = SessionLocal()
        first_g = db.query(Grievance).first()
        db.close()

        self.assertIsNotNone(first_g)
        payload = {"complaint_id": first_g.id}
        response = client.post("/api/officer_assist", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("actions", data)
        self.assertIn("draft_message", data)
        self.assertIn("evidence_checklist", data)
        print(f"[PASS] Officer Assistant test passed for ticket {first_g.ticket_id}.")

    def test_07_voice_fallback(self):
        files = {"audio": ("test.mp3", b"dummy audio content", "audio/mp3")}
        response = client.post("/api/voice", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        print("[PASS] Voice fallback test passed.")

if __name__ == "__main__":
    unittest.main()
