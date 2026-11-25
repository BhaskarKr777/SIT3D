import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] bg-[#070b14] text-slate-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full bg-slate-950/90 border border-slate-800 rounded-3xl p-7 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-white p-1.5 flex items-center justify-center mb-4">
          <img
            src="/sit-logo.webp"
            alt="Siliguri Institute of Technology Logo"
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">404 Error</p>
        <h1 className="text-2xl font-bold text-white mt-1">Page Not Found</h1>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          The page you are looking for does not exist on the Siliguri Institute of Technology 3D
          Digital Twin.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
          <Link
            href="/"
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Launch 3D Campus
          </Link>
          <Link
            href="/campus-guide"
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-colors"
          >
            Campus Guide &amp; FAQ
          </Link>
        </div>
      </div>
    </main>
  );
}
