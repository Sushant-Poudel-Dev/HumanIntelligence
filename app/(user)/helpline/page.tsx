"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HelplinePage() {
  const [requestSent, setRequestSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const supabase = createClient();

  async function handleRequestCounselor() {
    setSending(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase
        .from("helpline_requests")
        .insert({ user_id: user.id, status: "pending" });

      if (insertError) throw insertError;
      setRequestSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className='max-w-3xl mx-auto'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-gray-900 tracking-tight'>
          Helpline
        </h1>
        <p className='mt-1 text-sm text-gray-500'>
          You&apos;re not alone. Help is available right now.
        </p>
      </div>

      {/* Emergency Banner */}
      <div className='rounded-xl bg-gray-900 p-6 mb-8 text-white'>
        <div className='flex items-start gap-4'>
          <div className='w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0'>
            <svg
              className='w-6 h-6 text-white'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={1.5}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
              />
            </svg>
          </div>
          <div className='flex-1'>
            <h2 className='text-lg font-semibold mb-1'>In immediate danger?</h2>
            <p className='text-sm text-gray-300 mb-4'>
              If you or someone else is at risk of harm, call emergency services
              right away.
            </p>
            <a
              href='tel:100'
              className='inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors'
            >
              <svg
                className='w-4 h-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
                />
              </svg>
              Call 100
            </a>
          </div>
        </div>
      </div>

      {/* Crisis Hotlines */}
      <div className='mb-8'>
        <h2 className='text-sm font-semibold text-gray-900 mb-4'>
          Crisis hotlines
        </h2>
        <div className='space-y-3'>
          <a
            href='tel:100'
            className='flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group'
          >
            <div className='w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0'>
              <svg
                className='w-5 h-5 text-red-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
                />
              </svg>
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-semibold text-gray-900'>
                  100 Suicide & Crisis Lifeline
                </h3>
                <span className='px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600'>
                  24/7
                </span>
              </div>
              <p className='text-xs text-gray-500 mt-0.5'>
                Free, confidential support for people in distress
              </p>
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-black shrink-0'>
              100
              <svg
                className='w-4 h-4 text-gray-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
                />
              </svg>
            </div>
          </a>

          <a
            href='tel:100'
            className='flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group'
          >
            <div className='w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0'>
              <svg
                className='w-5 h-5 text-blue-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.671 1.09-.085 2.17-.207 3.238-.364 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z'
                />
              </svg>
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-semibold text-gray-900'>
                  Crisis Text Line
                </h3>
                <span className='px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600'>
                  24/7
                </span>
              </div>
              <p className='text-xs text-gray-500 mt-0.5'>
                Text HOME to 100 for free crisis counseling
              </p>
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-black shrink-0'>
              100
              <svg
                className='w-4 h-4 text-gray-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
                />
              </svg>
            </div>
          </a>

          <a
            href='tel:100'
            className='flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group'
          >
            <div className='w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0'>
              <svg
                className='w-5 h-5 text-amber-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
                />
              </svg>
            </div>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-semibold text-gray-900'>
                  SAMHSA Helpline
                </h3>
                <span className='px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600'>
                  24/7
                </span>
              </div>
              <p className='text-xs text-gray-500 mt-0.5'>
                Free referral service for substance use and mental health
              </p>
            </div>
            <div className='flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-black shrink-0'>
              100
              <svg
                className='w-4 h-4 text-gray-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
                />
              </svg>
            </div>
          </a>
        </div>
      </div>

      {/* Request a Counselor */}
      <div className='bg-white rounded-xl border border-gray-200 p-6 mb-8'>
        <div className='flex items-center gap-3 mb-5'>
          <div className='w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0'>
            <svg
              className='w-5 h-5 text-gray-700'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={1.5}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155'
              />
            </svg>
          </div>
          <div>
            <h2 className='text-base font-semibold text-gray-900'>
              Talk to a counselor
            </h2>
            <p className='text-sm text-gray-500'>
              A licensed professional will reach out to you privately.
            </p>
          </div>
        </div>

        {requestSent ? (
          <div className='p-4 bg-gray-50 rounded-lg border border-gray-200'>
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0'>
                <svg
                  className='w-4 h-4 text-white'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M4.5 12.75l6 6 9-13.5'
                  />
                </svg>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>
                  Request submitted
                </p>
                <p className='text-xs text-gray-500'>
                  A counselor will contact you soon.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className='mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200'>
                <svg
                  className='w-4 h-4 shrink-0'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'
                  />
                </svg>
                {error}
              </div>
            )}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                Briefly describe what you&apos;re going through{" "}
                <span className='text-gray-400 font-normal'>(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='This helps the counselor prepare before reaching out...'
                rows={3}
                className='w-full text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300'
              />
            </div>
            <button
              onClick={handleRequestCounselor}
              disabled={sending}
              className='w-full py-3 px-4 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
            >
              {sending ? (
                <>
                  <svg
                    className='w-4 h-4 animate-spin'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                    />
                  </svg>
                  Sending request...
                </>
              ) : (
                "Request a counselor"
              )}
            </button>
          </>
        )}
      </div>

      {/* Safety Tips */}
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className='text-sm font-semibold text-gray-900 mb-4'>
          While you wait
        </h2>
        <div className='space-y-3'>
          {[
            {
              text: "If you are in immediate danger, call 100 right away.",
              icon: "red" as const,
            },
            {
              text: "Reach out to someone you trust — a friend, family member, or mentor.",
              icon: "gray" as const,
            },
            {
              text: "Try slow, deep breaths. Inhale for 4 seconds, hold for 4, exhale for 4.",
              icon: "gray" as const,
            },
            {
              text: "You are not alone. Many people care about your well-being.",
              icon: "gray" as const,
            },
            {
              text: "Take things one step at a time. This moment will pass.",
              icon: "gray" as const,
            },
          ].map((tip, i) => (
            <div
              key={i}
              className='flex items-start gap-3'
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tip.icon === "red" ? "bg-red-50" : "bg-gray-100"}`}
              >
                {tip.icon === "red" ? (
                  <svg
                    className='w-3.5 h-3.5 text-red-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
                    />
                  </svg>
                ) : (
                  <svg
                    className='w-3.5 h-3.5 text-gray-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M4.5 12.75l6 6 9-13.5'
                    />
                  </svg>
                )}
              </div>
              <p className='text-sm text-gray-600 leading-relaxed'>
                {tip.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
