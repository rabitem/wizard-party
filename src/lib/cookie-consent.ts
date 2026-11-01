import { useSyncExternalStore } from "react";

import { safeLocalStorage } from "./storage";

export const COOKIE_CONSENT_KEY = "wizard-party-cookie-consent";

/**
 * Bump whenever the purposes covered by "analytics" change. Older decisions are then treated as
 * "pending" so the banner asks again: a consent only covers what the user was told at the time.
 *
 * v2: adds first-party performance, device and error telemetry (see /privacy section 4.2).
 */
export const CONSENT_VERSION = 2;

/** Consent must be renewed periodically (DSK guidance: at most every 12 months). */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const CONSENT_CHANGED_EVENT = "wizard-party-consent-changed";
const OPEN_CONSENT_SETTINGS_EVENT = "wizard-party-open-consent-settings";

export type ConsentStatus = "pending" | "accepted" | "declined";

/** What is persisted: the decision, which policy version it refers to and when it was made (Art. 7(1) GDPR). */
export interface ConsentRecord {
  status: Exclude<ConsentStatus, "pending">;
  version: number;
  decidedAt: string;
}

function readRecord(): ConsentRecord | null {
  // Legacy plain-string values ("accepted"/"declined") predate versioning: they do not parse as
  // JSON objects, so they read as null and are re-asked.
  const record = safeLocalStorage.readJson(COOKIE_CONSENT_KEY) as Partial<ConsentRecord> | null;
  if (!record || typeof record !== "object") return null;
  if (record.status !== "accepted" && record.status !== "declined") return null;
  if (typeof record.version !== "number" || typeof record.decidedAt !== "string") return null;
  return record as ConsentRecord;
}

/** Current decision; "pending" when none, outdated (older policy version) or expired. */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "pending";
  const record = readRecord();
  if (!record || record.version !== CONSENT_VERSION) return "pending";
  if (Date.now() - Date.parse(record.decidedAt) > CONSENT_MAX_AGE_MS) return "pending";
  return record.status;
}

export function hasAnalyticsConsent(): boolean {
  return getConsentStatus() === "accepted";
}

/** Notified on decisions in this tab and in other tabs. Returns an unsubscribe function. */
export function subscribeToConsent(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === COOKIE_CONSENT_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONSENT_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONSENT_CHANGED_EVENT, callback);
  };
}

/**
 * Hook to check if the user has accepted analytics.
 * Returns true only for an explicit, current acceptance (§ 25 TDDDG, Art. 6(1)(a) GDPR).
 */
export function useAnalyticsConsent(): boolean {
  return useConsentStatus() === "accepted";
}

/**
 * Hook to get the current consent status.
 * - "pending": no current decision (never asked, policy changed or consent expired)
 * - "accepted": analytics allowed
 * - "declined": essential only
 */
export function useConsentStatus(): ConsentStatus {
  return useSyncExternalStore(subscribeToConsent, getConsentStatus, () => "pending");
}

/** Records a decision. Passing "pending" withdraws it, so the banner asks again. */
export function setConsentStatus(status: ConsentStatus): void {
  if (typeof window === "undefined") return;
  if (status === "pending") {
    safeLocalStorage.removeItem(COOKIE_CONSENT_KEY);
  } else {
    const record: ConsentRecord = { status, version: CONSENT_VERSION, decidedAt: new Date().toISOString() };
    safeLocalStorage.writeJson(COOKIE_CONSENT_KEY, record);
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

/** Reopens the consent dialog so a decision can be changed or withdrawn at any time (Art. 7(3) GDPR). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_CONSENT_SETTINGS_EVENT));
}

export function onOpenConsentSettings(callback: () => void): () => void {
  window.addEventListener(OPEN_CONSENT_SETTINGS_EVENT, callback);
  return () => window.removeEventListener(OPEN_CONSENT_SETTINGS_EVENT, callback);
}
