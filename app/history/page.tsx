'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { HomeIcon, UserIcon } from '@heroicons/react/24/outline';

interface HistoryItem {
  user: string;
  assistant: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history`);
        if (response.ok) {
          const data = await response.json();
            setHistory(data.reverse());
        } else {
          console.error('History fetch failed:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 p-6">
      <header className="max-w-6xl mx-auto mb-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-light tracking-tight">Conversation History</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center gap-1">
              <HomeIcon className="h-4 w-4" />
              <span>Journal</span>
            </Link>
            <Link href="/avatar" className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              <span>Meet Galatea</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-xl text-red-700 text-center">
            <p className="text-lg">오류가 발생했습니다: {error}</p>
            <p className="mt-2">서버가 실행 중인지 확인해주세요.</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-neutral-600">No conversation history yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {history.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                <div className="mb-4 pb-4 border-b border-neutral-100">
                  <h3 className="text-sm text-neutral-500 mb-2">You</h3>
                  <p className="text-lg">{item.user}</p>
                </div>
                <div>
                  <h3 className="text-sm text-indigo-500 mb-2">Galatea</h3>
                  <p className="text-lg whitespace-pre-wrap">{item.assistant}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}