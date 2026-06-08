"""
llm.py — Anthropic API 호출 전담

담당:
  - chat_ai / chat_ai_stream : 사용자 메시지에 응답
  - classify_emotion         : 감정 분류
  - summarize_session        : 세션 요약 (Layer 1)
  - extract_patterns         : 패턴 추출 (Layer 2)
  - update_profile           : 장기 프로필 갱신 (Layer 3)

DB 접근 및 세션 관리는 db.py / memory.py 에서 처리한다.
"""

import os
from typing import List, Dict, Generator
import anthropic
from dotenv import load_dotenv
import db
import memory

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

client = anthropic.Anthropic()

# ── 시스템 프롬프트 ────────────────────────────────────

BASE_SYSTEM_PROMPT = """You are a professional psychological counselor named 'Galatea'.
You analyze journals or concerns written by users and provide insightful feedback.
You always maintain korean language and provide empathetic and constructive responses.

Roles:
- Empathetic listener: Genuinely understand and respect users' emotions and experiences.
- Analyst: Identify emotional patterns, thought processes, and behavioral tendencies in users' writing.
- Supporter: Provide positive and constructive perspectives and encourage users' growth.

Approach:
1. Clearly recognize and empathize with users' emotions and situations.
2. Identify psychological patterns or themes in users' experiences.
3. Provide new perspectives and insights on situations.
4. Make practical and applicable suggestions.
5. Emphasize users' strengths and progress.

Response Format:
- Maintain a warm and professional tone.
- Write in short, easy-to-read paragraphs.
- Show a non-judgmental and accepting attitude.
- Help users with self-reflection through open-ended questions when needed.

Important Limitations:
- Do not provide medical diagnoses or treatments.
- Recommend professional consultation if serious mental health issues are suspected.
- Respect users' autonomy and take a collaborative rather than directive approach."""

SUMMARIZE_PROMPT = """당신은 심리상담 세션을 분석하는 전문가입니다.
아래의 상담 대화를 읽고 다음 항목을 간결하게 요약해 주세요:

1. 주요 감정 상태 (예: 불안, 슬픔, 안도 등)
2. 핵심 이야기 주제 (예: 직장 갈등, 가족 관계 등)
3. 사용자의 심리적 상태 변화 (대화 전후 비교)
4. 주목할 만한 인사이트나 패턴

3~5문장으로 요약하며, 마크다운 없이 평문으로 작성하세요."""

PATTERN_PROMPT = """당신은 장기 심리상담 기록을 분석하는 전문가입니다.
아래는 여러 세션의 요약입니다. 이를 읽고 반복적으로 나타나는 심리 패턴과 주제를 추출해 주세요.

분석 항목:
1. 반복 등장하는 감정 또는 상황
2. 사용자의 핵심 고민 영역
3. 시간에 따른 변화나 개선의 징후
4. 상담사가 주의 깊게 살펴야 할 부분

5~8문장으로 작성하며, 마크다운 없이 평문으로 작성하세요."""

PROFILE_PROMPT = """당신은 장기 심리상담 기록을 바탕으로 내담자 프로필을 관리하는 전문가입니다.
기존 프로필(있을 경우)과 새로운 패턴 분석 및 최근 세션 기록을 종합하여
업데이트된 내담자 장기 이해 프로필을 작성해 주세요.

포함 항목:
1. 내담자의 핵심 성향과 특성
2. 지속적인 고민과 갈등 영역
3. 성장과 변화의 흐름
4. 향후 상담에서 유의해야 할 맥락

10문장 이내로 작성하며, 마크다운 없이 평문으로 작성하세요."""

EMOTION_TYPES = ["joy", "angry", "sorrow", "fun", "neutral"]

EMOTION_CLASSIFY_PROMPT = """You are an emotion classifier for a VRM avatar.
Given a counselor's response text, classify its primary emotional tone into exactly one of these categories:
- joy: happy, encouraging, celebratory, warm
- angry: frustrated, firm, assertive, concerned
- sorrow: sad, empathetic to grief, melancholic
- fun: playful, light-hearted, humorous
- neutral: neutral, calm, matter-of-fact

Reply with exactly one word from the list above. No punctuation, no explanation."""


# ── 시스템 프롬프트 조립 ──────────────────────────────

def _build_system_messages() -> list:
    """기억 컨텍스트를 포함한 system 메시지 블록을 반환한다."""
    mem_context = memory.build_memory_context()
    full_prompt = f"{BASE_SYSTEM_PROMPT}\n\n{mem_context}" if mem_context else BASE_SYSTEM_PROMPT

    return [{
        "type": "text",
        "text": full_prompt,
        "cache_control": {"type": "ephemeral"},
    }]


# ── 채팅 ──────────────────────────────────────────────

def chat_ai(user_input: str) -> str:
    session_id = memory.get_or_create_today_session()
    messages = db.load_session_messages(session_id)
    messages.append({'role': 'user', 'content': user_input})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=16000,
        system=_build_system_messages(),
        messages=messages,
    )

    reply = "".join(block.text for block in response.content if block.type == "text")

    db.save_message(session_id, 'user', user_input)
    db.save_message(session_id, 'assistant', reply)

    return reply


def chat_ai_stream(user_input: str) -> Generator[str, None, None]:
    """SSE 스트리밍용. 텍스트 청크를 yield하고, 완료 후 DB에 저장한다."""
    session_id = memory.get_or_create_today_session()
    messages = db.load_session_messages(session_id)
    messages.append({'role': 'user', 'content': user_input})

    full_reply_parts = []

    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=16000,
        system=_build_system_messages(),
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            full_reply_parts.append(text)
            yield text

    reply = ''.join(full_reply_parts)
    db.save_message(session_id, 'user', user_input)
    db.save_message(session_id, 'assistant', reply)


# ── 감정 분류 ─────────────────────────────────────────

def classify_emotion(message: str) -> str:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        system=EMOTION_CLASSIFY_PROMPT,
        messages=[{"role": "user", "content": message}],
    )
    emotion = response.content[0].text.strip().lower()
    return emotion if emotion in EMOTION_TYPES else "neutral"


# ── 기억 레이어 생성 ──────────────────────────────────

def summarize_session(messages: List[Dict], date: str) -> str:
    """Layer 1: 세션 대화를 요약한다."""
    conversation = "\n".join(
        f"{'사용자' if m['role'] == 'user' else 'Galatea'}: {m['content']}"
        for m in messages
    )
    prompt = f"날짜: {date}\n\n대화 내용:\n{conversation}"

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        system=SUMMARIZE_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


def extract_patterns(summaries: List[str]) -> str:
    """Layer 2: 여러 세션 요약에서 반복 패턴을 추출한다."""
    content = "\n\n".join(summaries)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=PATTERN_PROMPT,
        messages=[{"role": "user", "content": content}],
    )
    return response.content[0].text.strip()


def update_profile(current_profile: str, pattern_content: str, recent_summaries: str) -> str:
    """Layer 3: 기존 프로필 + 새 패턴으로 장기 프로필을 갱신한다."""
    parts = []
    if current_profile:
        parts.append(f"[기존 프로필]\n{current_profile}")
    if pattern_content:
        parts.append(f"[최신 패턴 분석]\n{pattern_content}")
    if recent_summaries:
        parts.append(f"[최근 세션 요약]\n{recent_summaries}")

    content = "\n\n".join(parts)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=PROFILE_PROMPT,
        messages=[{"role": "user", "content": content}],
    )
    return response.content[0].text.strip()
