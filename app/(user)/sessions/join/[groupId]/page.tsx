'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Group, SessionType } from '@/types/db';

function getSessionTypeConfig(type: SessionType) {
  switch (type) {
    case 'peer':
      return {
        label: 'Peer Support',
        color: 'bg-violet-50 text-violet-700 ring-violet-600/20',
        iconBg: 'bg-violet-100',
        icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
        description: 'Anonymous peer support group. No counselor present. You\'ll be matched with others dealing with similar challenges.',
      };
    case 'peer_counselor':
      return {
        label: 'Peer + Counselor',
        color: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        iconBg: 'bg-blue-100',
        icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
        description: 'Peer support group with a licensed counselor facilitating. The counselor will guide the discussion and provide professional insights.',
      };
    case 'one_on_one':
      return {
        label: '1:1 Session',
        color: 'bg-teal-50 text-teal-700 ring-teal-600/20',
        iconBg: 'bg-teal-100',
        icon: 'M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155',
        description: 'Private one-on-one session with a licensed counselor. This is a confidential session between you and the counselor.',
      };
    default:
      return {
        label: type,
        color: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        iconBg: 'bg-gray-100',
        icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
        description: '',
      };
  }
}

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) throw new Error('Group not found');
        const data = await res.json();
        setGroup(data);
      } catch {
        setError('Failed to load group');
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [groupId]);

  async function handleJoin() {
    if (!group) return;
    setJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/sessions/start?groupId=${groupId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join session');
      router.push(`/sessions/${data.sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Group not found</h1>
        <p className="text-sm text-gray-500 mb-6">This group may have been removed or the link is invalid.</p>
        <Link
          href="/sessions"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to sessions
        </Link>
      </div>
    );
  }

  const config = getSessionTypeConfig(group.session_type);

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to sessions
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0`}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight break-words">
              {group.topic}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset mt-2 ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {group.description}
          </p>
        )}

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-1.5">What to expect</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Before you join</h2>
        <ul className="space-y-3 mb-6">
          {[
            'Your display name will be visible to other participants',
            'Audio will be recorded for AI analysis (you can review before sharing)',
            'You can leave at any time',
            'Crisis resources available during session',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
              <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              {item}
            </li>
          ))}
        </ul>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {joining ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Joining session...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Join Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}
