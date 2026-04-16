"""
Voca TTS Backend — FastAPI + KokoroTTS
Deployed to Hugging Face Spaces as a free always-on API fallback.
Primary TTS runs in the browser via kokoro-js.
This backend is used when browser-side generation is too slow (e.g., full audiobook export).
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import os

app = FastAPI(title="Voca TTS API", version="1.0.0")

# Allow requests from the Voca frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "https://voca.vercel.app"),
        "http://localhost:3000",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Lazy-load Kokoro to avoid startup delay
_kokoro_pipeline = None


def get_pipeline():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        try:
            from kokoro import KPipeline
            _kokoro_pipeline = KPipeline(lang_code="a")  # 'a' = American English
        except ImportError:
            raise HTTPException(500, "kokoro package not installed")
    return _kokoro_pipeline


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_bella"
    speed: float = 1.0


@app.get("/health")
def health():
    """Health check endpoint — pinged by UptimeRobot to keep space alive."""
    return {"status": "ok", "service": "voca-tts"}


@app.post("/tts")
def generate_tts(req: TTSRequest):
    """Generate TTS audio and return as WAV bytes."""
    if len(req.text) > 5000:
        raise HTTPException(400, "Text too long (max 5000 chars per request)")
    if req.speed < 0.5 or req.speed > 2.0:
        raise HTTPException(400, "Speed must be between 0.5 and 2.0")

    pipeline = get_pipeline()

    try:
        import soundfile as sf
        import numpy as np

        audio_chunks = []
        for _, _, audio in pipeline(req.text, voice=req.voice, speed=req.speed):
            if audio is not None:
                audio_chunks.append(audio)

        if not audio_chunks:
            raise HTTPException(500, "No audio generated")

        combined = np.concatenate(audio_chunks)

        buf = io.BytesIO()
        sf.write(buf, combined, 24000, format="WAV")
        buf.seek(0)

        return StreamingResponse(
            buf,
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=tts.wav"},
        )
    except Exception as e:
        raise HTTPException(500, f"TTS generation failed: {str(e)}")


@app.get("/voices")
def list_voices():
    """Return available Kokoro voices."""
    return {
        "voices": [
            {"id": "af_bella", "name": "Bella", "gender": "female", "accent": "american"},
            {"id": "af_sarah", "name": "Sarah", "gender": "female", "accent": "american"},
            {"id": "af_nicole", "name": "Nicole", "gender": "female", "accent": "american"},
            {"id": "am_adam", "name": "Adam", "gender": "male", "accent": "american"},
            {"id": "am_michael", "name": "Michael", "gender": "male", "accent": "american"},
            {"id": "bf_emma", "name": "Emma", "gender": "female", "accent": "british"},
            {"id": "bf_isabella", "name": "Isabella", "gender": "female", "accent": "british"},
            {"id": "bm_george", "name": "George", "gender": "male", "accent": "british"},
            {"id": "bm_lewis", "name": "Lewis", "gender": "male", "accent": "british"},
        ]
    }
