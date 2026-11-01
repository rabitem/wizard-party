"use client";

import { useSyncExternalStore } from "react";

import { safeLocalStorage } from "@/lib/storage";
import { CONSTANTS } from "@/presentation/config/constants";
import { ConsentSettingsButton } from "@/presentation/components/CookieConsent";
import { useConsentStatus } from "@/lib/cookie-consent";

const STATUS_LABELS = {
  accepted: "Analytics accepted",
  declined: "Essential only",
  pending: "No decision yet",
} as const;

function readPlayerId(): string | null {
  return safeLocalStorage.getItem(CONSTANTS.STORAGE_KEYS.PLAYER_ID);
}

/** Shows the current consent decision and lets the user change or withdraw it. */
export function ConsentControls() {
  const status = useConsentStatus();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-amber-200/80">Current choice: {STATUS_LABELS[status]}</span>
      <ConsentSettingsButton className="px-3 py-1 rounded border border-amber-600/50 text-amber-100 text-xs cursor-pointer hover:border-amber-500/60" />
    </div>
  );
}

/** The pseudonymous ID game records are linked to; needed to find a guest's data on request. */
export function PlayerIdNotice() {
  const playerId = useSyncExternalStore(() => () => undefined, readPlayerId, () => null);
  if (!playerId) {
    return <p className="text-amber-400/50 text-xs">No player ID is stored in this browser.</p>;
  }
  return (
    <p className="text-xs">
      Your player ID in this browser:{" "}
      <code className="select-all rounded bg-black/30 px-1.5 py-0.5 text-amber-200/90">{playerId}</code>
      <span className="text-amber-400/50"> (include it in requests so we can find your game records)</span>
    </p>
  );
}
