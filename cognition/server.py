from flask import Flask, request
from flask_cors import CORS
import llm

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def hello_world():
    return 'Hello, World!'

@app.route('/text', methods=['POST'])
def hello_text():
    print("You send a text to me")
    text = request.form['text']

    user_input = text
    print("Ask to llama")
    message = llm.chat_ai(user_input)

    return message

@app.route('/voice', methods=['POST'])
def hello_voice():
    print("You send a voice to me")
    voice = request.form['voice']

    user_input = voice
    print("Ask to llama")
    message = llm.chat_ai(user_input)

    return message


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)