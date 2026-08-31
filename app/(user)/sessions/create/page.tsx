'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SessionType } from '@/types/db';

const SESSION_TYPES: {
  value: SessionType;
  label: string;
  description: string;
  icon: string;
  color: string;
  activeColor: string;
  iconBg: string;
}[] = [
  {
    value: 'peer',
    label: 'Peer Support',
    description: 'Anonymous peer support group. No counselor present.',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    color: 'border-gray-200 hover:border-violet-300',
    activeColor: 'border-violet-500 bg-violet-50 ring-1 ring-violet-500',
    iconBg: 'bg-violet-100 text-violet-600',
  },
  {
    value: 'peer_counselor',
    label: 'Peer + Counselor',
    description: 'Peer support with a licensed counselor facilitating the session.',
    icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    color: 'border-gray-200 hover:border-blue-300',
    activeColor: 'border-blue-500 bg-blue-50 ring-1 ring-blue-500',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    value: 'one_on_one',
    label: '1:1 Session',
    description: 'Private one-on-one session with a licensed counselor.',
    icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
    color: 'border-gray-200 hover:border-teal-300',
    activeColor: 'border-teal-500 bg-teal-50 ring-1 ring-teal-500',
    iconBg: 'bg-teal-100 text-teal-600',
  },
];

export default function CreateSessionPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('peer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, description, sessionType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      router.push(`/sessions/join/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to sessions
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create a session</h1>
        <p className="mt-1 text-sm text-gray-500">
          Start a new support session. Others can join once it&apos;s created.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Session type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SESSION_TYPES.map((type) => {
              const isSelected = sessionType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSessionType(type.value)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? type.activeColor
                      : `${type.color} bg-gray-50 hover:bg-gray-100`
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${type.iconBg}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                    </svg>
                  </div>
                  <div className="font-semibold text-gray-900 text-sm">{type.label}</div>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{type.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-semibold text-gray-900 mb-1.5">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Grief Support, Anxiety Check-in, Recovery Journey"
              required
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none sm:text-sm transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              A clear topic helps others find and join your session
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-1.5">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this session focus on? Any guidelines for participants?"
              rows={3}
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none sm:text-sm transition-colors resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create session
              </>
            )}
          </button>
          <Link
            href="/sessions"
            className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
