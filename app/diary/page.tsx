'use client'

import React, { useState } from 'react';
import { CalendarIcon, BookmarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Link from 'next/link';

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  response?: string; // 서버 응답을 저장하는 필드 추가
}

const Spinner = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
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

      const response = await fetch('http://192.168.45.90:2173/textonly', {
        method: 'POST',
        body: formData,
      });

      const result = await response.text();
      console.log("서버 응답:", result);

      // 서버 응답 저장
      setServerResponse(result);
      setShowResponse(true);

      // 성공적으로 전송된 경우 UI에 표시할 일기 추가
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date,
        content,
        response: result
      };
      
      setEntries(prev => [newEntry, ...prev]);
      
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
      <header className="max-w-6xl mx-auto mb-16">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-neutral-600 hover:text-neutral-900">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-light tracking-tight">My Journal</h1>
          <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* 서버 응답 표시 섹션 */}
        {showResponse && serverResponse && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm p-10 mb-16 transition-all duration-500 border border-indigo-100">
            <div className="flex items-center mb-6">
              <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-indigo-500" />
              <h2 className="text-2xl font-light text-indigo-900">Galatea&apos;s Response</h2>
            </div>
            
            <div className="bg-white bg-opacity-70 rounded-lg p-6 mb-6 whitespace-pre-wrap text-lg leading-relaxed text-gray-800">
              {serverResponse}
            </div>

            <div className="flex justify-end">
              <button
                onClick={resetForm}
                className="px-8 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              >
                Write New Entry
              </button>
            </div>
          </div>
        )}

        {/* 일기 작성 폼 - 응답이 표시되지 않을 때만 보여줌 */}
        {!showResponse && (
          <div className="bg-white rounded-xl shadow-sm p-12 mb-16">
            <div className="flex justify-between items-center mb-8">
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
              className="w-full h-96 p-8 bg-neutral-50 rounded-lg border-none resize-none focus:ring-1 focus:ring-neutral-300 focus:outline-none mb-10 text-lg"
              disabled={isLoading}
            ></textarea>

            <div className="flex justify-end pt-4">
              <button
                onClick={saveEntry}
                disabled={isLoading}
                className={`px-10 py-4 bg-neutral-800 text-white rounded-full transition-colors text-lg flex items-center justify-center ${
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

        {/* 일기 목록 */}
        <div className="space-y-8">
          <h2 className="text-xl font-light text-neutral-600 mb-4 pl-2">Previous Entries</h2>
          
          {entries.length === 0 ? (
            <p className="text-center text-neutral-400 py-20 text-lg">No entries yet. Start writing today!</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl shadow-sm p-10">
                <div className="flex items-center mb-6">
                  <BookmarkIcon className="h-5 w-5 mr-2 text-neutral-400" />
                  <span className="text-neutral-500 text-base">
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-lg leading-relaxed mb-6">
                  {entry.content}
                </div>
                
                {entry.response && (
                  <div className="mt-6 border-t border-neutral-100 pt-6">
                    <div className="flex items-center mb-3">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2 text-indigo-500" />
                      <span className="text-neutral-500 text-sm">Galatea&apos;s Response:</span>
                    </div>
                    <div className="whitespace-pre-wrap text-base leading-relaxed text-neutral-700 bg-neutral-50 p-4 rounded-lg">
                      {entry.response}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
