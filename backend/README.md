# Voca TTS Backend

FastAPI server running KokoroTTS. Deployed to Hugging Face Spaces as a free always-on fallback API.

## Deploy to Hugging Face Spaces

1. Create a new Space at https://huggingface.co/new-space
   - SDK: **Docker** (or **Gradio** with custom app)
   - Hardware: **CPU Basic** (free, 16GB RAM)
   - Visibility: Public

2. Push this `backend/` folder contents to the Space repo

3. Add `Dockerfile` (below) to the Space root

4. Set environment variable in Space settings:
   - `FRONTEND_URL` = your Vercel app URL

## Keep Space Always Online (Free)

Use [UptimeRobot](https://uptimerobot.com) (free):
1. Create account
2. Add HTTP monitor
3. URL: `https://YOUR-SPACE.hf.space/health`
4. Interval: **5 minutes**

This pings the `/health` endpoint every 5 min — Space never sleeps.

## Local Development

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`

## Endpoints

- `GET /health` — Health check (pinged by UptimeRobot)
- `GET /voices` — List available voices
- `POST /tts` — Generate speech
  ```json
  { "text": "Hello world", "voice": "af_bella", "speed": 1.0 }
  ```
