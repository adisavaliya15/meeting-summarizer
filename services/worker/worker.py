import time
import traceback

from app.config import settings, validate_settings
from app.db import claim_next_job, get_conn, mark_job_done, mark_job_retry_or_failed, recover_stale_jobs
from app.handlers import handle_finalize_session, handle_summarize_chunk, handle_summarize_note, handle_transcribe_chunk


def _process_job(job: dict):
    job_id = job["id"]
    job_type = job["type"]
    payload = job["payload"] or {}

    with get_conn() as conn:
        if job_type == "TRANSCRIBE_CHUNK":
            handle_transcribe_chunk(conn, payload)
        elif job_type == "SUMMARIZE_CHUNK":
            handle_summarize_chunk(conn, payload)
        elif job_type == "FINALIZE_SESSION":
            handle_finalize_session(conn, payload)
        elif job_type == "SUMMARIZE_NOTE":
            handle_summarize_note(conn, payload)
        else:
            raise ValueError(f"Unsupported job type: {job_type}")

        mark_job_done(conn, job_id)



def _mark_related_entities_error(job: dict, error_message: str):
    job_type = job.get("type")
    payload = job.get("payload") or {}
    chunk_id = payload.get("chunk_id")

    if job_type in {"TRANSCRIBE_CHUNK", "SUMMARIZE_CHUNK"} and chunk_id:
        with get_conn() as conn:
            conn.execute(
                """
                update chunks
                set status = 'ERROR'
                where id = %s
                """,
                (chunk_id,),
            )
            conn.commit()



def run():
    validate_settings()
    print(f"Worker started: {settings.worker_id}")
    print(f"Polling every {settings.poll_interval_sec}s")

    last_stale_recovery = 0.0

    while True:
        try:
            now = time.time()
            if now - last_stale_recovery > 60:
                with get_conn() as conn:
                    recovered = recover_stale_jobs(conn)
                    if recovered:
                        print(f"Recovered {recovered} stale RUNNING jobs")
                last_stale_recovery = now

            with get_conn() as conn:
                job = claim_next_job(conn, settings.worker_id)

            if not job:
                time.sleep(settings.poll_interval_sec)
                continue

            print(f"Claimed job {job['id']} ({job['type']}) attempt={job['attempts']}")

            try:
                _process_job(job)
                print(f"Completed job {job['id']}")
            except Exception as exc:  # noqa: BLE001
                error_message = f"{type(exc).__name__}: {exc}"
                print(f"Failed job {job['id']}: {error_message}")
                traceback.print_exc()

                _mark_related_entities_error(job, error_message)

                with get_conn() as conn:
                    mark_job_retry_or_failed(
                        conn,
                        job_id=job["id"],
                        attempts=job["attempts"],
                        max_attempts=settings.max_attempts,
                        error_message=error_message,
                    )

        except Exception as loop_exc:  # noqa: BLE001
            print(f"Worker loop error: {loop_exc}")
            traceback.print_exc()
            time.sleep(settings.poll_interval_sec)


if __name__ == "__main__":
    run()
