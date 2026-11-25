'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[100dvh] bg-[#070b14] text-slate-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full bg-slate-950/90 border border-slate-800 rounded-3xl p-7 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">
          Application Error
        </p>
        <h1 className="text-xl font-bold text-white mt-1">Something went wrong</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          We encountered an unexpected error while loading the SIT 3D Digital Twin.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/campus-guide"
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors"
          >
            Campus Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
