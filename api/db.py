"""
db.py — SQLite 연결 및 모든 CRUD 작업

테이블 구조:
  sessions      : 날짜 기반 세션 (하루 1개)
  messages      : 세션에 속한 대화 메시지
  memory_layers : 압축된 기억 (layer 2: 패턴, layer 3: 장기 프로필)
"""

import os
import sqlite3
import json
from contextlib import contextmanager
from typing import List, Dict, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'journal.db')


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        c = conn.cursor()

        # 날짜 기반 세션 (하루에 1개)
        c.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                date        TEXT UNIQUE NOT NULL,
                started_at  TEXT NOT NULL,
                ended_at    TEXT,
                raw_summary TEXT
            )
        ''')

        # 메시지 (session_id로 세션 연결)
        # 기존 messages 테이블이 있으면 session_id 컬럼만 추가
        c.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER REFERENCES sessions(id),
                role       TEXT NOT NULL,
                content    TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # 기존 테이블에 session_id 컬럼이 없으면 추가 (마이그레이션)
        cols = [row[1] for row in c.execute("PRAGMA table_info(messages)")]
        if 'session_id' not in cols:
            c.execute("ALTER TABLE messages ADD COLUMN session_id INTEGER REFERENCES sessions(id)")
        if 'created_at' not in cols:
            c.execute("ALTER TABLE messages ADD COLUMN created_at TEXT")

        # 압축 기억 레이어
        # layer=2 : 패턴 요약 (7세션마다 갱신)
        # layer=3 : 장기 프로필 (30세션마다 갱신)
        c.execute('''
            CREATE TABLE IF NOT EXISTS memory_layers (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                layer            INTEGER NOT NULL,
                content          TEXT NOT NULL,
                sessions_covered TEXT,
                created_at       TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')


# ── 세션 ──────────────────────────────────────────────

def get_session_by_date(date: str) -> Optional[Dict]:
    with get_conn() as conn:
        row = conn.execute('SELECT * FROM sessions WHERE date = ?', (date,)).fetchone()
        return dict(row) if row else None


def create_session(date: str, started_at: str) -> int:
    with get_conn() as conn:
        c = conn.execute(
            'INSERT INTO sessions (date, started_at) VALUES (?, ?)',
            (date, started_at)
        )
        return c.lastrowid


def close_session(session_id: int, ended_at: str, summary: str):
    with get_conn() as conn:
        conn.execute(
            'UPDATE sessions SET ended_at = ?, raw_summary = ? WHERE id = ?',
            (ended_at, summary, session_id)
        )


def get_unclosed_sessions_before(date: str) -> List[Dict]:
    """오늘 이전 날짜 중 아직 닫히지 않은 세션."""
    with get_conn() as conn:
        rows = conn.execute(
            'SELECT * FROM sessions WHERE date < ? AND ended_at IS NULL',
            (date,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_recent_sessions_with_summaries(limit: int = 3) -> List[Dict]:
    """raw_summary가 있는 최근 세션을 최신순으로 반환."""
    with get_conn() as conn:
        rows = conn.execute(
            'SELECT * FROM sessions WHERE raw_summary IS NOT NULL AND raw_summary != "" ORDER BY date DESC LIMIT ?',
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def count_sessions_with_summaries() -> int:
    with get_conn() as conn:
        return conn.execute(
            'SELECT COUNT(*) FROM sessions WHERE raw_summary IS NOT NULL AND raw_summary != ""'
        ).fetchone()[0]


def get_sessions_count_since_last_layer(layer: int) -> int:
    """마지막 해당 레이어 생성 이후 요약된 세션 수."""
    with get_conn() as conn:
        last = conn.execute(
            'SELECT created_at FROM memory_layers WHERE layer = ? ORDER BY created_at DESC LIMIT 1',
            (layer,)
        ).fetchone()
        if last:
            count = conn.execute(
                'SELECT COUNT(*) FROM sessions WHERE raw_summary IS NOT NULL AND started_at > ?',
                (last['created_at'],)
            ).fetchone()[0]
        else:
            count = conn.execute(
                'SELECT COUNT(*) FROM sessions WHERE raw_summary IS NOT NULL'
            ).fetchone()[0]
        return count


# ── 메시지 ────────────────────────────────────────────

def save_message(session_id: int, role: str, content: str):
    with get_conn() as conn:
        conn.execute(
            'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
            (session_id, role, content)
        )


def load_session_messages(session_id: int) -> List[Dict]:
    """해당 세션의 메시지를 Anthropic 메시지 형식({role, content})으로 반환."""
    with get_conn() as conn:
        rows = conn.execute(
            'SELECT role, content FROM messages WHERE session_id = ? ORDER BY id',
            (session_id,)
        ).fetchall()
        return [{'role': r['role'], 'content': r['content']} for r in rows]


def load_all_messages_paired() -> List[Dict]:
    """히스토리 페이지용: user/assistant 쌍으로 묶어서 반환."""
    with get_conn() as conn:
        rows = conn.execute(
            'SELECT role, content FROM messages ORDER BY id'
        ).fetchall()

    pairs = []
    buffer = {}
    for row in rows:
        role, content = row['role'], row['content']
        if role == 'user':
            buffer = {'user': content}
        elif role == 'assistant' and buffer:
            buffer['assistant'] = content
            pairs.append(buffer)
            buffer = {}
    return pairs


# ── 기억 레이어 ───────────────────────────────────────

def save_memory_layer(layer: int, content: str, sessions_covered: Optional[List[int]] = None):
    covered = json.dumps(sessions_covered) if sessions_covered else None
    with get_conn() as conn:
        conn.execute(
            'INSERT INTO memory_layers (layer, content, sessions_covered) VALUES (?, ?, ?)',
            (layer, content, covered)
        )


def get_latest_memory_layer(layer: int) -> Optional[Dict]:
    with get_conn() as conn:
        row = conn.execute(
            'SELECT * FROM memory_layers WHERE layer = ? ORDER BY created_at DESC LIMIT 1',
            (layer,)
        ).fetchone()
        return dict(row) if row else None


init_db()
