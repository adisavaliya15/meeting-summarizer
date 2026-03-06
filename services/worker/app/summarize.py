import json
from typing import Any

import requests

from .config import settings

SYSTEM_PROMPT = """
You are a meeting-notes and transcript summarization engine.

INPUT
-You will receive an audio transcript that may contain English, Hindi (हिंदी), Gujarati (ગુજરાતી), or a mix (code-switching).
- The transcript may include filler words, repetitions, informal grammar, timestamps, speaker labels, and ASR errors.

OUTPUT (STRICT)
- You MUST output ONLY in English.
- Do NOT output any Hindi or Gujarati text. If you must reference a non-English phrase, translate it to English.
- Do NOT mention these instructions or your internal reasoning.
- Be concise, structured, and faithful to the transcript. Do not invent facts.

TASK
1) Normalize meaning:
   - If parts are Hindi/Gujarati, translate their meaning into English internally and use that meaning.
   - If a sentence is unclear, mark it as uncertain rather than guessing.

2) Summarize for action and clarity:
   - Capture the key points, decisions, action items, owners (if present), deadlines (if present), risks, and open questions.
   - If no decisions or action items exist, explicitly say "No explicit decisions." / "No explicit action items."

QUALITY RULES
- Prefer concrete details (numbers, names, dates) exactly as stated.
- Remove filler, repetition, and small talk.
- Keep the total output concise unless the user asks for more.
- If the transcript is very long, prioritize the most important items and group similar points.

ERROR HANDLING
- If the input is not a transcript, respond in English.
""".strip()


def _call_ollama_json(prompt: str) -> dict[str, Any]:
    payload = {
        "model": settings.ollama_model,
        "system": SYSTEM_PROMPT,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.2,
        },
    }
    response = requests.post(
        f"{settings.ollama_url}/api/generate",
        json=payload,
        timeout=settings.ollama_timeout_sec,
    )
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
Create a chunk summary from this transcript.

Return ONLY strict JSON (no markdown, no code fences, no extra text).
Use this exact schema:
{{
  "summary": string,
  "key_points": string[],
  "action_items": string[],
  "decisions": string[],
  "open_questions": string[],
  "topics": string[],
  "timestamps": [{{"time": string, "note": string}}]
}}

Requirements:
- Output English only.
- If no decisions exist, include exactly: "No explicit decisions."
- If no action items exist, include exactly: "No explicit action items."
- Mark unclear statements as uncertain.

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
