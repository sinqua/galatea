import React, { useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

interface InputFieldProps {
  onSubmit: (objectName: string, methodName: string, message: string) => void;
}

export default function InputField({ onSubmit }: InputFieldProps) {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit("GameManager", "GenerateVoice", inputValue);
    setInputValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 z-10 w-full p-4 flex items-center bg-white dark:bg-gray-800 shadow-lg"
    >
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        className="flex-grow border border-gray-300 dark:border-gray-600 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 dark:bg-gray-700 dark:text-white"
        placeholder="Enter text"
      />
      <button
        type="submit"
        className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:ring-blue-400"
      >
        <PaperAirplaneIcon className="h-5 w-5 transform rotate-45" />
      </button>
    </form>
  );
}