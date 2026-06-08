"""
index.py — Flask 라우트 정의

엔드포인트:
  GET  /                   헬스체크
  POST /textonly           텍스트 응답
  POST /voice              음성 응답 (TTS + 감정)
  POST /api/chat/stream    SSE 스트리밍 응답
  GET  /history            전체 대화 히스토리
  GET  /sessions           세션 목록 + 요약
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import base64
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import llm
import voice
import db

app = Flask(__name__)
CORS(app, origins=os.getenv('ALLOWED_ORIGIN', '*').split(','))


@app.route('/', methods=['GET'])
def health_check():
    return 'Hello, World!'


@app.route('/textonly', methods=['POST'], strict_slashes=False)
def text_only():
    text = request.form['text']
    message = llm.chat_ai(text)
    return message


@app.route('/voice', methods=['POST'], strict_slashes=False)
def voice_response():
    text = request.form['text']
    message = llm.chat_ai(text)
    emotion = llm.classify_emotion(message)
    audio_bytes = voice.speech(message)
    return jsonify({
        'text': message,
        'audio': base64.b64encode(audio_bytes).decode('utf-8'),
        'emotion': emotion,
    })


@app.route('/api/chat/stream', methods=['POST'], strict_slashes=False)
def chat_stream():
    """SSE 방식으로 LLM 응답을 스트리밍한다."""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'message field required'}), 400

    user_input = data['message']

    def generate():
        for chunk in llm.chat_ai_stream(user_input):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        }
    )


@app.route('/history', methods=['GET'], strict_slashes=False)
def history():
    """전체 대화 히스토리를 user/assistant 쌍으로 반환한다."""
    pairs = db.load_all_messages_paired()
    return jsonify(pairs)


@app.route('/sessions', methods=['GET'], strict_slashes=False)
def sessions():
    """세션 목록과 각 세션의 요약을 반환한다."""
    recent = db.get_recent_sessions_with_summaries(limit=30)
    return jsonify(recent)
