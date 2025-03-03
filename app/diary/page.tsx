'use client'

import React, { useState, useEffect, useRef } from 'react';
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
  const [serverResponse, setServerResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // EventSource 인스턴스를 저장할 ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // 컴포넌트 언마운트 시 EventSource 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const saveEntry = async () => {
    if (!content.trim() || isLoading) return;
    
    setIsLoading(true);
    setServerResponse('');
    setShowResponse(true);
    setIsStreaming(true);

    try {
      // 스트리밍 API 사용을 위한 fetch 요청
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // SSE로 스트림 데이터 받기
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.chunk) {
                  setServerResponse(prev => prev + data.chunk);
                }
              } catch (e) {
                console.error("JSON 파싱 오류:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("스트리밍 데이터 수신 오류:", error);
      alert("응답을 받는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setServerResponse('');
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
        {showResponse && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm p-8 mb-10 transition-all duration-500 border border-indigo-100">
            <div className="flex items-center mb-5">
              <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-indigo-500" />
              <h2 className="text-2xl font-light text-indigo-900">
                Galatea&apos;s Response
                {isStreaming && <span className="ml-2 text-sm text-indigo-600">(writing...)</span>}
              </h2>
            </div>
            
            <div className="bg-white bg-opacity-70 rounded-lg p-5 mb-5 whitespace-pre-wrap text-lg leading-relaxed text-gray-800 min-h-[200px]">
              {serverResponse || (isLoading && !serverResponse && 
                <div className="flex justify-center items-center h-full text-gray-400">
                  <Spinner />
                  <span className="ml-3">Thinking...</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={resetForm}
                disabled={isLoading || isStreaming}
                className={`px-7 py-3 bg-indigo-600 text-white rounded-full transition-colors ${
                  (isLoading || isStreaming) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
                }`}
              >
                Write New Entry
              </button>
            </div>
          </div>
        )}

        {/* 일기 작성 폼 - 응답이 표시될 때도 보이지만, 스트리밍 중에는 비활성화 */}
        <div className={`bg-white rounded-xl shadow-sm p-8 mb-10 ${showResponse ? 'opacity-50' : ''}`}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl font-light">To Galatea</h2>
            <div className="flex items-center text-neutral-500">
              <CalendarIcon className="h-5 w-5 mr-2" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none text-sm focus:outline-none"
                disabled={isLoading || isStreaming}
              />
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="How was your day today?"
            className="w-full h-72 p-6 bg-neutral-50 rounded-lg border-none resize-none focus:ring-1 focus:ring-neutral-300 focus:outline-none mb-7 text-lg"
            disabled={isLoading || isStreaming || showResponse}
          ></textarea>

          <div className="flex justify-end pt-3">
            <button
              onClick={saveEntry}
              disabled={isLoading || isStreaming || showResponse || !content.trim()}
              className={`px-8 py-3 bg-neutral-800 text-white rounded-full transition-colors text-lg flex items-center justify-center ${
                isLoading || isStreaming || showResponse || !content.trim() ? 'opacity-70 cursor-not-allowed' : 'hover:bg-neutral-700'
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
      </main>
    </div>
  );
}
