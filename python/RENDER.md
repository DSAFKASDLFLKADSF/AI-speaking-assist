# Deploy FastAPI to Render

## Manual setup (Render Dashboard)

Create a **Web Service** with:

| Field | Value |
|-------|-------|
| **Root Directory** | `python` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |

## Environment variables

Whisper（转写）与智谱 GLM（打分）使用独立配置。Listen & Repeat 与 Virtual Interview 均走 Python API。

### Required (production)

```env
# 智谱 — 打分（Listen & Repeat + Virtual Interview）
GLM_API_KEY=your_zhipu_api_key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
MODEL_NAME=glm-4.7-flash

# AssemblyAI — 转写（Listen & Repeat + Virtual Interview）
ASSEMBLYAI_API_KEY=your_assemblyai_key
ASSEMBLYAI_BASE_URL=https://api.assemblyai.com
ASSEMBLYAI_SPEECH_MODELS=universal-2

# Next.js
PYTHON_SPEECH_API_URL=http://localhost:8000
PYTHON_SPEECH_API_KEY=shared_secret_for_nextjs
CORS_ORIGINS=https://your-next-app.onrender.com

DEV_ECHO_REFERENCE=false
```

### Local debug (score-only, skip transcription)

Only when **no** `ASSEMBLYAI_API_KEY` / `OPENAI_API_KEY`:

```env
GLM_API_KEY=your_zhipu_api_key
DEV_ECHO_REFERENCE=true
```

## Blueprint (Infrastructure as Code)

From repo root, use `render.yaml`:

```bash
# Render Dashboard → New → Blueprint → select this repository
```

## Wire Next.js to Render Python API

In Vercel / Render (Next.js app) `.env`:

```env
PYTHON_SPEECH_API_URL=https://ai-speaking-trainer-python.onrender.com
PYTHON_SPEECH_API_KEY=same_value_as_python_service
```

## Verify

```bash
curl https://your-python-service.onrender.com/health
# {"status":"ok","service":"ai-speaking-trainer-python"}
```

## Notes

- **`python/.env` is gitignored** — never commit API keys.
- **Region**: choose `Singapore` if your Zhipu / users are in China-adjacent regions.
- **Librosa**: if build fails on audio libs, upgrade to a Docker-based deploy.
- **Cold start**: free/starter plans sleep; first request may take 30–60s.
