import React, { useState } from "react";

interface InputFieldProps {
  onSubmit: (value: string) => void;
}

export default function InputField({ onSubmit }: InputFieldProps) {
  const [inputValue, setInputValue] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(inputValue);
    setInputValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 z-10 w-full p-4"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }} // 배경색을 반투명하게 설정
    >
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        className="border p-2 w-full"
        placeholder="Enter text"
      />
      <button type="submit" className="mt-2 p-2 bg-blue-500 text-white">
        Submit
      </button>
    </form>
  );
}