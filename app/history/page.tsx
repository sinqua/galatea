'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';

interface HistoryItem {
    user: string;
    assistant: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2173';
        const response = await fetch(`${apiUrl}/history`);
        
        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("서버 응답 데이터:", data);
        
        // 데이터가 배열인지 확인
        if (Array.isArray(data)) {
          // 배열을 역순으로 저장 (최신 대화가 상단에 표시)
          setHistory([...data].reverse());
        } else {
          console.error("서버 응답이 배열이 아닙니다:", data);
          setError("잘못된 응답 형식");
        }
      } catch (err) {
        setError((err as Error).message);
        console.error('히스토리 조회 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 p-6">
      <header className="max-w-6xl mx-auto mb-10">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-neutral-600 hover:text-neutral-900 flex items-center">
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            <span>Back to Home</span>
          </Link>
          <h1 className="text-3xl font-light tracking-tight">Conversation History</h1>
          <Link href="/diary" className="text-indigo-600 hover:text-indigo-900 text-sm">
            New Entry
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-xl text-red-700 text-center">
            <p className="text-lg">오류가 발생했습니다: {error}</p>
            <p className="mt-2">서버가 실행 중인지 확인해주세요.</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-neutral-500">
            <p>아직 대화 내역이 없습니다.</p>
            <Link href="/diary" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
              대화 시작하기
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-between text-neutral-500">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                <span>총 {history.length}개의 대화가 기록되어 있습니다</span>
              </div>
              <div className="text-sm">
                <span>최신 대화가 상단에 표시됩니다</span>
              </div>
            </div>

            {history.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 mb-6 transition-all hover:shadow-md">
                <div className="flex justify-between items-center mb-2 text-xs text-neutral-400">
                  <span>대화 #{history.length - index}</span>
                </div>
                <div className="mb-4 border-b border-neutral-100 pb-4">
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-neutral-100 rounded-full flex items-center justify-center text-xs font-medium text-neutral-600">
                      You
                    </div>
                    <div className="ml-3 flex-grow">
                      <p className="whitespace-pre-wrap text-neutral-700">{item.user}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600">
                      AI
                    </div>
                    <div className="ml-3 flex-grow">
                      <p className="whitespace-pre-wrap text-neutral-800">{item.assistant}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}