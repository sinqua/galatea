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

    content = [{
            'role': 'user',
            'content': user_input,
        }]
    
    # 사용자 메시지 저장
    save_message('user', user_input)
    
    full_response = ""
    
    print(f"스트리밍 시작: {user_input}")
    
    # 스트림 모드로 응답 받기
    for chunk in chat(
        'deepseek-r1:32b',
        messages=messages + content,
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
