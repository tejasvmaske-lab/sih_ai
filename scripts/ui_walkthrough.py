import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.database import engine, Base

client = TestClient(app)

def run_ui_walkthrough():
    print("=" * 70)
    print("      SIH26-S02 DEMO SCENARIO UI & API WALKTHROUGH VALIDATOR      ")
    print("=" * 70)

    # 1. Reset DB tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # -------------------------------------------------------------
    # DEMO STEP 1: Submit Complaint 1 (English Pothole)
    # -------------------------------------------------------------
    print("\n--- STEP 1: Submit English Pothole Complaint 1 ---")
    p1 = {
        "text": "There is a large pothole near ABC College causing danger to students.",
        "language": "English",
        "location": "ABC Road, near ABC College"
    }
    r1 = client.post("/api/grievances", data=p1)
    d1 = r1.json()
    print(f"Ticket ID   : {d1['ticket_id']}")
    print(f"Category    : {d1['category']}")
    print(f"Priority    : {d1['priority']}")
    print(f"Department  : {d1['department']}")
    print(f"Summary     : {d1['summary']}")
    print(f"Explanation : {d1['explanation']}")
    assert d1["category"] == "Roads", "Expected Category: Roads"
    assert d1["priority"] == "HIGH", "Expected Priority: HIGH"
    print("[PASS] Step 1 Passed!")

    # -------------------------------------------------------------
    # DEMO STEP 2: Submit Complaint 2 (English Pothole Near-Duplicate)
    # -------------------------------------------------------------
    print("\n--- STEP 2: Submit English Pothole Complaint 2 (Near-Duplicate) ---")
    p2 = {
        "text": "A huge pothole has appeared outside ABC College and is dangerous.",
        "language": "English",
        "location": "ABC Road, near ABC College"
    }
    r2 = client.post("/api/grievances", data=p2)
    d2 = r2.json()
    print(f"Ticket ID   : {d2['ticket_id']}")
    print(f"Category    : {d2['category']}")
    print(f"Priority    : {d2['priority']}")
    print(f"Related IDs : {d2['related_ids']}")
    assert len(d2["related_ids"]) > 0, "Expected related complaint to be detected!"
    print("[PASS] Step 2 Passed (Duplicate detected successfully)!")

    # -------------------------------------------------------------
    # DEMO STEP 3: Submit Multilingual Hindi Garbage Complaint
    # -------------------------------------------------------------
    print("\n--- STEP 3: Submit Multilingual Hindi Garbage Complaint ---")
    p3 = {
        "text": "हमारे इलाके में पांच दिनों से कचरा नहीं उठाया गया।",
        "language": "Hindi",
        "location": "Station Square, Main Market"
    }
    r3 = client.post("/api/grievances", data=p3)
    d3 = r3.json()
    print(f"Ticket ID   : {d3['ticket_id']}")
    print(f"Category    : {d3['category']}")
    print(f"Priority    : {d3['priority']}")
    print(f"Department  : {d3['department']}")
    assert d3["category"] == "Waste Management", "Expected Category: Waste Management"
    print("[PASS] Step 3 Passed!")

    # -------------------------------------------------------------
    # DEMO STEP 4: Submit Multilingual Marathi Road Complaint
    # -------------------------------------------------------------
    print("\n--- STEP 4: Submit Multilingual Marathi Road Complaint ---")
    p4 = {
        "text": "आमच्या रस्त्यावर मोठा खड्डा पडला आहे.",
        "language": "Marathi",
        "location": "MG Road, Sector 4"
    }
    r4 = client.post("/api/grievances", data=p4)
    d4 = r4.json()
    print(f"Ticket ID   : {d4['ticket_id']}")
    print(f"Category    : {d4['category']}")
    print(f"Department  : {d4['department']}")
    assert d4["category"] == "Roads", "Expected Category: Roads"
    print("[PASS] Step 4 Passed!")

    # -------------------------------------------------------------
    # DEMO STEP 5: Authority Dashboard Statistics & Hotspots
    # -------------------------------------------------------------
    print("\n--- STEP 5: Check Authority Dashboard Metrics & Hotspots ---")
    stats_res = client.get("/api/dashboard/stats").json()
    hotspots_res = client.get("/api/hotspots").json()
    print(f"Total Complaints   : {stats_res['total_complaints']}")
    print(f"Pending Complaints : {stats_res['pending']}")
    print(f"High Priority      : {stats_res['high_priority']}")
    print(f"Related Clusters   : {stats_res['related_complaints']}")
    print(f"Hotspots Detected  : {len(hotspots_res)}")
    assert stats_res["total_complaints"] == 4
    print("[PASS] Step 5 Passed!")

    # -------------------------------------------------------------
    # DEMO STEP 6: Officer Assistant Recommendations
    # -------------------------------------------------------------
    print("\n--- STEP 6: Test Officer Assistant Endpoint ---")
    off_res = client.post("/api/officer_assist", json={"complaint_id": d1["id"]}).json()
    print(f"Complaint ID        : {off_res['complaint_id']}")
    print(f"Suggested Actions   : {off_res['actions']}")
    print(f"Recommended Officer : {off_res['recommended_officer']}")
    print(f"Draft Message       : {off_res['draft_message']}")
    print(f"Evidence Required   : {off_res['evidence_checklist']}")
    print(f"Explanation         : {off_res['explanation']}")
    assert "site-inspect" in off_res["actions"] or "temporary-barricade" in off_res["actions"]
    print("[PASS] Step 6 Passed!")

    print("\n" + "=" * 70)
    print("   ALL WALKTHROUGH DEMO STEPS PASSED WITH 100% ACCURACY!   ")
    print("=" * 70)

if __name__ == "__main__":
    run_ui_walkthrough()
