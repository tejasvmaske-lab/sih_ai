import re
import logging
from typing import Dict, Any, Tuple
from app.config import OPENAI_API_KEY, CATEGORIES, DEPARTMENTS

logger = logging.getLogger(__name__)

# Keywords dictionary for multi-lingual fallback rule engine
KEYWORD_MAPPINGS = {
    "Roads": {
        "english": ["pothole", "road", "street", "tar", "asphalt", "crack", "footpath", "side walk", "crater", "pavement"],
        "hindi": ["खड्डा", "गड्ढा", "सड़क", "रस्ता", "फुटपाथ", "रोड", "गड्ढे"],
        "marathi": ["खड्डा", "खड्डे", "रस्ता", "रस्त्यावर", "फुटपाथ", "मार्ग"]
    },
    "Waste Management": {
        "english": ["garbage", "waste", "trash", "dump", "bin", "litter", "cleaning", "refuse", "debris", "dirt", "sweeping"],
        "hindi": ["कचरा", "कूड़ा", "सफाई", "कचरे", "डस्टबिन", "गंदगी"],
        "marathi": ["कचरा", "घाण", "उचलला नाही", "कचराकुंडी", "स्वच्छता"]
    },
    "Water Supply": {
        "english": ["water", "leak", "pipeline", "pipe", "tap", "supply", "drinking water", "burst", "overflow", "contamination"],
        "hindi": ["पानी", "पाणी", "लीकेज", "पाइप", "नल", "जल", "सप्लाई"],
        "marathi": ["पाणी", "गळती", "नळ", "पाईप", "पाण्याचा", "पुरवठा"]
    },
    "Electricity": {
        "english": ["electricity", "power", "transformer", "wire", "spark", "current", "outage", "shock", "voltage", "cable"],
        "hindi": ["बिजली", "पावर", "ट्रांसफॉर्मर", "तार", "करंट", "कट"],
        "marathi": ["वीज", "लाइट", "ट्रांसफॉर्मर", "वायर", "प्रवाह", "खंडित"]
    },
    "Street Lighting": {
        "english": ["streetlight", "street light", "lamp", "pole", "light pole", "dark street", "darkness"],
        "hindi": ["स्ट्रीट लाइट", "लाइट", "दीपक", "पोल", "अंधेरा"],
        "marathi": ["दिवा", "रस्त्यावरील दिवा", "लाइट", "पोल", "काोख"]
    },
    "Drainage": {
        "english": ["drain", "drainage", "sewer", "sewerage", "gutter", "blockage", "clogged", "manhole", "overflowing drain"],
        "hindi": ["नाली", "ड्रेनेज", "गटर", "मैनहोल", "जाम", "सीवर"],
        "marathi": ["गटार", "नाली", "मैनहोल", "तुंबले", "गटाराचे"]
    },
    "Public Safety": {
        "english": ["safety", "danger", "hazard", "threat", "accident", "risk", "school", "college", "hospital", "falling", "collapse"],
        "hindi": ["खतरा", "सुरक्षा", "दुर्घटना", "अस्पताल", "स्कूल", "कॉलेज", "जोखिम"],
        "marathi": ["धोका", "धोकादायक", "सुरक्षा", "अपघात", "शाळा", "कॉलेज", "धोका"]
    },
    "Sanitation": {
        "english": ["toilet", "sanitation", "public toilet", "hygiene", "stench", "foul smell", "urinal"],
        "hindi": ["शौचालय", "बदबू", "सफाई", "शौच"],
        "marathi": ["शौचालय", "दुर्गंधी", "स्वच्छता", "सार्वजनिक"]
    },
    "Parks": {
        "english": ["park", "garden", "bench", "tree", "playground", "grass", "branch"],
        "hindi": ["पार्क", "बगीचा", "पेड़", "बेंच", "झाड़"],
        "marathi": ["उद्यान", "बाग", "झाड", "बेंच", "खेळाचे मैदान"]
    }
}

HIGH_PRIORITY_KEYWORDS = [
    "dangerous", "danger", "school", "college", "hospital", "accident", "risk", "hazard",
    "students", "children", "elderly", "main road", "highway", "heavy traffic", "repeated",
    "खतरा", "सुरक्षा", "दुर्घटना", "अस्पताल", "स्कूल", "कॉलेज",
    "धोका", "धोकादायक", "शाळा", "विद्यार्थी", "अपघात"
]

CRITICAL_PRIORITY_KEYWORDS = [
    "burst", "collapse", "live wire", "sparking", "explosion", "flooding", "emergency", "fatal",
    "गंभीर", "आग", "शॉक", "जीवघेणा"
]

DURATION_KEYWORDS = [
    "5 days", "several days", "week", "days", "पाँच दिन", "पांच दिनों", "पाच दिवस", "अनेक दिवस"
]


def classify_fallback(text: str, language: str = "English", location: str = "") -> Dict[str, Any]:
    """
    Deterministic rule-based classification and priority extraction engine for EN, HI, MR.
    """
    text_lower = text.lower()
    
    # 1. Category Detection
    category_scores = {cat: 0 for cat in CATEGORIES}
    
    for cat, lang_dict in KEYWORD_MAPPINGS.items():
        all_kw = lang_dict["english"] + lang_dict["hindi"] + lang_dict["marathi"]
        for kw in all_kw:
            if kw.lower() in text_lower:
                # Specific domain categories get higher score than generic Public Safety
                weight = 1 if cat == "Public Safety" else 2
                category_scores[cat] += weight
                
    best_category = max(category_scores, key=category_scores.get)
    if category_scores[best_category] == 0:
        best_category = "Other"

        
    department = DEPARTMENTS.get(best_category, "General Civic Cell")
    
    # 2. Priority Detection
    priority = "LOW"
    priority_reasons = []
    
    # Check Critical
    for kw in CRITICAL_PRIORITY_KEYWORDS:
        if kw.lower() in text_lower:
            priority = "CRITICAL"
            priority_reasons.append(f"Contains emergency indicator: '{kw}'")
            break
            
    # Check High if not critical
    if priority != "CRITICAL":
        high_matches = [kw for kw in HIGH_PRIORITY_KEYWORDS if kw.lower() in text_lower]
        if high_matches or "school" in text_lower or "college" in text_lower or "hospital" in text_lower:
            priority = "HIGH"
            priority_reasons.append(f"Public safety risk or near sensitive area ({', '.join(high_matches or ['school/college'])})")
        elif best_category in ["Roads", "Public Safety", "Electricity"] and any(d in text_lower for d in DURATION_KEYWORDS):
            priority = "HIGH"
            priority_reasons.append("High risk issue lingering over multiple days")
        elif any(d in text_lower for d in DURATION_KEYWORDS):
            priority = "MEDIUM"
            priority_reasons.append("Unresolved issue persisting for several days")
        elif best_category in ["Roads", "Water Supply", "Drainage", "Electricity"]:
            priority = "MEDIUM"
            priority_reasons.append("Infrastructure issue requiring municipal maintenance")

    if not priority_reasons:
        priority_reasons.append("Standard civic grievance requiring routine processing.")
        
    explanation = f"{priority} priority because: " + "; ".join(priority_reasons)
    
    # 3. Summarize
    # Short concise summary
    clean_text = text.strip()
    if len(clean_text) > 90:
        summary = clean_text[:87] + "..."
    else:
        summary = clean_text
        
    return {
        "category": best_category,
        "department": department,
        "priority": priority,
        "summary": summary,
        "explanation": explanation
    }


def analyze_complaint(text: str, language: str = "English", location: str = "") -> Dict[str, Any]:
    """
    Main AI classification entry point.
    Attempts OpenAI API structured completion if configured, otherwise falls back to deterministic NLP.
    """
    if OPENAI_API_KEY:
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            
            prompt = f"""
            Analyze the following citizen grievance submitted in {language}:
            Grievance: "{text}"
            Location Context: "{location}"

            Choose Category from: {CATEGORIES}
            Choose Priority from: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            Determine responsible municipal department.
            Provide a 1-sentence summary.
            Provide a concise explanation for the priority assignment.

            Return JSON matching format:
            {{
                "category": "...",
                "department": "...",
                "priority": "...",
                "summary": "...",
                "explanation": "..."
            }}
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            import json
            res = json.loads(response.choices[0].message.content)
            
            # Sanity checks
            if res.get("category") not in CATEGORIES:
                res["category"] = "Other"
            if res.get("priority") not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
                res["priority"] = "MEDIUM"
            if not res.get("department"):
                res["department"] = DEPARTMENTS.get(res["category"], "General Civic Cell")
                
            return res
        except Exception as e:
            logger.warning(f"OpenAI API call failed or unconfigured ({e}). Falling back to rule engine.")
            
    # Fallback to local deterministic NLP engine
    return classify_fallback(text, language=language, location=location)
