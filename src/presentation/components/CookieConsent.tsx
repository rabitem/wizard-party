"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "wizard-party-cookie-consent";

type ConsentStatus = "pending" | "accepted" | "declined";

// Custom hook to safely read localStorage with SSR support
function useConsentStorage() {
  const subscribe = (callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  };

  const getSnapshot = (): ConsentStatus => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (saved === "accepted" || saved === "declined") {
      return saved;
    }
    return "pending";
  };

  const getServerSnapshot = (): ConsentStatus => "pending";

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function CookieConsent() {
  const consentStatus = useConsentStorage();
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only show banner if consent is pending
    if (consentStatus === "pending") {
      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [consentStatus]);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    // Trigger storage event for sync
    window.dispatchEvent(new Event("storage"));
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    // Trigger storage event for sync
    window.dispatchEvent(new Event("storage"));
    setIsVisible(false);
  };

  // Don't render if consent was already given or declined
  if (consentStatus !== "pending" || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-500">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-t from-amber-500/20 via-purple-500/10 to-transparent rounded-3xl blur-xl opacity-60" />

        {/* Main container */}
        <div className="relative bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-amber-500/20 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Subtle top gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <div className="p-5">
            {/* Header with icon */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-amber-100 font-medium mb-2">
                  Cookie-Hinweis
                </h3>
                <p className="text-amber-200/60 text-sm leading-relaxed">
                  Wizard Party verwendet nur{" "}
                  <span className="text-amber-200/80">
                    technisch notwendige Cookies
                  </span>{" "}
                  für die Spielfunktion. Wir verwenden keine Tracking- oder
                  Werbe-Cookies.{" "}
                  <Link
                    href="/datenschutz"
                    className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
                  >
                    Mehr erfahren
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={handleAccept}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 cursor-pointer"
              >
                Akzeptieren
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 px-5 py-2.5 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 text-amber-200/70 hover:text-amber-100 font-medium rounded-xl transition-all duration-200 cursor-pointer"
              >
                Nur notwendige
              </button>
            </div>

            {/* Links */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-amber-500/10 text-xs">
              <Link
                href="/datenschutz"
                className="text-amber-400/50 hover:text-amber-300 transition-colors"
              >
                Datenschutz
              </Link>
              <span className="text-amber-500/20">•</span>
              <Link
                href="/impressum"
                className="text-amber-400/50 hover:text-amber-300 transition-colors"
              >
                Impressum
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
