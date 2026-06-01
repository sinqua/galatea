import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface InputHistoryProps {
  onSubmit: (objectName: string, methodName: string, message: string) => void;
}

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

const InputHistory: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSend = async () => {
    if (inputValue.trim()) {
      const newMessage: ChatMessage = {
        id: messages.length + 1,
        text: inputValue,
        sender: 'user',
      };
      setMessages([...messages, newMessage]);
      // onSubmit("GameManager", "GenerateVoice", inputValue);

      // POST request to the server.
      // URLSearchParams를 body로 쓰면 fetch가 Content-Type을
      // application/x-www-form-urlencoded로 설정 → 서버의 request.form['text']와 일치
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/textonly`, {
        method: 'POST',
        body: new URLSearchParams({ text: inputValue }),
      });

      // /textonly는 순수 텍스트(AI 응답)를 반환하므로 text()로 읽음
      const result = await response.text();
      const serverMessage: ChatMessage = {
        id: messages.length + 2,
        text: result,
        sender: 'ai',
      };
      console.log(result);
      setMessages((prevMessages) => [...prevMessages, serverMessage]);

      setInputValue('');
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col h-full fixed bottom-0 left-0 w-full pointer-events-none">
      <div className="flex-grow overflow-y-auto p-4 flex flex-col">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-2 p-2 rounded-lg max-w-xs whitespace-pre-wrap pointer-events-auto ${
              message.sender === 'user'
                ? 'bg-blue-500 text-white self-end'
                : 'bg-gray-200 text-gray-900 self-start dark:bg-gray-700 dark:text-white'
            }`}
          >
            {message.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex p-4 bg-white dark:bg-gray-800 shadow-lg pointer-events-auto"
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          className="flex-grow border border-gray-300 dark:border-gray-600 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 dark:bg-gray-700 dark:text-white"
          placeholder="Enter message"
        />
        <button
          type="submit"
          className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:ring-blue-400"
        >
          <PaperAirplaneIcon className="h-5 w-5 transform rotate-45" />
        </button>
      </form>
    </div>
  );
};

export default InputHistory;
