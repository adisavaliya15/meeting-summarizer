import json
from typing import Any

import requests

from .config import settings


def _call_ollama_json(prompt: str) -> dict[str, Any]:
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.2,
        },
    }
    response = requests.post(f"{settings.ollama_url}/api/generate", json=payload, timeout=240)
    response.raise_for_status()

    raw = response.json().get("response", "{}")
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    return {"summary": raw.strip()}


def summarize_chunk_transcript(transcript: dict[str, Any]) -> dict[str, Any]:
    transcript_text = transcript.get("text", "").strip()
    if not transcript_text:
        return {
            "summary": "No transcript text available.",
            "key_points": [],
            "action_items": [],
            "decisions": [],
            "open_questions": [],
            "topics": [],
            "timestamps": [],
        }

    prompt = f"""
You are an assistant that summarizes meeting transcript chunks.
Return only strict JSON.

Required JSON schema:
{{
  "summary": string,
  "key_points": string[],
  "action_items": string[],
  "decisions": string[],
  "open_questions": string[],
  "topics": string[],
  "timestamps": [{{"time": string, "note": string}}]
}}

Transcript chunk:
{transcript_text}
""".strip()

    data = _call_ollama_json(prompt)
    return {
        "summary": data.get("summary", ""),
        "key_points": data.get("key_points", []) if isinstance(data.get("key_points"), list) else [],
        "action_items": data.get("action_items", []) if isinstance(data.get("action_items"), list) else [],
        "decisions": data.get("decisions", []) if isinstance(data.get("decisions"), list) else [],
        "open_questions": data.get("open_questions", []) if isinstance(data.get("open_questions"), list) else [],
        "topics": data.get("topics", []) if isinstance(data.get("topics"), list) else [],
        "timestamps": data.get("timestamps", []) if isinstance(data.get("timestamps"), list) else [],
    }