import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, engine, Base
from app.models import Grievance, Hotspot
from app.ai_engine import analyze_complaint
from app.duplicate_engine import find_related_grievances

DEMO_COMPLAINTS = [
    # English Pothole Complaints (Near Duplicates for Demo)
    {
        "text": "There is a large pothole near ABC College causing danger to students.",
        "language": "English",
        "location": "ABC Road, near ABC College",
        "latitude": 19.0760,
        "longitude": 72.8777
    },
    {
        "text": "A huge pothole has appeared outside ABC College and is dangerous.",
        "language": "English",
        "location": "ABC Road, near ABC College",
        "latitude": 19.0762,
        "longitude": 72.8779
    },
    {
        "text": "Deep crater on ABC Road opposite ABC College ground causing traffic congestion.",
        "language": "English",
        "location": "ABC Road, near ABC College",
        "latitude": 19.0759,
        "longitude": 72.8775
    },

    # Hindi Garbage Complaint
    {
        "text": "हमारे इलाके में पांच दिनों से कचरा नहीं उठाया गया। बहुत बदबू आ रही है।",
        "language": "Hindi",
        "location": "Station Square, Main Market",
        "latitude": 19.0820,
        "longitude": 72.8850
    },
    {
        "text": "मेन मार्केट में कचरे का ढेर लगा है और मक्खियां भिनभिना रही हैं।",
        "language": "Hindi",
        "location": "Station Square, Main Market",
        "latitude": 19.0822,
        "longitude": 72.8852
    },

    # Marathi Road Pothole Complaint
    {
        "text": "आमच्या रस्त्यावर मोठा खड्डा पडला आहे. वाहनांचे अपघात होत आहेत.",
        "language": "Marathi",
        "location": "MG Road, Sector 4",
        "latitude": 19.0680,
        "longitude": 72.8690
    },

    # Water Pipeline Burst (Critical)
    {
        "text": "Major water pipeline burst near Civil Hospital! Clean water is flooding the main road rapidly.",
        "language": "English",
        "location": "Gandhi Chowk, Civil Lines",
        "latitude": 19.0910,
        "longitude": 72.8920
    },
    {
        "text": "गांधी चौक अस्पताल के पास पानी की बड़ी पाइपलाइन फट गई है।",
        "language": "Hindi",
        "location": "Gandhi Chowk, Civil Lines",
        "latitude": 19.0912,
        "longitude": 72.8922
    },

    # Street Lighting & Electricity
    {
        "text": "Street lights are not working in Subhash Nagar Lane 3 for the past week, total darkness at night.",
        "language": "English",
        "location": "Subhash Nagar Lane 3",
        "latitude": 19.0610,
        "longitude": 72.8550
    },
    {
        "text": "सुभाष नगर गल्ली नंबर ३ मध्ये रस्त्यावरील दिवे बंद आहेत. अंधार पसरला आहे.",
        "language": "Marathi",
        "location": "Subhash Nagar Lane 3",
        "latitude": 19.0612,
        "longitude": 72.8552
    },

    # Drainage Blockage
    {
        "text": "Open drainage gutter overflowing onto the pedestrian pathway in Station Square.",
        "language": "English",
        "location": "Station Square, Main Market",
        "latitude": 19.0825,
        "longitude": 72.8855
    },

    # Broken Park Bench (Low Priority)
    {
        "text": "Broken wooden bench in Sector 4 public park needs repair.",
        "language": "English",
        "location": "MG Road, Sector 4",
        "latitude": 19.0685,
        "longitude": 72.8695
    },

    # Public Safety / Live Wire
    {
        "text": "Sparks and live wire hanging dangerously low near Sector 4 primary school playground!",
        "language": "English",
        "location": "MG Road, Sector 4",
        "latitude": 19.0688,
        "longitude": 72.8698
    },

    # Marathi Garbage Complaint
    {
        "text": "आमच्या परिसरात कचराकुंडी भरून वाहते आहे. कचरा उचलला नाही.",
        "language": "Marathi",
        "location": "Station Square, Main Market",
        "latitude": 19.0828,
        "longitude": 72.8858
    },

    # Sanitation
    {
        "text": "Public urinal near Bus Stand is unhygienic and lacking water flushing facility.",
        "language": "English",
        "location": "Station Square, Main Market",
        "latitude": 19.0830,
        "longitude": 72.8860
    }
]


def seed_database():
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print(f"Seeding {len(DEMO_COMPLAINTS)} demo grievances...")
        
        for idx, item in enumerate(DEMO_COMPLAINTS, start=1):
            ticket_id = f"GRV-{1000 + idx}"
            
            # AI Analysis
            ai_res = analyze_complaint(
                text=item["text"],
                language=item["language"],
                location=item["location"]
            )
            
            # Related complaints detection
            related_ids = find_related_grievances(
                text=item["text"],
                category=ai_res["category"],
                location=item["location"],
                db=db,
                threshold=0.30
            )

            # Assign realistic status mix
            statuses = ["AI Classified", "Assigned", "In Progress", "Resolved"]
            status = statuses[idx % len(statuses)]
            if ai_res["priority"] in ["HIGH", "CRITICAL"] and status == "Resolved":
                status = "In Progress"

            g = Grievance(
                ticket_id=ticket_id,
                text=item["text"],
                language=item["language"],
                location=item["location"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                category=ai_res["category"],
                priority=ai_res["priority"],
                department=ai_res["department"],
                summary=ai_res["summary"],
                explanation=ai_res["explanation"],
                status=status,
                related_ids=related_ids
            )
            
            db.add(g)
            db.commit()
            db.refresh(g)

            # Bi-directional update
            if related_ids:
                existing = db.query(Grievance).filter(Grievance.id.in_(related_ids)).all()
                for ext_g in existing:
                    current = list(ext_g.related_ids or [])
                    if g.id not in current:
                        current.append(g.id)
                        ext_g.related_ids = current
                db.commit()

            print(f"  [+] Seeded {ticket_id}: [{g.language}] {g.category} - Priority: {g.priority} - Related: {len(g.related_ids)}")

        print("\nSuccessfully seeded database!")
        print(f"Total grievances created: {db.query(Grievance).count()}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
