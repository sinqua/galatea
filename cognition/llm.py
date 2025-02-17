import sqlite3
from typing import List, Dict, Any
from ollama import chat

# 데이터베이스 초기화
def init_db():
    conn = sqlite3.connect('ollama.db')
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
    conn = sqlite3.connect('ollama.db')
    c = conn.cursor()
    c.execute('INSERT INTO messages (role, content) VALUES (?, ?)', (role, content))
    conn.commit()
    conn.close()

# 데이터베이스에서 메시지를 불러오기
def load_messages() -> List[Dict[str, Any]]:
    conn = sqlite3.connect('ollama.db')
    c = conn.cursor()
    c.execute('SELECT role, content FROM messages')
    rows = c.fetchall()
    conn.close()
    messages = []
    for row in rows:
        message = {'role': row[0], 'content': row[1]}
        messages.append(message)

    initial_message = {'role': 'assistant', 'content': '안녕하세요! 무엇을 도와드릴까요?'}
    messages.insert(0, initial_message)

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