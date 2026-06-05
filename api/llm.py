import os
import sqlite3
from typing import List, Dict, Any
import anthropic
from dotenv import load_dotenv

# 프로젝트 루트(cognition의 상위)의 .env를 로드 — 실행 위치와 무관하게 동작
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Anthropic 클라이언트 (ANTHROPIC_API_KEY 환경변수에서 키를 읽음)
client = anthropic.Anthropic()

# 심리상담사 페르소나 시스템 프롬프트 (chat_ai / chat_ai_stream 공용)
SYSTEM_PROMPT = """You are a professional psychological counselor named 'Galatea'.
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

# 데이터베이스 초기화
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'journal.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            content TEXT
        )
    ''')
    conn.commit()
    conn.close()

# 초기화
init_db()

# 메시지를 데이터베이스에 저장
def save_message(role: str, content: str, images: str = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO messages (role, content) VALUES (?, ?)', (role, content))
    conn.commit()
    conn.close()

# 데이터베이스에서 메시지를 불러오기
def load_messages() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT role, content FROM messages')
    rows = c.fetchall()
    conn.close()
    messages = []
    for row in rows:
        message = {'role': row[0], 'content': row[1]}
        messages.append(message)
        
    return messages

EMOTION_TYPES = ["joy", "angry", "sorrow", "fun", "blink"]

EMOTION_CLASSIFY_PROMPT = """You are an emotion classifier for a VRM avatar.
Given a counselor's response text, classify its primary emotional tone into exactly one of these categories:
- joy: happy, encouraging, celebratory, warm
- angry: frustrated, firm, assertive, concerned
- sorrow: sad, empathetic to grief, melancholic
- fun: playful, light-hearted, humorous
- blink: neutral, calm, matter-of-fact

Reply with exactly one word from the list above. No punctuation, no explanation."""


def classify_emotion(message: str) -> str:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10,
        system=EMOTION_CLASSIFY_PROMPT,
        messages=[{"role": "user", "content": message}],
    )
    emotion = response.content[0].text.strip().lower()
    return emotion if emotion in EMOTION_TYPES else "blink"


def chat_ai(user_input):
    # 데이터베이스에서 대화 히스토리 불러오기 (DB 형식이 Anthropic 메시지 형식과 동일)
    messages = load_messages()
    messages.append({'role': 'user', 'content': user_input})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=16000,
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},  # 재사용되는 시스템 프롬프트 캐싱
        }],
        messages=messages,
    )

    # 텍스트 블록만 합쳐서 응답 추출
    reply = "".join(block.text for block in response.content if block.type == "text")

    # 메시지를 데이터베이스에 저장
    save_message('user', user_input)
    save_message('assistant', reply)

    print(reply + '\n')

    return reply
