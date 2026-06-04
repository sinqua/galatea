import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, Response
from flask_cors import CORS
import llm
import voice

app = Flask(__name__)
CORS(app, origins=os.getenv('ALLOWED_ORIGIN', '*'))

@app.route('/', methods=['GET'])
def hello_world():
    return 'Hello, World!'

@app.route('/textonly', methods=['POST'], strict_slashes=False)
def hello_text2():
    text = request.form['text']
    message = llm.chat_ai(text)
    return message

@app.route('/voice', methods=['POST'], strict_slashes=False)
def hello_voice():
    text = request.form['text']
    message = llm.chat_ai(text)
    audio_bytes = voice.speech(message)
    return Response(
        audio_bytes,
        mimetype='audio/mpeg',
        headers={'X-AI-Text': message}
    )