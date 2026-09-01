import re
import math
from difflib import SequenceMatcher
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models import Grievance

# Multi-lingual stop words
STOP_WORDS = {
    # English
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "in", "on", "at", "to",
    "for", "from", "up", "of", "with", "by", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "out", "off", "over", "under", "again", "further",
    "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "my", "our",
    "this", "that", "there", "has", "have", "had", "outside", "near", "causing", "appeared",
    
    # Hindi
    "हमारे", "में", "से", "को", "का", "की", "के", "है", "हूँ", "था", "थी", "थे", "पर", "और",
    "या", "ने", "नहीं", "गया", "इलाके", "पास", "रह", "रहे", "रहा", "कर", "हो", "हुआ", "हुई",
    
    # Marathi
    "आमच्या", "वर", "आहे", "नाही", "ने", "ला", "चा", "ची", "चे", "आणि", "किंवा", "झाला", "पडला",
    "जवळ", "आहेत", "होत", "होता", "होती"
}


def normalize_text(text: str) -> str:
    """Lowercase, strip non-alphanumeric (keeping Devanagari range), collapse spaces."""
    # Devanagari unicode range: \u0900-\u097F
    cleaned = re.sub(r'[^\w\s\u0900-\u097F]', ' ', text.lower())
    return ' '.join(cleaned.split())


def get_tokens(text: str) -> List[str]:
    """Tokenize and filter out short tokens & stop words."""
    norm = normalize_text(text)
    tokens = norm.split()
    return [t for t in tokens if len(t) > 1 and t not in STOP_WORDS]


def get_bigrams(tokens: List[str]) -> set:
    """Generate set of word bigrams."""
    if len(tokens) < 2:
        return set(tokens)
    return set(zip(tokens, tokens[1:]))


def jaccard_similarity(set1: set, set2: set) -> float:
    """Calculate Jaccard index between two sets."""
    if not set1 or not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / len(union)


def sequence_similarity(str1: str, str2: str) -> float:
    """Calculate difflib SequenceMatcher similarity ratio."""
    return SequenceMatcher(None, normalize_text(str1), normalize_text(str2)).ratio()


def calculate_similarity_score(
    text1: str, text2: str, 
    cat1: str, cat2: str,
    loc1: str = "", loc2: str = ""
) -> float:
    """
    Combined similarity metric:
    1. Category match gating: if categories differ, major penalty unless category is 'Other'
    2. Token Jaccard similarity (40% weight)
    3. Bigram Jaccard similarity (30% weight)
    4. SequenceMatcher ratio (20% weight)
    5. Location match boost (10% weight)
    """
    # Category gating
    if cat1 != cat2 and cat1 != "Other" and cat2 != "Other":
        return 0.0  # Different categories (e.g. Roads vs Waste Management) should NOT match

    tokens1 = get_tokens(text1)
    tokens2 = get_tokens(text2)

    if not tokens1 or not tokens2:
        return 0.0

    token_sim = jaccard_similarity(set(tokens1), set(tokens2))

    bigrams1 = get_bigrams(tokens1)
    bigrams2 = get_bigrams(tokens2)
    bigram_sim = jaccard_similarity(bigrams1, bigrams2)

    seq_sim = sequence_similarity(text1, text2)

    # Location boost
    loc_boost = 0.0
    if loc1 and loc2 and (loc1.lower() in loc2.lower() or loc2.lower() in loc1.lower()):
        loc_boost = 1.0

    final_score = (token_sim * 0.40) + (bigram_sim * 0.30) + (seq_sim * 0.20) + (loc_boost * 0.10)
    return final_score


def find_related_grievances(
    text: str,
    category: str,
    location: str = "",
    db: Session = None,
    exclude_id: int = None,
    threshold: float = 0.30
) -> List[int]:
    """
    Scans existing grievances in database and returns list of related complaint IDs.
    """
    if db is None:
        return []

    query = db.query(Grievance)
    if exclude_id:
        query = query.filter(Grievance.id != exclude_id)

    existing = query.all()
    related_ids = []

    for g in existing:
        score = calculate_similarity_score(
            text1=text,
            text2=g.text,
            cat1=category,
            cat2=g.category,
            loc1=location,
            loc2=g.location
        )
        if score >= threshold:
            related_ids.append(g.id)

    return related_ids
