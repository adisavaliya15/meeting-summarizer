import json
from typing import Any

import requests

from .config import settings

SYSTEM_PROMPT = """
You are a concise note summarization assistant.

OUTPUT RULES
- Output only English.
- Keep statements factual and grounded in the provided note text.
- Do not invent missing details.
- Return only valid JSON.
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
    response = requests.post(f"{settings.ollama_url}/api/generate", json=payload, timeout=120)
    response.raise_for_status()

    raw = response.json().get("response", "{}")
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    return {"summary": raw.strip()}


def summarize_manual_note(content: str) -> dict[str, Any]:
    prompt = f"""
Summarize this manual note.

Return ONLY strict JSON (no markdown, no code fences, no extra text).
Use this exact schema:
{{
  "summary": string,
  "key_points": string[],
  "action_items": string[],
  "open_questions": string[]
}}

Rules:
- Keep it concise and practical.
- If no explicit action items exist, include exactly: "No explicit action items."
- If no open questions exist, include exactly: "No explicit open questions."

Manual note:
{content.strip()}
""".strip()

    data = _call_ollama_json(prompt)
    return {
        "summary": data.get("summary", ""),
        "key_points": data.get("key_points", []) if isinstance(data.get("key_points"), list) else [],
        "action_items": data.get("action_items", []) if isinstance(data.get("action_items"), list) else [],
        "open_questions": data.get("open_questions", []) if isinstance(data.get("open_questions"), list) else [],
    }


def render_manual_note_summary_markdown(summary: dict[str, Any]) -> str:
    lines = ["# Manual Note Summary", "", summary.get("summary", "").strip(), ""]

    def append_list(title: str, key: str):
        values = summary.get(key, [])
        if not values:
            return
        lines.append(f"## {title}")
        for item in values:
            lines.append(f"- {item}")
        lines.append("")

    append_list("Key Points", "key_points")
    append_list("Action Items", "action_items")
    append_list("Open Questions", "open_questions")
    return "\n".join(lines).strip()
