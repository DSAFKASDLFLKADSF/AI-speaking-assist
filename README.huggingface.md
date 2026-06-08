---
title: AI Speaking Trainer Python API
emoji: 🎙️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

FastAPI backend for TOEFL speaking analysis (AssemblyAI + Zhipu GLM).

Set **Settings → Variables and secrets** in this Space:

- `GLM_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `PYTHON_SPEECH_API_KEY`
- `CORS_ORIGINS` (your Vercel URL)
- `DEV_ECHO_REFERENCE` = `false`

Health: `/health`
