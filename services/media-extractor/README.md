# FamOps Media Extractor

Private companion service for public Instagram and TikTok links. It uses `yt-dlp` to download one bounded temporary video, uploads that file to Gemini for visual and audio analysis, deletes the Gemini file, and lets the local temporary directory clean itself up. It never writes media to the FamOps database.

## Run locally

Create `.env` from `.env.example`, then run with Docker:

```bash
docker build -t famops-media-extractor .
docker run --rm -p 8080:8080 --env-file .env famops-media-extractor
```

Check `http://localhost:8080/health`. The `/analyze` endpoint is server-to-server only and requires `Authorization: Bearer <MEDIA_EXTRACTOR_API_KEY>`.

## Connect Supabase

Deploy this folder as a private container web service with HTTPS. Set `GEMINI_API_KEY`, `GEMINI_MODEL`, and a long random `MEDIA_EXTRACTOR_API_KEY` in that host's secret settings. Then set the following Supabase Edge Function secrets:

```text
MEDIA_EXTRACTOR_URL=https://your-worker-host.example/analyze
MEDIA_EXTRACTOR_API_KEY=the-same-random-shared-secret
```

Redeploy `app-api` after setting the secrets. Do not commit either service's real `.env` file. Public reels normally work; private, login-gated, age-restricted, or region-restricted links may still require an authenticated cookie workflow and are intentionally rejected by this first deployment.
