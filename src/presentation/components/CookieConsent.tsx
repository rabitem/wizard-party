"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import {
  onOpenConsentSettings,
  openConsentSettings,
  setConsentStatus,
  useConsentStatus,
} from "@/lib/cookie-consent";
import { THEME_SURFACE } from "@/presentation/config/theme-surface.config";
import { isSandboxRoute } from "@/presentation/utils/sandbox-route";

const BANNER_DELAY_MS = 1000;

// Both choices get identical styling: rejecting must be as easy and as prominent as accepting.
const CHOICE_BUTTON_CLASS =
  "px-4 py-1.5 rounded border-2 border-amber-600/50 text-amber-100 text-sm transition-all cursor-pointer hover:border-amber-500/60";
const CHOICE_BUTTON_STYLE = {
  background: THEME_SURFACE.BUTTON_BG,
  fontFamily: 'var(--font-serif)',
} as const;

function ConsentButtons({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <>
      <button onClick={onDecline} className={CHOICE_BUTTON_CLASS} style={CHOICE_BUTTON_STYLE}>
        Essential only
      </button>
      <button onClick={onAccept} className={CHOICE_BUTTON_CLASS} style={CHOICE_BUTTON_STYLE}>
        Accept analytics
      </button>
    </>
  );
}

function ConsentDetails() {
  return (
    <div className="mt-2 grid gap-2 text-xs text-amber-300/60 sm:grid-cols-2">
      <div>
        <p className="text-amber-200/80">Essential (always on)</p>
        <p>
          Your player ID, name and game settings in local storage, the game server connection, and
          server-side game records (moves, chat, connection and device data) needed to run, secure and
          debug the game.
        </p>
      </div>
      <div>
        <p className="text-amber-200/80">Analytics (optional)</p>
        <p>
          Vercel Web Analytics &amp; Speed Insights plus our own performance, device and error metrics
          (e.g. loading times, frame rate, latency, browser and hardware details, JavaScript errors).
          Stored for up to 90 days.
        </p>
      </div>
    </div>
  );
}

export function CookieConsent() {
  const pathname = usePathname();
  const consentStatus = useConsentStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (consentStatus === "pending") {
      timerRef.current = setTimeout(() => setIsVisible(true), BANNER_DELAY_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [consentStatus]);

  useEffect(
    () =>
      onOpenConsentSettings(() => {
        setShowDetails(true);
        setIsVisible(true);
      }),
    []
  );

  const decide = (status: "accepted" | "declined") => {
    setConsentStatus(status);
    setIsVisible(false);
  };

  // The sandbox loads no analytics, and the banner would cover the hand it audits.
  if (!isVisible || isSandboxRoute(pathname)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
      <div
        className="pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-500"
        role="dialog"
        aria-live="polite"
        aria-label="Privacy settings"
      >
        <div
          className="relative border-t-2 border-amber-700/40 overflow-hidden"
          style={{
            background: THEME_SURFACE.BANNER_BG,
            boxShadow: THEME_SURFACE.BANNER_SHADOW,
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded border border-amber-700/40 flex items-center justify-center"
                  style={{ background: THEME_SURFACE.TILE_BG }}
                >
                  <Cookie className="w-4 h-4 text-amber-500/80" />
                </div>

                <div className="text-amber-300/70 text-sm font-serif">
                  <p>
                    <span className="text-amber-200/90">Wizard Party</span> stores only what the game needs.
                    With your consent we also collect analytics on performance, devices and errors to improve the
                    game. You can change your choice at any time via &quot;Privacy settings&quot; in the footer or
                    in the privacy policy.{" "}
                    <button
                      type="button"
                      onClick={() => setShowDetails((value) => !value)}
                      className="text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer"
                    >
                      {showDetails ? "Hide details" : "Details"}
                    </button>{" "}
                    ·{" "}
                    <Link href="/privacy" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                      Privacy policy
                    </Link>{" "}
                    ·{" "}
                    <Link href="/imprint" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                      Imprint
                    </Link>
                  </p>
                  {showDetails ? <ConsentDetails /> : null}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <ConsentButtons onAccept={() => decide("accepted")} onDecline={() => decide("declined")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Link-style button that reopens the consent dialog; place it wherever users look for privacy controls. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className ?? "underline underline-offset-2 cursor-pointer"}>
      Privacy settings
    </button>
  );
}
