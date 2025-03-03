import sqlite3
from typing import List, Dict, Any
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
        'deepseek-r1:32b',
        messages = messages + content,
    )

    # 메시지를 데이터베이스에 저장
    save_message('user', user_input)
    save_message('assistant', response.message.content)

    print(response.message.content + '\n')

    return response.message.content

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
