import sys
import unittest
from pathlib import Path
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, engine, Base
from app.models import Grievance
from app.duplicate_engine import calculate_similarity_score, find_related_grievances
from app.ai_engine import analyze_complaint

class TestDuplicateDetection(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_near_duplicate_pothole_detection(self):
        c1_text = "There is a large pothole near ABC College causing danger to students."
        c2_text = "A huge pothole has appeared outside ABC College and is dangerous."
        location = "ABC Road, near ABC College"

        # Calculate direct similarity
        score = calculate_similarity_score(
            text1=c1_text,
            text2=c2_text,
            cat1="Roads",
            cat2="Roads",
            loc1=location,
            loc2=location
        )
        print(f"\n[Duplicate Test] Similarity score between near-duplicate pothole complaints: {score:.3f}")
        self.assertGreaterEqual(score, 0.30, "Near-duplicate pothole complaints should score above threshold.")

    def test_02_unrelated_complaints_isolation(self):
        c1_text = "There is a large pothole near ABC College causing danger to students."
        c_garbage_text = "There is no garbage pickup on my lane for 4 days."

        score = calculate_similarity_score(
            text1=c1_text,
            text2=c_garbage_text,
            cat1="Roads",
            cat2="Waste Management",
            loc1="ABC Road, near ABC College",
            loc2="Subhash Nagar"
        )
        print(f"[Duplicate Test] Similarity score between pothole & garbage complaints: {score:.3f}")
        self.assertEqual(score, 0.0, "Unrelated complaints of different categories must score 0.0.")

    def test_03_end_to_end_duplicate_linkage(self):
        # 1. Add Complaint 1
        ai1 = analyze_complaint("There is a large pothole near ABC College causing danger to students.")
        g1 = Grievance(
            ticket_id="GRV-TEST-1",
            text="There is a large pothole near ABC College causing danger to students.",
            language="English",
            location="ABC Road, near ABC College",
            category=ai1["category"],
            priority=ai1["priority"],
            department=ai1["department"],
            summary=ai1["summary"],
            explanation=ai1["explanation"],
            status="AI Classified"
        )
        self.db.add(g1)
        self.db.commit()
        self.db.refresh(g1)

        # 2. Add Complaint 2 (near duplicate)
        ai2 = analyze_complaint("A huge pothole has appeared outside ABC College and is dangerous.")
        related_ids = find_related_grievances(
            text="A huge pothole has appeared outside ABC College and is dangerous.",
            category=ai2["category"],
            location="ABC Road, near ABC College",
            db=self.db
        )

        print(f"[Duplicate Test] Found related grievance IDs for Complaint 2: {related_ids}")
        self.assertIn(g1.id, related_ids, "Complaint 1 ID should be returned in related_ids for Complaint 2!")

        # 3. Add Unrelated Garbage Complaint
        ai3 = analyze_complaint("There is no garbage pickup on my lane for 4 days.")
        unrelated_ids = find_related_grievances(
            text="There is no garbage pickup on my lane for 4 days.",
            category=ai3["category"],
            location="Subhash Nagar",
            db=self.db
        )
        print(f"[Duplicate Test] Found related grievance IDs for Garbage Complaint: {unrelated_ids}")
        self.assertNotIn(g1.id, unrelated_ids, "Garbage complaint must NOT link to pothole complaint!")

if __name__ == "__main__":
    unittest.main()
