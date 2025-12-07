import os
import psycopg2
from psycopg2.extras import execute_values


def store_transcript(text: str, speaker: str | None = None, room_code: str | None = None):
    """
    Store a transcript line into a Neon (PostgreSQL) database if NEON_DATABASE_URL is set.
    Creates the table on first use. No-op if URL is missing or text is empty.
    """
    if not text:
        return

    dsn = os.getenv("NEON_DATABASE_URL")
    if not dsn:
        return

    conn = None
    try:
        conn = psycopg2.connect(dsn)
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS transcripts (
                        id SERIAL PRIMARY KEY,
                        room_code TEXT,
                        speaker TEXT,
                        content TEXT NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                    """
                )
                execute_values(
                    cur,
                    "INSERT INTO transcripts (room_code, speaker, content) VALUES %s",
                    [(room_code, speaker, text)],
                )
    except Exception:
        # Silent fail to avoid breaking user flow
        pass
    finally:
        if conn:
            conn.close()
