from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from .config import settings


@contextmanager
def get_db_conn():
    try:
        conn = psycopg.connect(settings.supabase_db_url, row_factory=dict_row)
    except psycopg.OperationalError as exc:
        if "getaddrinfo failed" in str(exc):
            raise RuntimeError(
                "Could not resolve Supabase DB host. If using "
                "'db.<project-ref>.supabase.co', switch to the Supabase pooler "
                "connection string in SUPABASE_DB_URL (IPv4-friendly), or use a network with IPv6."
            ) from exc
        raise

    try:
        yield conn
    finally:
        conn.close()