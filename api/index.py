from flask import Flask, request
from flask_cors import CORS
import llm

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def hello_world():
    return 'Hello, World!'

@app.route('/textonly', methods=['POST'])
def hello_text2():
    text = request.form['text']
    print("You said: ", text)

    user_input = text
    message = llm.chat_ai(user_input)

    return message