'use client'

import React, { useState } from 'react';
import { CalendarIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Link from 'next/link';

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export default function DiaryPage() {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [serverResponse, setServerResponse] = useState<string | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  const saveEntry = async () => {
    if (!content.trim() || isLoading) return;
    
    setIsLoading(true);
    setServerResponse(null);
    setShowResponse(false);

    try {
      // 서버로 데이터 전송
      const formData = new FormData();
      formData.append('text', content);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/textonly`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.text();
      console.log("서버 응답:", result);

      // 서버 응답 저장
      setServerResponse(result);
      setShowResponse(true);

      // 폼 초기화는 사용자가 응답을 확인한 후에 하도록 변경
      // setContent('');

    } catch (error) {
      console.error("서버 전송 오류:", error);
      alert("일기 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setServerResponse(null);
    setShowResponse(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 p-6">
      <header className="max-w-6xl mx-auto mb-10">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-neutral-600 hover:text-neutral-900">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-light tracking-tight">My Journal</h1>
          <Link href="/history" className="text-indigo-600 hover:text-indigo-900 text-sm">
            View History
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* 서버 응답 표시 섹션 */}
        {showResponse && serverResponse && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm p-8 mb-10 transition-all duration-500 border border-indigo-100">
            <div className="flex items-center mb-5">
              <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-indigo-500" />
              <h2 className="text-2xl font-light text-indigo-900">Galatea&apos;s Response</h2>
            </div>
            
            <div className="bg-white bg-opacity-70 rounded-lg p-5 mb-5 whitespace-pre-wrap text-lg leading-relaxed text-gray-800">
              {serverResponse}
            </div>

            <div className="flex justify-end">
              <button
                onClick={resetForm}
                className="px-7 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              >
                Write New Entry
              </button>
            </div>
          </div>
        )}

        {/* 일기 작성 폼 - 응답이 표시되지 않을 때만 보여줌 */}
        {!showResponse && (
          <div className="bg-white rounded-xl shadow-sm p-8 mb-10">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-light">To Galatea</h2>
              <div className="flex items-center text-neutral-500">
                <CalendarIcon className="h-5 w-5 mr-2" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none"
                />
              </div>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="How was your day today?"
              className="w-full h-72 p-6 bg-neutral-50 rounded-lg border-none resize-none focus:ring-1 focus:ring-neutral-300 focus:outline-none mb-7 text-lg"
              disabled={isLoading}
            ></textarea>

            <div className="flex justify-end pt-3">
              <button
                onClick={saveEntry}
                disabled={isLoading}
                className={`px-8 py-3 bg-neutral-800 text-white rounded-full transition-colors text-lg flex items-center justify-center ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-neutral-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    <span className="ml-3">Sending...</span>
                  </>
                ) : (
                  'Send to Galatea'
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
