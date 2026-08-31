import { createServerClientInstance } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/helpers";
import Link from "next/link";
import type { Group, SessionType } from "@/types/db";

async function getGroups(): Promise<Group[]> {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("topic");

  if (error) {
    console.error("Error fetching groups:", error);
    return [];
  }

  return data || [];
}

function getSessionTypeConfig(type: SessionType) {
  switch (type) {
    case "peer":
      return {
        label: "Peer Support",
        color: "bg-violet-50 text-violet-700 ring-violet-600/20",
        iconBg: "bg-violet-100",
        icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
      };
    case "peer_counselor":
      return {
        label: "Peer + Counselor",
        color: "bg-blue-50 text-blue-700 ring-blue-600/20",
        iconBg: "bg-blue-100",
        icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
      };
    case "one_on_one":
      return {
        label: "1:1 Session",
        color: "bg-teal-50 text-teal-700 ring-teal-600/20",
        iconBg: "bg-teal-100",
        icon: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155",
      };
    default:
      return {
        label: type,
        color: "bg-gray-50 text-gray-700 ring-gray-600/20",
        iconBg: "bg-gray-100",
        icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
      };
  }
}

export default async function SessionsPage() {
  await requireUser();
  const groups = await getGroups();

  return (
    <div className="max-w-5xl mx-auto">
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 tracking-tight'>
              Sessions
            </h1>
            <p className='mt-1 text-sm text-gray-500'>
              Join an existing group or create your own session.
            </p>
          </div>
          <Link
            href='/sessions/create'
            className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2'
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
                d='M12 4.5v15m7.5-7.5h-15'
              />
            </svg>
            Create Session
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className='text-center py-16 bg-gray-50 rounded-2xl'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center'>
            <svg
              className='w-8 h-8 text-gray-400'
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
          <h3 className='text-lg font-semibold text-gray-900 mb-1'>
            No sessions yet
          </h3>
          <p className='text-sm text-gray-500 mb-6 max-w-sm mx-auto'>
            Be the first to start a support session. Others can join once
            it&apos;s created.
          </p>
          <Link
            href='/sessions/create'
            className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-500 hover:shadow-md hover:shadow-indigo-200'
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
                d='M12 4.5v15m7.5-7.5h-15'
              />
            </svg>
            Create your first session
          </Link>
        </div>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {groups.map((group) => {
            const config = getSessionTypeConfig(group.session_type);
            return (
              <Link
                key={group.id}
                href={`/sessions/join/${group.id}`}
                className='group relative bg-gray-50 rounded-2xl border border-gray-100 p-5 transition-all hover:shadow-sm hover:border-gray-200 hover:-translate-y-0.5'
              >
                <div className='flex items-start gap-3.5'>
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}
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
                        d={config.icon}
                      />
                    </svg>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate'>
                      {group.topic}
                    </h3>
                    <span
                      className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
                {group.description && (
                  <p className='mt-3 text-sm text-gray-500 line-clamp-2 leading-relaxed'>
                    {group.description}
                  </p>
                )}
                <div className='mt-4 flex items-center text-xs text-gray-400 group-hover:text-indigo-500 transition-colors'>
                  <span>Join session</span>
                  <svg
                    className='w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3'
                    />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
