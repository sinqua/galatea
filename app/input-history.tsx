import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon, ArrowPathIcon } from "@heroicons/react/24/solid";

interface InputHistoryProps {
  onSubmit: (objectName: string, methodName: string, message: string) => void;
}

interface ChatMessage {
  id: number;
  text: string;
}

// Web Speech API 타입 정의
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// XMLHttpRequest 타입 확장
declare global {
  interface XMLHttpRequest {
    _requestId?: string;
  }
}

const InputHistory: React.FC<InputHistoryProps> = ({ onSubmit }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isApiPending, setIsApiPending] = useState(false);
  const recognitionRef = useRef<any>(null);
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  // API 요청 모니터링 설정
  useEffect(() => {
    // 원본 fetch 함수 저장
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // Fetch 요청 모니터링
    window.fetch = function(...args) {
      const requestId = `fetch_${Date.now()}_${Math.random()}`;
      pendingRequestsRef.current.add(requestId);
      setIsApiPending(true);
      
      const request = originalFetch.apply(this, args);
      request.finally(() => {
        pendingRequestsRef.current.delete(requestId);
        if (pendingRequestsRef.current.size === 0) {
          setIsApiPending(false);
        }
      });
      
      return request;
    };

    // XMLHttpRequest 모니터링
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      this._requestId = `xhr_${Date.now()}_${Math.random()}`;
      return originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      if (this._requestId) {
        pendingRequestsRef.current.add(this._requestId);
        setIsApiPending(true);
        
        this.addEventListener('loadend', () => {
          if (this._requestId) {
            pendingRequestsRef.current.delete(this._requestId);
            if (pendingRequestsRef.current.size === 0) {
              setIsApiPending(false);
            }
          }
        });
      }
      
      return originalXHRSend.call(this, body);
    };

    // 클린업 함수
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, []);

  // 컴포넌트 언마운트 시 음성 인식 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const startVoiceRecording = async () => {
    // 이미 음성 인식 중이면 중복 시작 방지
    if (isListening || recognitionRef.current) {
      console.log('이미 음성 인식 중입니다.');
      return;
    }

    try {
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 권한 확인 후 스트림 정리
      
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'ko-KR';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          console.log('음성 인식 시작됨');
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('음성 인식 결과 이벤트:', event);
          let fullTranscript = '';
          
          // results 배열의 모든 요소를 순회하며 누적
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            fullTranscript += transcript + ' ';
          }
          
          // 모든 인식 결과를 실시간으로 입력 필드에 업데이트
          if (fullTranscript) {
            console.log('누적 인식 결과:', fullTranscript);
            setInputValue(fullTranscript.trim());
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('음성 인식 오류:', event.error);
          console.error('오류 상세:', event);
          
          let errorMessage = '음성 인식 중 오류가 발생했습니다.';
          switch(event.error) {
            case 'not-allowed':
              errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
              break;
            case 'no-speech':
              errorMessage = '음성이 감지되지 않았습니다. 다시 시도해주세요.';
              break;
            case 'aborted':
              errorMessage = '음성 인식이 중단되었습니다. 다시 시도해주세요.';
              break;
            case 'network':
              errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
              break;
            default:
              errorMessage = `음성 인식 오류: ${event.error}`;
          }
          
          alert(errorMessage);
          setIsListening(false);
          recognitionRef.current = null; // 참조 정리
        };

        recognitionRef.current.onend = () => {
          console.log('음성 인식 세션 종료됨 - 자동 재시작 대기 중');
          // continuous 모드에서는 자동으로 다시 시작되므로 
          // 사용자가 버튼을 눌러서 중지할 때까지 계속 대기
          // isListening 상태는 유지
        };

        recognitionRef.current.onnomatch = () => {
          console.log('음성 인식 실패: 매치되는 결과 없음');
          alert('음성을 인식할 수 없습니다. 다시 시도해주세요.');
          setIsListening(false);
          recognitionRef.current = null; // 참조 정리
        };

        console.log('음성 인식 시작 시도...');
        recognitionRef.current.start();
      } else {
        alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari를 사용해주세요.');
      }
    } catch (error) {
      console.error('마이크 권한 오류:', error);
      alert('마이크 권한이 필요합니다. 브라우저에서 마이크 권한을 허용해주세요.');
      setIsListening(false);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      console.log('음성 인식 수동 중지');
      recognitionRef.current.stop();
      setIsListening(false);
      recognitionRef.current = null;
      onSubmit("GameManager", "GenerateVoice", inputValue);
      setInputValue('');
    }
  };

  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleSend = async () => {
    if (inputValue.trim()) {
      const newMessage: ChatMessage = {
        id: messages.length + 1,
        text: inputValue,
      };
      setMessages([...messages, newMessage]);
      onSubmit("GameManager", "GenerateVoice", inputValue);

      // POST request to the server
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/textonly`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ text: inputValue }),
      // });
      setInputValue('');

      // console.log(response);
      // const result = await response.json();
      // const serverMessage: ChatMessage = {
      //   id: messages.length + 2,
      //   text: result.message,
      // };
      // console.log(result.message);
      // setMessages((prevMessages) => [...prevMessages, serverMessage]);

    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 w-full p-4 bg-white dark:bg-gray-800 shadow-lg flex items-end"
    >
      <textarea
        value={inputValue}
        onChange={handleChange}
        className="flex-grow border border-gray-300 dark:border-gray-600 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 dark:bg-gray-700 dark:text-white resize-none overflow-hidden"
        placeholder="Enter message"
        rows={1}
        style={{
          minHeight: '40px',
          maxHeight: '120px',
          height: 'auto'
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
        }}
      />
      <button
        type="button"
        onClick={handleVoiceButtonClick}
        className={`ml-2 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800' 
            : 'bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800'
        } text-white flex-shrink-0`}
        title={isListening ? "음성 인식 중지" : "음성 입력 시작"}
      >
        <MicrophoneIcon className="h-5 w-5" />
      </button>
      <button
        type="submit"
        className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:ring-blue-400 flex-shrink-0"
        title={isApiPending ? "API 요청 처리 중..." : "메시지 전송"}
        disabled={isApiPending}
      >
        {isApiPending ? (
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
        ) : (
          <PaperAirplaneIcon className="h-5 w-5 transform rotate-45" />
        )}
      </button>
    </form>
  );
};

export default InputHistory;
