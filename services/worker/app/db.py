import psycopg
from psycopg.rows import dict_row

from .config import settings


def get_conn():
    try:
        return psycopg.connect(settings.supabase_db_url, row_factory=dict_row)
    except psycopg.OperationalError as exc:
        if "getaddrinfo failed" in str(exc):
            raise RuntimeError(
                "Could not resolve Supabase DB host. Use the Supabase pooler connection "
                "string in SUPABASE_DB_URL (IPv4-friendly), or run on a network with IPv6."
            ) from exc
        raise


def recover_stale_jobs(conn) -> int:
    result = conn.execute(
        """
        update jobs
        set status = 'PENDING',
            locked_at = null,
            locked_by = null,
            last_error = concat(coalesce(last_error, ''), case when coalesce(last_error, '') = '' then '' else ' | ' end, 'Recovered stale lock')
        where status = 'RUNNING'
          and locked_at < now() - interval '30 minutes'
        """
    )
    conn.commit()
    return result.rowcount


def claim_next_job(conn, worker_id: str):
    with conn.transaction():
        job = conn.execute(
            """
            select *
            from jobs
            where status = 'PENDING'
            order by created_at asc
            for update skip locked
            limit 1
            """
        ).fetchone()

        if not job:
            return None

        claimed = conn.execute(
            """
            update jobs
            set status = 'RUNNING',
                locked_at = now(),
                locked_by = %s,
                attempts = attempts + 1
            where id = %s
            returning *
            """,
            (worker_id, job["id"]),
        ).fetchone()

    return claimed


def mark_job_done(conn, job_id):
    conn.execute(
        """
        update jobs
        set status = 'DONE',
            locked_at = null,
            locked_by = null,
            last_error = null
        where id = %s
        """,
        (job_id,),
    )
    conn.commit()


def mark_job_retry_or_failed(conn, job_id, attempts: int, max_attempts: int, error_message: str):
    if attempts >= max_attempts:
        conn.execute(
            """
            update jobs
            set status = 'FAILED',
                locked_at = null,
                locked_by = null,
                last_error = %s
            where id = %s
            """,
            (error_message[:4000], job_id),
        )
    else:
        conn.execute(
            """
            update jobs
            set status = 'PENDING',
                locked_at = null,
                locked_by = null,
                last_error = %s
            where id = %s
            """,
            (error_message[:4000], job_id),
        )
    conn.commit()