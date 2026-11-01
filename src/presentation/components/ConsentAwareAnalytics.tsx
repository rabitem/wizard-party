"use client";

import { useAnalyticsConsent } from "@/lib/cookie-consent";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { ClientTelemetryCollector } from "./ClientTelemetryCollector";

/**
 * GDPR-compliant analytics wrapper for Germany.
 * Only loads Vercel Analytics and Speed Insights after the user
 * has explicitly accepted cookies (not "Essential Only").
 * The first-party client telemetry collector follows the same consent.
 */
export function ConsentAwareAnalytics() {
  const hasConsent = useAnalyticsConsent();

  if (!hasConsent) {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <ClientTelemetryCollector />
    </>
  );
}
