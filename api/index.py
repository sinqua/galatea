import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, make_response
import llm

app = Flask(__name__)
ALLOWED_ORIGIN = os.getenv('ALLOWED_ORIGIN', '*')

@app.route('/', methods=['GET'])
def hello_world():
    return 'Hello, World!'

@app.route('/textonly', methods=['POST', 'OPTIONS'], strict_slashes=False)
def hello_text2():
    if request.method == 'OPTIONS':
        res = make_response()
        res.headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN
        res.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return res

    text = request.form['text']
    message = llm.chat_ai(text)

    res = make_response(message)
    res.headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN
    return res