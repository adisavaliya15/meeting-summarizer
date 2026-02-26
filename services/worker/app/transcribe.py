import os
import tempfile
from typing import Any

from faster_whisper import WhisperModel

from .config import settings

_MODEL = None


def _get_model() -> WhisperModel:
    global _MODEL
    if _MODEL is None:
        _MODEL = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
    return _MODEL


def transcribe_audio(audio_bytes: bytes) -> dict[str, Any]:
    model = _get_model()

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments_iter, info = model.transcribe(tmp_path, vad_filter=True, beam_size=1)

        segments = []
        full_text_parts = []
        for segment in segments_iter:
            text = segment.text.strip()
            if text:
                full_text_parts.append(text)
            segments.append(
                {
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": text,
                }
            )

        return {
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration": round(info.duration, 2),
            "text": " ".join(full_text_parts).strip(),
            "segments": segments,
        }
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass