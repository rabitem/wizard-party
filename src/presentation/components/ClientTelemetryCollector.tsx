"use client";

import { useEffect } from "react";

import { clientTelemetry } from "@/lib/client-telemetry";

/**
 * Runs the client telemetry collector while mounted. Mount it only when analytics consent is
 * given: unmounting (consent revoked) stops every collector and drops unsent events.
 */
export function ClientTelemetryCollector() {
  useEffect(() => {
    clientTelemetry.start();
    return () => clientTelemetry.stop();
  }, []);

  return null;
}
