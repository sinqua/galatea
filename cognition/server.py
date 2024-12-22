from flask import Flask, request, send_file
from flask_cors import CORS
import llm
import voice

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def hello_world():
    return 'Hello, World!'

@app.route('/text', methods=['POST'])
def hello_text():
    text = request.form['text']
    print("You said: ", text)

    user_input = text
    print("Ask to llama")
    message = llm.chat_ai(user_input)

    voice.speech(message)

    output_file_path = '../output.mp3'

    # Return the output.mp3 file to the client
    return send_file(output_file_path, mimetype='audio/mpeg')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)