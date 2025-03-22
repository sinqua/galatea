import sqlite3
from typing import List, Dict, Any, Generator
from ollama import chat

# 데이터베이스 초기화
def init_db():
    conn = sqlite3.connect('journal.db')
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
    conn = sqlite3.connect('journal.db')
    c = conn.cursor()
    c.execute('INSERT INTO messages (role, content) VALUES (?, ?)', (role, content))
    conn.commit()
    conn.close()

# 데이터베이스에서 메시지를 불러오기
def load_messages() -> List[Dict[str, Any]]:
    conn = sqlite3.connect('journal.db')
    c = conn.cursor()
    c.execute('SELECT role, content FROM messages')
    rows = c.fetchall()
    conn.close()
    messages = []
    for row in rows:
        message = {'role': row[0], 'content': row[1]}
        messages.append(message)
        
    return messages

def chat_ai(user_input):
    # 데이터베이스에서 메시지 불러오기
    messages = load_messages()

    content = [{
            'role': 'user',
            'content': user_input,
        }]

    response = chat(
        'llama3.2',
        messages = messages + content,
    )

    # 메시지를 데이터베이스에 저장
    save_message('user', user_input)
    save_message('assistant', response.message.content)

    print(response.message.content + '\n')

    return response.message.content

def chat_ai_stream(user_input) -> Generator[str, None, None]:
    """토큰 단위로 스트리밍 방식 AI 응답을 생성하는 함수"""
    # 데이터베이스에서 메시지 불러오기
    messages = load_messages()
    
    # 심리상담사 페르소나 시스템 프롬프트
    system_prompt = {
        'role': 'system',
        'content': """당신은 '갈라테아'라는 이름의 전문 심리상담사입니다. 
        사용자가 작성한 일기나 고민을 분석하고 통찰력 있는 피드백을 제공합니다.

        역할:
        - 공감적 경청자: 사용자의 감정과 경험을 진심으로 이해하고 존중합니다.
        - 분석가: 사용자의 글에서 감정 패턴, 사고방식, 행동 경향을 파악합니다.
        - 지지자: 긍정적이고 건설적인 관점을 제공하며 사용자의 성장을 격려합니다.

        접근 방식:
        1. 사용자의 감정과 상황을 명확히 인식하고 공감합니다.
        2. 사용자의 경험에서 심리적 패턴이나 주제를 식별합니다.
        3. 상황에 대한 새로운 관점과 통찰을 제공합니다.
        4. 실용적이고 적용 가능한 제안을 합니다.
        5. 사용자의 강점과 진전을 강조합니다.

        응답 형식:
        - 따뜻하고 전문적인 어조를 유지합니다.
        - 짧고 읽기 쉬운 단락으로 작성합니다.
        - 판단하지 않고 수용적인 태도를 보입니다.
        - 필요시 개방형 질문을 통해 사용자의 자기성찰을 돕습니다.

        중요한 제한사항:
        - 의학적 진단이나 치료를 제공하지 않습니다.
        - 심각한 정신건강 문제가 의심될 경우, 전문가 상담을 권유합니다.
        - 사용자의 자율성을 존중하고 지시적이기보다 협력적인 접근을 취합니다."""
    }
    
    content = [{
            'role': 'user',
            'content': user_input,
        }]
    
    # 사용자 메시지 저장
    save_message('user', user_input)
    
    full_response = ""
    
    print(f"스트리밍 시작: {user_input}")
    
    # 스트림 모드로 응답 받기 - 시스템 프롬프트 포함
    for chunk in chat(
        'deepseek-r1:32b',
        messages=[system_prompt] + messages + content,
        stream=True
    ):
        if chunk.message and chunk.message.content:
            content_chunk = chunk.message.content
            full_response += content_chunk
            yield content_chunk
    
    print(f"스트리밍 완료: {full_response}")
    
    # 완성된 응답을 데이터베이스에 저장
    save_message('assistant', full_response)

def get_history():
    messages = load_messages()

    history = []
    user_message = None

    for message in messages:
        if message['role'] == 'user':
            user_message = message['content']
        elif message['role'] == 'assistant' and user_message:
            history.append({'user': user_message, 'assistant': message['content']})
            user_message = None

    return history  # 배열 형태로 반환
