from pathlib import Path

from psycopg.types.json import Json

from .finalize import finalize_session_summary, render_final_summary_markdown
from .notes_summary import render_manual_note_summary_markdown, summarize_manual_note
from .storage import download_object
from .summarize import summarize_chunk_transcript
from .transcribe import transcribe_audio


def _enqueue_job_if_missing(conn, owner_id: str, job_type: str, payload: dict):
    key_name_by_type = {
        "TRANSCRIBE_CHUNK": "chunk_id",
        "SUMMARIZE_CHUNK": "chunk_id",
        "FINALIZE_SESSION": "session_id",
        "SUMMARIZE_NOTE": "note_id",
    }
    key_name = key_name_by_type.get(job_type, "chunk_id")

    key_val = str(payload.get(key_name))
    existing = conn.execute(
        """
        select id
        from jobs
        where owner_id = %s
          and type = %s
          and status in ('PENDING', 'RUNNING')
          and payload->>%s = %s
        limit 1
        """,
        (owner_id, job_type, key_name, key_val),
    ).fetchone()

    if existing:
        return existing

    return conn.execute(
        """
        insert into jobs (owner_id, type, status, payload)
        values (%s, %s, 'PENDING', %s)
        returning id
        """,
        (owner_id, job_type, Json(payload)),
    ).fetchone()


def handle_transcribe_chunk(conn, job_payload: dict):
    chunk_id = job_payload.get("chunk_id")
    if not chunk_id:
        raise ValueError("TRANSCRIBE_CHUNK payload missing chunk_id")

    chunk = conn.execute(
        """
        select id, owner_id, session_id, storage_bucket, storage_key
        from chunks
        where id = %s
        """,
        (chunk_id,),
    ).fetchone()

    if not chunk:
        raise ValueError(f"Chunk {chunk_id} not found")

    conn.execute("update chunks set status = 'TRANSCRIBING' where id = %s", (chunk_id,))
    conn.commit()

    audio_bytes = download_object(chunk["storage_bucket"], chunk["storage_key"])
    raw_suffix = Path(str(chunk.get("storage_key") or "")).suffix.lower()
    file_suffix = raw_suffix if raw_suffix else ".webm"
    transcript = transcribe_audio(audio_bytes, file_suffix=file_suffix)

    conn.execute(
        """
        update chunks
        set transcript = %s,
            status = 'TRANSCRIBED'
        where id = %s
        """,
        (Json(transcript), chunk_id),
    )

    _enqueue_job_if_missing(
        conn,
        owner_id=str(chunk["owner_id"]),
        job_type="SUMMARIZE_CHUNK",
        payload={"chunk_id": str(chunk_id), "session_id": str(chunk["session_id"])}
    )
    conn.commit()


def handle_summarize_chunk(conn, job_payload: dict):
    chunk_id = job_payload.get("chunk_id")
    if not chunk_id:
        raise ValueError("SUMMARIZE_CHUNK payload missing chunk_id")

    chunk = conn.execute(
        """
        select id, transcript
        from chunks
        where id = %s
        """,
        (chunk_id,),
    ).fetchone()

    if not chunk:
        raise ValueError(f"Chunk {chunk_id} not found")

    transcript = chunk.get("transcript")
    if not transcript:
        raise ValueError(f"Chunk {chunk_id} has no transcript")

    conn.execute("update chunks set status = 'SUMMARIZING' where id = %s", (chunk_id,))
    conn.commit()

    summary = summarize_chunk_transcript(transcript)

    conn.execute(
        """
        update chunks
        set chunk_summary = %s,
            status = 'COMPLETED'
        where id = %s
        """,
        (Json(summary), chunk_id),
    )
    conn.commit()


def handle_finalize_session(conn, job_payload: dict):
    session_id = job_payload.get("session_id")
    if not session_id:
        raise ValueError("FINALIZE_SESSION payload missing session_id")

    session = conn.execute(
        """
        select id, owner_id
        from sessions
        where id = %s
        """,
        (session_id,),
    ).fetchone()

    if not session:
        raise ValueError(f"Session {session_id} not found")

    chunk_rows = conn.execute(
        """
        select idx, chunk_summary
        from chunks
        where session_id = %s
        order by idx asc
        """,
        (session_id,),
    ).fetchall()

    if not chunk_rows:
        raise ValueError(f"Session {session_id} has no chunks")

    missing = [row["idx"] for row in chunk_rows if row.get("chunk_summary") is None]
    if missing:
        raise ValueError(f"Session {session_id} missing chunk summaries for indexes: {missing}")

    summaries = [row["chunk_summary"] for row in chunk_rows]
    final_summary = finalize_session_summary(summaries)
    final_summary_md = render_final_summary_markdown(final_summary)

    conn.execute(
        """
        update sessions
        set final_summary = %s,
            final_summary_md = %s,
            finalized_at = now()
        where id = %s
        """,
        (Json(final_summary), final_summary_md, session_id),
    )
    conn.commit()


def handle_summarize_note(conn, job_payload: dict):
    note_id = job_payload.get("note_id")
    if not note_id:
        raise ValueError("SUMMARIZE_NOTE payload missing note_id")

    note = conn.execute(
        """
        select id, content
        from manual_notes
        where id = %s
        """,
        (note_id,),
    ).fetchone()

    if not note:
        raise ValueError(f"Note {note_id} not found")

    content = str(note.get("content") or "")
    if not content.strip():
        raise ValueError(f"Note {note_id} is empty")

    summary = summarize_manual_note(content)
    summary_md = render_manual_note_summary_markdown(summary)

    conn.execute(
        """
        update manual_notes
        set summary = %s,
            summary_md = %s,
            summarized_at = now()
        where id = %s
        """,
        (Json(summary), summary_md, note_id),
    )
    conn.commit()
