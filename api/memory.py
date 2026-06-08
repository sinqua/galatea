"""
memory.py — 3계층 장기기억 관리

Layer 1 : raw_summary  — 세션 종료 시 LLM이 생성하는 당일 요약 (sessions.raw_summary)
Layer 2 : pattern      — 7세션마다 LLM이 추출하는 반복 패턴 (memory_layers, layer=2)
Layer 3 : profile      — 30세션마다 LLM이 갱신하는 사용자 장기 이해 (memory_layers, layer=3)

세션 경계: 날짜 기반 (하루 1세션).
날짜가 바뀌면 이전 열린 세션을 자동으로 닫고 요약을 생성한다.
"""

from datetime import datetime, timezone
from typing import Optional
import db

PATTERN_INTERVAL = 7    # N세션마다 패턴 요약 갱신
PROFILE_INTERVAL = 30   # N세션마다 장기 프로필 갱신


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return datetime.now().strftime('%Y-%m-%d')


# ── 세션 라이프사이클 ──────────────────────────────────

def get_or_create_today_session() -> int:
    """
    오늘 날짜의 session_id를 반환한다.
    - 없으면 새로 생성.
    - 이전 날짜에 열려 있는 세션이 있으면 자동으로 닫고 요약 생성.
    """
    today = _today()
    _close_stale_sessions(today)

    session = db.get_session_by_date(today)
    if session:
        return session['id']

    return db.create_session(today, _now_iso())


def _close_stale_sessions(today: str):
    """날짜가 지난 미완료 세션들을 닫고 요약을 생성한다."""
    stale = db.get_unclosed_sessions_before(today)
    if not stale:
        return

    import llm  # 순환 import 방지를 위해 지연 import

    for session in stale:
        messages = db.load_session_messages(session['id'])
        if not messages:
            db.close_session(session['id'], _now_iso(), '')
            continue

        summary = llm.summarize_session(messages, session['date'])
        db.close_session(session['id'], _now_iso(), summary)

    # 충분한 세션이 쌓였으면 상위 레이어 갱신
    maybe_generate_pattern()
    maybe_update_profile()


# ── 상위 레이어 갱신 ──────────────────────────────────

def maybe_generate_pattern():
    """마지막 패턴 생성 이후 PATTERN_INTERVAL개 이상 세션이 쌓이면 패턴 요약 갱신."""
    if db.get_sessions_count_since_last_layer(2) < PATTERN_INTERVAL:
        return

    import llm

    recent_sessions = db.get_recent_sessions_with_summaries(limit=14)
    summaries = [
        f"[{s['date']}] {s['raw_summary']}"
        for s in recent_sessions
        if s['raw_summary']
    ]
    if len(summaries) < 3:
        return

    pattern = llm.extract_patterns(summaries)
    session_ids = [s['id'] for s in recent_sessions]
    db.save_memory_layer(2, pattern, session_ids)


def maybe_update_profile():
    """마지막 프로필 갱신 이후 PROFILE_INTERVAL개 이상 세션이 쌓이면 장기 프로필 갱신."""
    if db.get_sessions_count_since_last_layer(3) < PROFILE_INTERVAL:
        return

    import llm

    current = db.get_latest_memory_layer(3)
    current_content = current['content'] if current else ''

    pattern = db.get_latest_memory_layer(2)
    pattern_content = pattern['content'] if pattern else ''

    recent_sessions = db.get_recent_sessions_with_summaries(limit=10)
    recent_summaries = '\n'.join(
        f"[{s['date']}] {s['raw_summary']}" for s in recent_sessions
    )

    new_profile = llm.update_profile(current_content, pattern_content, recent_summaries)
    db.save_memory_layer(3, new_profile)


# ── 기억 컨텍스트 조립 ────────────────────────────────

def build_memory_context() -> str:
    """
    3개 레이어를 조합해 system prompt에 주입할 문자열을 반환한다.
    데이터가 없으면 빈 문자열 반환.
    """
    parts = []

    # Layer 1: 최근 3일 요약 (구체적 맥락)
    recent = db.get_recent_sessions_with_summaries(limit=3)
    if recent:
        parts.append("## 이전 세션 기록")
        for s in reversed(recent):  # 오래된 것부터 → 최근 순
            parts.append(f"[{s['date']}] {s['raw_summary']}")

    # Layer 2: 반복 패턴 (중기 맥락)
    pattern = db.get_latest_memory_layer(2)
    if pattern:
        parts.append("\n## 반복 패턴 (최근 {n}세션 기반)".format(n=PATTERN_INTERVAL))
        parts.append(pattern['content'])

    # Layer 3: 장기 프로필 (누적 이해)
    profile = db.get_latest_memory_layer(3)
    if profile:
        parts.append("\n## 사용자 장기 이해")
        parts.append(profile['content'])

    return '\n'.join(parts)
