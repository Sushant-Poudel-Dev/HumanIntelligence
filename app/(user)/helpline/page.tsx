"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const CRISIS_RESOURCES = [
  {
    name: "100 Suicide & Crisis Lifeline",
    phone: "100",
    description:
      "Free, confidential support for people in distress. Available 24/7.",
    color: "bg-red-50 text-red-700 ring-red-600/20",
    iconBg: "bg-red-100",
    icon: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
  },
  {
    name: "Crisis Text Line",
    phone: "12345",
    description: "Free crisis counseling via text message. Available 24/7.",
    color: "bg-blue-50 text-blue-700 ring-blue-600/20",
    iconBg: "bg-blue-100",
    icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.671 1.09-.085 2.17-.207 3.238-.364 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  },
  {
    name: "SAMHSA Helpline",
    phone: "977987654321",
    description:
      "Free referral service for substance use and mental health disorders.",
    color: "bg-violet-50 text-violet-700 ring-violet-600/20",
    iconBg: "bg-violet-100",
    icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  },
  {
    name: "NAMI Helpline",
    phone: "977987654321",
    description: "Information and referral service for mental health support.",
    color: "bg-teal-50 text-teal-700 ring-teal-600/20",
    iconBg: "bg-teal-100",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
];

export default function HelplinePage() {
  const [requestSent, setRequestSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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
          If you&apos;re in crisis or need immediate support, these resources
          are here for you.
        </p>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0'>
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
                d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
              />
            </svg>
          </div>
          <div>
            <h2 className='text-base font-semibold text-gray-900'>
              Need immediate help?
            </h2>
            <p className='text-sm text-gray-500'>
              If you or someone you know is in danger, call 100.
            </p>
          </div>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 mb-8'>
        {CRISIS_RESOURCES.map((resource) => (
          <div
            key={resource.name}
            className='bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow'
          >
            <div className='flex items-start gap-3 mb-3'>
              <div
                className={`w-10 h-10 rounded-xl ${resource.iconBg} flex items-center justify-center shrink-0`}
              >
                <svg
                  className='w-5 h-5'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d={resource.icon}
                  />
                </svg>
              </div>
              <div className='min-w-0'>
                <h3 className='text-sm font-semibold text-gray-900'>
                  {resource.name}
                </h3>
                <p className='text-xs text-gray-500 mt-0.5'>
                  {resource.description}
                </p>
              </div>
            </div>
            <div className='flex items-center justify-between mt-3'>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${resource.color}`}
              >
                {resource.phone}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0'>
            <svg
              className='w-5 h-5 text-indigo-600'
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
              Request a counselor
            </h2>
            <p className='text-sm text-gray-500'>
              A licensed counselor will reach out to you privately.
            </p>
          </div>
        </div>

        {requestSent ? (
          <div className='p-4 bg-emerald-50 rounded-lg border border-emerald-200'>
            <div className='flex items-center gap-2'>
              <svg
                className='w-5 h-5 text-emerald-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M4.5 12.75l6 6 9-13.5'
                />
              </svg>
              <p className='text-sm font-medium text-emerald-700'>
                Request submitted. A counselor will contact you soon.
              </p>
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

      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <h2 className='text-base font-semibold text-gray-900 mb-3'>
          Safety tips
        </h2>
        <ul className='space-y-2.5'>
          {[
            "If you feel you are in immediate danger, call 100.",
            "Reach out to someone you trust — a friend, family member, or counselor.",
            "You are not alone. Many people care about your well-being.",
            "Take things one day at a time. Recovery is a journey.",
          ].map((tip) => (
            <li
              key={tip}
              className='flex items-start gap-2.5 text-sm text-gray-600'
            >
              <div className='w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5'>
                <svg
                  className='w-3 h-3 text-indigo-600'
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
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className='mt-6 text-center'>
        <Link
          href='/dashboard'
          className='text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors'
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
