import json
import os
import secrets
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, Header, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel, HttpUrl


MAX_BYTES = 100 * 1024 * 1024
MAX_DURATION_SECONDS = 10 * 60
ALLOWED_HOSTS = ("instagram.com", "tiktok.com")
ANALYSIS_PROMPT = """Understand this video from both speech and visible content. Return JSON only with:
{"title":"descriptive title","summary":"useful 2-4 sentence summary","transcript":"searchable transcript or detailed narration with important facts","topics":["specific search terms and broader concepts"],"contentType":"Recipe|Parenting|Travel|Fitness|Learning|Home|Other"}.
For a recipe include the dish name, cuisine, ingredients, and main steps in the transcript. Do not invent details you cannot observe."""

app = FastAPI(title="FamOps media extractor", docs_url=None, redoc_url=None)


class AnalyzeRequest(BaseModel):
    url: HttpUrl
    output: str = "analysis"
    storeMedia: bool = False


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze(request: AnalyzeRequest, authorization: str | None = Header(default=None)) -> dict:
    authenticate(authorization)
    url = str(request.url)
    validate_url(url)
    if request.storeMedia:
        raise HTTPException(status_code=400, detail="Persistent media storage is not supported.")

    with tempfile.TemporaryDirectory(prefix="famops-media-") as temp_dir:
        media_path, metadata = download_video(url, Path(temp_dir))
        analysis = analyze_with_gemini(media_path)
        return {
            "analysis": analysis,
            "metadata": {
                "title": metadata.get("title"),
                "duration": metadata.get("duration"),
                "extractor": metadata.get("extractor_key"),
            },
            "storedMedia": False,
        }


def authenticate(authorization: str | None) -> None:
    expected = os.environ.get("MEDIA_EXTRACTOR_API_KEY", "")
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    if not expected or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized.")


def validate_url(url: str) -> None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme != "https" or not any(host == allowed or host.endswith(f".{allowed}") for allowed in ALLOWED_HOSTS):
        raise HTTPException(status_code=400, detail="Only public Instagram and TikTok HTTPS links are supported.")


def download_video(url: str, directory: Path) -> tuple[Path, dict]:
    options = {
        "format": "best[height<=720]/best",
        "outtmpl": str(directory / "%(id)s.%(ext)s"),
        "noplaylist": True,
        "max_filesize": MAX_BYTES,
        "socket_timeout": 20,
        "retries": 2,
        "quiet": True,
        "no_warnings": True,
        "restrictfilenames": True,
        "match_filter": yt_dlp.utils.match_filter_func(f"duration <= {MAX_DURATION_SECONDS}"),
    }
    try:
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as error:
        raise HTTPException(status_code=422, detail="This reel could not be downloaded. It may be private, restricted, expired, or require sign-in.") from error

    candidates = [path for path in directory.iterdir() if path.is_file() and not path.name.endswith((".part", ".ytdl"))]
    if not candidates:
        raise HTTPException(status_code=422, detail="The media provider did not return a video file.")
    media_path = max(candidates, key=lambda path: path.stat().st_size)
    if media_path.stat().st_size > MAX_BYTES:
        raise HTTPException(status_code=413, detail="This video is larger than the 100 MB analysis limit.")
    return media_path, info


def analyze_with_gemini(media_path: Path) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini is not configured on the media worker.")
    client = genai.Client(api_key=api_key)
    uploaded = None
    try:
        uploaded = client.files.upload(file=media_path)
        deadline = time.monotonic() + 90
        while not uploaded.state or uploaded.state.name == "PROCESSING":
            if time.monotonic() >= deadline:
                raise HTTPException(status_code=504, detail="Gemini took too long to process this video.")
            time.sleep(3)
            uploaded = client.files.get(name=uploaded.name)
        if uploaded.state.name != "ACTIVE":
            raise HTTPException(status_code=502, detail="Gemini could not process this video.")
        response = client.models.generate_content(
            model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=[uploaded, ANALYSIS_PROMPT],
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        result = json.loads(response.text or "{}")
        if not isinstance(result, dict) or not result.get("title") or not result.get("summary"):
            raise HTTPException(status_code=502, detail="Gemini returned an incomplete video analysis.")
        return result
    finally:
        if uploaded and uploaded.name:
            try:
                client.files.delete(name=uploaded.name)
            except Exception:
                pass
