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

    return {"overall_summary": raw.strip()}


def finalize_session_summary(chunk_summaries: list[dict[str, Any]]) -> dict[str, Any]:
    prompt = f"""
You are generating a final meeting summary from per-chunk summaries.
Return strict JSON with this schema:
{{
  "overall_summary": string,
  "key_takeaways": string[],
  "action_items": string[],
  "decisions": string[],
  "risks": string[],
  "open_questions": string[],
  "topic_timeline": [{{"topic": string, "chunk_index": number}}]
}}

Chunk summaries JSON:
{json.dumps(chunk_summaries, ensure_ascii=True)}
""".strip()

    data = _call_ollama_json(prompt)

    return {
        "overall_summary": data.get("overall_summary", ""),
        "key_takeaways": data.get("key_takeaways", []) if isinstance(data.get("key_takeaways"), list) else [],
        "action_items": data.get("action_items", []) if isinstance(data.get("action_items"), list) else [],
        "decisions": data.get("decisions", []) if isinstance(data.get("decisions"), list) else [],
        "risks": data.get("risks", []) if isinstance(data.get("risks"), list) else [],
        "open_questions": data.get("open_questions", []) if isinstance(data.get("open_questions"), list) else [],
        "topic_timeline": data.get("topic_timeline", []) if isinstance(data.get("topic_timeline"), list) else [],
    }


def render_final_summary_markdown(summary: dict[str, Any]) -> str:
    lines = ["# Final Meeting Summary", "", summary.get("overall_summary", "").strip(), ""]

    def append_list(title: str, key: str):
        values = summary.get(key, [])
        if not values:
            return
        lines.append(f"## {title}")
        for item in values:
            lines.append(f"- {item}")
        lines.append("")

    append_list("Key Takeaways", "key_takeaways")
    append_list("Action Items", "action_items")
    append_list("Decisions", "decisions")
    append_list("Risks", "risks")
    append_list("Open Questions", "open_questions")

    timeline = summary.get("topic_timeline", [])
    if timeline:
        lines.append("## Topic Timeline")
        for item in timeline:
            topic = item.get("topic", "") if isinstance(item, dict) else str(item)
            idx = item.get("chunk_index") if isinstance(item, dict) else None
            if idx is None:
                lines.append(f"- {topic}")
            else:
                lines.append(f"- Chunk {idx}: {topic}")
        lines.append("")

    return "\n".join(lines).strip()