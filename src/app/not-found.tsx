import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist. Return to Wizard Party and start playing!",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#09090b] to-[#1e1b4b] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Wizard Hat Icon */}
        <div className="mb-8 flex justify-center">
          <svg viewBox="0 0 64 64" className="w-32 h-32 opacity-50">
            <defs>
              <linearGradient id="hatGrad404" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
              <linearGradient id="brimGrad404" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
            </defs>
            <path d="M32 6 L48 52 L16 52 Z" fill="url(#hatGrad404)" />
            <ellipse cx="32" cy="52" rx="22" ry="6" fill="url(#brimGrad404)" />
            <text x="32" y="38" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">?</text>
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-purple-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Spell Not Found
        </h2>
        <p className="text-gray-400 mb-8">
          The magical page you&apos;re looking for has vanished into thin air.
          Perhaps the wizard miscast the spell?
        </p>

        {/* CTA Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Return to Wizard Party
        </Link>

        {/* Decorative sparkles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full opacity-30 animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-yellow-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </div>
  );
}
