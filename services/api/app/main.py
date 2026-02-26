import uuid
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from psycopg.errors import UniqueViolation
from psycopg.types.json import Json

from .auth import CurrentUser, get_current_user
from .config import settings, validate_settings
from .db import get_db_conn
from .models import ChunkInitRequest, ChunkUploadedRequest, SessionCreateRequest
from .supabase_storage import create_signed_upload_url, delete_storage_object

validate_settings()

app = FastAPI(title="Meeting Summarizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health(current_user: CurrentUser = Depends(get_current_user)) -> dict[str, Any]:
    return {"ok": True, "service": "meeting-summarizer-api", "user_id": current_user.id}


@app.post("/api/sessions")
def create_session(
    body: SessionCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db_conn() as conn:
        row = conn.execute(
            """
            insert into sessions (owner_id, title)
            values (%s, %s)
            returning *
            """,
            (current_user.id, body.title.strip()),
        ).fetchone()
        conn.commit()

    return {"session": row}


@app.get("/api/sessions")
def list_sessions(current_user: CurrentUser = Depends(get_current_user)) -> dict[str, Any]:
    with get_db_conn() as conn:
        rows = conn.execute(
            """
            select
              s.*,
              count(c.id)::int as chunk_count,
              count(c.id) filter (where c.chunk_summary is not null)::int as summarized_chunk_count
            from sessions s
            left join chunks c on c.session_id = s.id
            where s.owner_id = %s
            group by s.id
            order by s.created_at desc
            """,
            (current_user.id,),
        ).fetchall()

    return {"sessions": rows}


@app.get("/api/sessions/{session_id}")
def get_session(
    session_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db_conn() as conn:
        session = conn.execute(
            """
            select *
            from sessions
            where id = %s and owner_id = %s
            """,
            (session_id, current_user.id),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        chunks = conn.execute(
            """
            select *
            from chunks
            where session_id = %s and owner_id = %s
            order by idx asc
            """,
            (session_id, current_user.id),
        ).fetchall()

        jobs = conn.execute(
            """
            select j.*
            from jobs j
            where j.owner_id = %s
              and (
                j.payload->>'session_id' = %s
                or (
                  j.payload ? 'chunk_id'
                  and exists (
                    select 1
                    from chunks c
                    where c.session_id = %s
                      and c.id = (j.payload->>'chunk_id')::uuid
                  )
                )
              )
            order by j.created_at desc
            limit 200
            """,
            (current_user.id, str(session_id), session_id),
        ).fetchall()

    return {"session": session, "chunks": chunks, "jobs": jobs}


@app.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    storage_objects: list[dict[str, Any]] = []

    with get_db_conn() as conn:
        session = conn.execute(
            "select id from sessions where id = %s and owner_id = %s",
            (session_id, current_user.id),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        storage_objects = conn.execute(
            """
            select storage_bucket, storage_key
            from chunks
            where session_id = %s and owner_id = %s
            """,
            (session_id, current_user.id),
        ).fetchall()

        conn.execute(
            """
            delete from jobs j
            where j.owner_id = %s
              and (
                j.payload->>'session_id' = %s
                or (
                  j.payload ? 'chunk_id'
                  and exists (
                    select 1
                    from chunks c
                    where c.session_id = %s
                      and c.id = (j.payload->>'chunk_id')::uuid
                  )
                )
              )
            """,
            (current_user.id, str(session_id), session_id),
        )

        conn.execute(
            "delete from sessions where id = %s and owner_id = %s",
            (session_id, current_user.id),
        )
        conn.commit()

    for obj in storage_objects:
        storage_key = obj.get("storage_key")
        if not storage_key:
            continue
        try:
            delete_storage_object(obj["storage_bucket"], storage_key)
        except Exception:
            # Best effort cleanup; DB deletion already committed.
            continue

    return {"deleted": True, "session_id": str(session_id)}


@app.post("/api/sessions/{session_id}/finalize")
def finalize_session(
    session_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db_conn() as conn:
        session = conn.execute(
            "select id from sessions where id = %s and owner_id = %s",
            (session_id, current_user.id),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        counts = conn.execute(
            """
            select
              count(*)::int as total_chunks,
              count(*) filter (where chunk_summary is not null)::int as summarized_chunks
            from chunks
            where session_id = %s and owner_id = %s
            """,
            (session_id, current_user.id),
        ).fetchone()

        if counts["total_chunks"] == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot finalize a session with no chunks",
            )

        if counts["summarized_chunks"] < counts["total_chunks"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All chunks must have chunk_summary before finalizing",
            )

        existing_job = conn.execute(
            """
            select id, status
            from jobs
            where owner_id = %s
              and type = 'FINALIZE_SESSION'
              and status in ('PENDING', 'RUNNING')
              and payload->>'session_id' = %s
            order by created_at desc
            limit 1
            """,
            (current_user.id, str(session_id)),
        ).fetchone()

        if existing_job:
            return {"job": existing_job, "already_queued": True}

        job = conn.execute(
            """
            insert into jobs (owner_id, type, status, payload)
            values (%s, 'FINALIZE_SESSION', 'PENDING', %s)
            returning *
            """,
            (current_user.id, Json({"session_id": str(session_id)})),
        ).fetchone()
        conn.commit()

    return {"job": job}


@app.post("/api/sessions/{session_id}/chunks/init")
def init_chunk(
    session_id: uuid.UUID,
    body: ChunkInitRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    bucket = "recordings"
    chunk_id = uuid.uuid4()
    storage_key = f"{current_user.id}/{session_id}/{chunk_id}.webm"

    with get_db_conn() as conn:
        session = conn.execute(
            "select id from sessions where id = %s and owner_id = %s",
            (session_id, current_user.id),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        try:
            chunk = conn.execute(
                """
                insert into chunks (
                  id,
                  session_id,
                  owner_id,
                  idx,
                  storage_bucket,
                  storage_key,
                  mime_type,
                  status
                )
                values (%s, %s, %s, %s, %s, %s, %s, 'WAITING_UPLOAD')
                returning *
                """,
                (
                    chunk_id,
                    session_id,
                    current_user.id,
                    body.idx,
                    bucket,
                    storage_key,
                    body.mime_type,
                ),
            ).fetchone()
            conn.commit()
        except UniqueViolation as exc:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Chunk index {body.idx} already exists for this session",
            ) from exc

    signed = create_signed_upload_url(bucket=bucket, storage_key=storage_key)

    return {
        "chunk_id": str(chunk["id"]),
        "bucket": bucket,
        "storage_key": storage_key,
        "signed_upload_url": signed["signed_upload_url"],
        "signed_upload_token": signed.get("signed_upload_token"),
    }


@app.delete("/api/chunks/{chunk_id}")
def delete_chunk(
    chunk_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    storage_bucket = "recordings"
    storage_key = None

    with get_db_conn() as conn:
        chunk = conn.execute(
            """
            select id, storage_bucket, storage_key
            from chunks
            where id = %s and owner_id = %s
            """,
            (chunk_id, current_user.id),
        ).fetchone()

        if not chunk:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found")

        storage_bucket = chunk["storage_bucket"]
        storage_key = chunk["storage_key"]

        conn.execute(
            """
            delete from jobs
            where owner_id = %s
              and payload->>'chunk_id' = %s
            """,
            (current_user.id, str(chunk_id)),
        )

        conn.execute(
            "delete from chunks where id = %s and owner_id = %s",
            (chunk_id, current_user.id),
        )
        conn.commit()

    if storage_key:
        try:
            delete_storage_object(storage_bucket, storage_key)
        except Exception:
            # Best effort cleanup; DB deletion already committed.
            pass

    return {"deleted": True, "chunk_id": str(chunk_id)}


@app.post("/api/chunks/{chunk_id}/uploaded")
def mark_chunk_uploaded(
    chunk_id: uuid.UUID,
    body: ChunkUploadedRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    with get_db_conn() as conn:
        chunk = conn.execute(
            """
            update chunks
            set duration_sec = %s,
                status = 'UPLOADED'
            where id = %s and owner_id = %s
            returning *
            """,
            (body.duration_sec, chunk_id, current_user.id),
        ).fetchone()

        if not chunk:
            conn.rollback()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found")

        existing_job = conn.execute(
            """
            select id, status
            from jobs
            where owner_id = %s
              and type = 'TRANSCRIBE_CHUNK'
              and status in ('PENDING', 'RUNNING')
              and payload->>'chunk_id' = %s
            order by created_at desc
            limit 1
            """,
            (current_user.id, str(chunk_id)),
        ).fetchone()

        if existing_job:
            conn.commit()
            return {"chunk": chunk, "job": existing_job, "already_queued": True}

        job = conn.execute(
            """
            insert into jobs (owner_id, type, status, payload)
            values (%s, 'TRANSCRIBE_CHUNK', 'PENDING', %s)
            returning *
            """,
            (
                current_user.id,
                Json({"chunk_id": str(chunk_id), "session_id": str(chunk["session_id"])}),
            ),
        ).fetchone()

        conn.commit()

    return {"chunk": chunk, "job": job}
