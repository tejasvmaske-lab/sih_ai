import os
import uuid
import shutil
import logging
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import OPENAI_API_KEY, UPLOAD_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Voice Input"])

@router.post("/voice")
async def voice_to_text(audio: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Speech-to-text transcription endpoint.
    If OpenAI API key is available, uses Whisper.
    Otherwise returns fallback notification.
    """
    if not OPENAI_API_KEY:
        return {
            "success": False,
            "transcription": "",
            "message": "Voice service API key is not configured. Please use text submission.",
            "voice_configured": False
        }

    # Save audio file
    ext = os.path.splitext(audio.filename)[1] if audio.filename else ".mp3"
    filename = f"voice_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        with open(filepath, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )

        return {
            "success": True,
            "transcription": transcript.text,
            "message": "Voice successfully transcribed.",
            "voice_configured": True
        }
    except Exception as e:
        logger.error(f"Voice processing error: {e}")
        return {
            "success": False,
            "transcription": "",
            "message": f"Speech-to-text failed: {str(e)}",
            "voice_configured": True
        }
