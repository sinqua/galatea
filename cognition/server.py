from flask import Flask, request, send_file, jsonify, Response
from flask_cors import CORS
import llm
import voice
import json

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

    output_file_path = 'output.mp3'

    # Return the output.mp3 file to the client
    return send_file(output_file_path, mimetype='audio/mpeg')

@app.route('/textonly', methods=['POST'])
def hello_text2():
    text = request.form['text']
    print("You said: ", text)

    user_input = text
    message = llm.chat_ai(user_input)

    return message

@app.route('/history', methods=['GET'])
def get_history():
    history = llm.get_history()
    return jsonify(history)  # 응답을 JSON으로 직렬화

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """토큰 단위 스트리밍 채팅 API 엔드포인트"""
    try:
        # JSON 요청 처리
        if request.is_json:
            data = request.json
            user_input = data.get('message', '')
        # Form 요청 처리 
        else:
            user_input = request.form.get('text', '')
        
        print(f"스트리밍 요청: {user_input}")
        
        def generate():
            try:
                for chunk in llm.chat_ai_stream(user_input):
                    # 청크마다 SSE 형식으로 전송
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception as e:
                print(f"스트림 생성 중 오류: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        # 스트리밍 응답 헤더 설정
        response = Response(generate(), mimetype='text/event-stream')
        response.headers.add('Cache-Control', 'no-cache')
        response.headers.add('Connection', 'keep-alive')
        response.headers.add('X-Accel-Buffering', 'no')
        return response
    except Exception as e:
        print(f"API 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=2173)