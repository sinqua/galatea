import React, { useState } from 'react';

interface ChatMessage {
    id: number;
    text: string;
}

const ChatHistory: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim()) {
            const newMessage: ChatMessage = {
                id: messages.length + 1,
                text: input,
            };
            setMessages([...messages, newMessage]);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full fixed bottom-0 left-0 w-full">
            <div className="flex-grow overflow-y-auto p-4 flex flex-col-reverse">
                {messages.map((message) => (
                    <div key={message.id} className="mb-2 p-2 bg-blue-500 text-white rounded-lg self-end max-w-xs">
                        {message.text}
                    </div>
                ))}
            </div>
            <div className="flex p-4 bg-white dark:bg-gray-800 shadow-lg">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow border border-gray-300 dark:border-gray-600 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter message"
                />
                <button
                    onClick={handleSend}
                    className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:ring-blue-400"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatHistory;