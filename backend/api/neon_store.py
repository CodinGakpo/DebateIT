# api/neon_store.py
import os
import json
import logging
from typing import Optional, Dict, Any, Iterable, List

import psycopg2
from psycopg2.extras import execute_values, Json
from psycopg2 import sql
from asgiref.sync import sync_to_async

LOG = logging.getLogger(__name__)


def _get_dsn() -> Optional[str]:
    """
    Read NEON_DATABASE_URL from env.
    """
    dsn = os.getenv("NEON_DATABASE_URL")
    if not dsn:
        LOG.debug("NEON_DATABASE_URL not set")
        return None
    return dsn


def _get_conn():
    """
    Return a new psycopg2 connection using the Neon DSN.
    Caller should close the connection.
    """
    dsn = _get_dsn()
    if not dsn:
        return None
    try:
        return psycopg2.connect(dsn)
    except Exception as e:
        LOG.exception("Failed to connect to Neon: %s", e)
        return None


# ----------------------------
# Helper: create table if not exists
# ----------------------------
def _ensure_table_exists(conn, create_sql: str):
    with conn.cursor() as cur:
        cur.execute(create_sql)
    conn.commit()


# ----------------------------
# 1) transcripts (speech text)
# ----------------------------
def store_transcript(room_code, speaker, content, source=-1):

    """
    Synchronously store a single transcript row.
    """
    if not content:
        return

    conn = _get_conn()
    if conn is None:
        LOG.debug("No DB connection available for store_transcript")
        return

    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS transcripts (
            id SERIAL PRIMARY KEY,
            room_code TEXT,
            speaker TEXT,
            content TEXT NOT NULL,
            source INT DEFAULT -1,  -- NEW FIELD
            created_at TIMESTAMPTZ DEFAULT NOW()
        )

        """
        _ensure_table_exists(conn, create_sql)

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO transcripts (room_code, speaker, content, source) VALUES (%s, %s, %s, %s)",
                (room_code, speaker, content, source),
            )

        conn.commit()
    except Exception:
        LOG.exception("Failed to store transcript")
    finally:
        conn.close()


# Async wrapper (use from async code)
async_store_transcript = sync_to_async(store_transcript, thread_sensitive=True)


# ----------------------------
# 2) debate_turns (one row per turn)
# ----------------------------
def store_debate_turn(room_code: str, turn_number: int, user_email: str, content: str):
    """
    Store a debate turn (argument). Creates table if needed.
    """
    if not content:
        return

    conn = _get_conn()
    if conn is None:
        LOG.debug("No DB connection available for store_debate_turn")
        return

    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS debate_turns (
            id SERIAL PRIMARY KEY,
            room_code TEXT NOT NULL,
            turn_number INT NOT NULL,
            user_email TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
        _ensure_table_exists(conn, create_sql)

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO debate_turns (room_code, turn_number, user_email, content) VALUES (%s, %s, %s, %s)",
                (room_code, turn_number, user_email, content),
            )
        conn.commit()
    except Exception:
        LOG.exception("Failed to store debate turn")
    finally:
        conn.close()


async_store_debate_turn = sync_to_async(store_debate_turn, thread_sensitive=True)


# ----------------------------
# 3) store_score (JSONB)
# ----------------------------
def store_score(room_code: str, turn_number: int, user_email: str, scores: Dict[str, Any]):
    """
    Store scoring / evaluation (arbitrary JSON) for a particular turn.
    """
    if not scores:
        return

    conn = _get_conn()
    if conn is None:
        LOG.debug("No DB connection available for store_score")
        return

    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS debate_scores (
            id SERIAL PRIMARY KEY,
            room_code TEXT NOT NULL,
            turn_number INT NOT NULL,
            user_email TEXT NOT NULL,
            score_data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
        _ensure_table_exists(conn, create_sql)

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO debate_scores (room_code, turn_number, user_email, score_data) VALUES (%s, %s, %s, %s)",
                (room_code, turn_number, user_email, Json(scores)),
            )
        conn.commit()
    except Exception:
        LOG.exception("Failed to store score")
    finally:
        conn.close()


async_store_score = sync_to_async(store_score, thread_sensitive=True)


# ----------------------------
# 4) room events (join/leave)
# ----------------------------
def store_room_event(room_code: str, user_email: str, event_type: str):
    """
    Store user events: 'join', 'leave', 'disconnect', etc.
    """
    conn = _get_conn()
    if conn is None:
        LOG.debug("No DB connection available for store_room_event")
        return

    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS room_events (
            id SERIAL PRIMARY KEY,
            room_code TEXT NOT NULL,
            user_email TEXT NOT NULL,
            event_type TEXT NOT NULL,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
        _ensure_table_exists(conn, create_sql)

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO room_events (room_code, user_email, event_type) VALUES (%s, %s, %s)",
                (room_code, user_email, event_type),
            )
        conn.commit()
    except Exception:
        LOG.exception("Failed to store room event")
    finally:
        conn.close()


async_store_room_event = sync_to_async(store_room_event, thread_sensitive=True)


# ----------------------------
# 5) audio / speaking events (JSON)
# ----------------------------
def store_audio_event(room_code: str, user_email: str, event: Dict[str, Any]):
    """
    event example: {"muted": True, "isSpeaking": False}
    """
    conn = _get_conn()
    if conn is None:
        LOG.debug("No DB connection available for store_audio_event")
        return

    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS audio_events (
            id SERIAL PRIMARY KEY,
            room_code TEXT NOT NULL,
            user_email TEXT NOT NULL,
            event JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
        _ensure_table_exists(conn, create_sql)

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO audio_events (room_code, user_email, event) VALUES (%s, %s, %s)",
                (room_code, user_email, Json(event)),
            )
        conn.commit()
    except Exception:
        LOG.exception("Failed to store audio event")
    finally:
        conn.close()


async_store_audio_event = sync_to_async(store_audio_event, thread_sensitive=True)


# ----------------------------
# 6) Bulk insert helper (useful if you ever batch)
# ----------------------------
def bulk_insert_debate_turns(rows: Iterable[tuple]):
    """
    rows: iterable of tuples (room_code, turn_number, user_email, content)
    """
    conn = _get_conn()
    if conn is None:
        LOG.debug("No DB connection available for bulk_insert_debate_turns")
        return

    try:
        create_sql = """
        CREATE TABLE IF NOT EXISTS debate_turns (
            id SERIAL PRIMARY KEY,
            room_code TEXT NOT NULL,
            turn_number INT NOT NULL,
            user_email TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
        _ensure_table_exists(conn, create_sql)

        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO debate_turns (room_code, turn_number, user_email, content) VALUES %s",
                list(rows),
            )
        conn.commit()
    except Exception:
        LOG.exception("Failed bulk insert debate turns")
    finally:
        conn.close()


# ----------------------------
# Utility: read last N transcripts (optional)
# ----------------------------
def fetch_latest_transcripts(room_code: str, limit: int = 50) -> List[Dict[str, Any]]:
    conn = _get_conn()
    if conn is None:
        return []

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, room_code, speaker, content, created_at FROM transcripts WHERE room_code = %s ORDER BY created_at DESC LIMIT %s",
                (room_code, limit),
            )
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            result = [dict(zip(cols, r)) for r in rows]
            return result
    except Exception:
        LOG.exception("Failed to fetch latest transcripts")
        return []
    finally:
        conn.close()


async_fetch_latest_transcripts = sync_to_async(fetch_latest_transcripts, thread_sensitive=True)
