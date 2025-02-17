import React, { useState } from 'react';
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface InputHistoryProps {
  onSubmit: (objectName: string, methodName: string, message: string) => void;
}

interface ChatMessage {
  id: number;
  text: string;
  isServer: boolean; // 메시지의 출처를 구분하는 속성 추가
}

const InputHistory: React.FC<InputHistoryProps> = ({ onSubmit }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSend = async () => {
    if (inputValue.trim()) {
      const newMessage: ChatMessage = {
        id: messages.length + 1,
        text: inputValue,
        isServer: false, // 사용자가 입력한 메시지
      };
      setMessages([...messages, newMessage]);
      onSubmit("GameManager", "GenerateVoice", inputValue);

      // POST request to the server using FormData
      const formData = new FormData();
      formData.append('text', inputValue);
      setInputValue('');

      const response = await fetch('https://server.galatea.my:2174/textonly', {
        method: 'POST',
        body: formData,
      });
      const result = await response.text();

      const serverMessage: ChatMessage = {
        id: messages.length + 2,
        text: result,
        isServer: true, // 서버에서 받은 메시지
      };
      setMessages((prevMessages) => [...prevMessages, serverMessage]);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col h-full fixed bottom-0 left-0 w-full">
      <div className="flex-grow overflow-y-auto p-4 flex flex-col-reverse">
        {messages.slice().reverse().map((message) => (
          <div
            key={message.id}
            className={`mb-2 p-2 rounded-lg max-w-xs ${
              message.isServer ? 'bg-white text-black self-start' : 'bg-blue-500 text-white self-end'
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex p-4 bg-white dark:bg-gray-800 shadow-lg"
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
