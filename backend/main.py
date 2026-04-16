"""
Voca TTS Backend — FastAPI + KokoroTTS
Deployed to Hugging Face Spaces (simplyteedavid/voca-tts).
Primary TTS runs in the browser via kokoro-js.
This backend serves as a fallback for heavy audiobook generation.
"""

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import io
import os

app = FastAPI(title="Voca TTS API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://voca-cyan.vercel.app")
API_KEY = os.getenv("VOCA_API_KEY", "")  # Set in HF Space secrets

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)
_kokoro_pipeline = None


def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify API key — skip if no key configured (dev mode)."""
    if not API_KEY:
        return True  # No key set → open access (dev)
    if not credentials or credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return True


def get_pipeline():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        try:
            from kokoro import KPipeline
            _kokoro_pipeline = KPipeline(lang_code="a")
        except ImportError:
            raise HTTPException(500, "kokoro not installed")
    return _kokoro_pipeline


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_bella"
    speed: float = 1.0


@app.get("/", response_class=HTMLResponse)
def root():
    """Simple status page."""
    return """
    <html><body style="font-family:sans-serif;padding:2rem;background:#0f0f13;color:#fff">
    <h1 style="color:#6C63FF">🎙 Voca TTS API</h1>
    <p>Status: <span style="color:#22c55e">● Online</span></p>
    <p>Endpoints:</p>
    <ul>
      <li><code>GET /health</code> — health check (pinged by UptimeRobot)</li>
      <li><code>GET /voices</code> — list available voices</li>
      <li><code>POST /tts</code> — generate speech (requires API key)</li>
    </ul>
    <p style="color:#888">Powered by KokoroTTS · Deployed on Hugging Face Spaces</p>
    </body></html>
    """


@app.get("/health")
def health():
    """Health check — pinged by UptimeRobot every 5 min to keep Space alive."""
    return {"status": "ok", "service": "voca-tts", "version": "1.0.0"}


@app.get("/voices")
def list_voices():
    return {
        "voices": [
            {"id": "af_bella",    "name": "Bella",    "gender": "female", "accent": "american"},
            {"id": "af_sarah",    "name": "Sarah",    "gender": "female", "accent": "american"},
            {"id": "af_nicole",   "name": "Nicole",   "gender": "female", "accent": "american"},
            {"id": "am_adam",     "name": "Adam",     "gender": "male",   "accent": "american"},
            {"id": "am_michael",  "name": "Michael",  "gender": "male",   "accent": "american"},
            {"id": "bf_emma",     "name": "Emma",     "gender": "female", "accent": "british"},
            {"id": "bf_isabella", "name": "Isabella", "gender": "female", "accent": "british"},
            {"id": "bm_george",   "name": "George",   "gender": "male",   "accent": "british"},
            {"id": "bm_lewis",    "name": "Lewis",    "gender": "male",   "accent": "british"},
        ]
    }


@app.post("/tts")
def generate_tts(req: TTSRequest, _: bool = Depends(verify_api_key)):
    if len(req.text) > 5000:
        raise HTTPException(400, "Text too long (max 5000 chars)")
    if not (0.5 <= req.speed <= 2.0):
        raise HTTPException(400, "Speed must be 0.5–2.0")

    pipeline = get_pipeline()
    try:
        import soundfile as sf
        import numpy as np

        chunks = []
        for _, _, audio in pipeline(req.text, voice=req.voice, speed=req.speed):
            if audio is not None:
                chunks.append(audio)

        if not chunks:
            raise HTTPException(500, "No audio generated")

        combined = np.concatenate(chunks)
        buf = io.BytesIO()
        sf.write(buf, combined, 24000, format="WAV")
        buf.seek(0)

        return StreamingResponse(
            buf,
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=tts.wav"},
        )
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {e}")
