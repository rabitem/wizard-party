'use client';

import { useEffect } from 'react';

import { clientTelemetry, type CollectorScope } from '@/lib/client-telemetry';

/** Activates scoped telemetry collectors (e.g. render performance for `game`) while mounted. */
export function useClientTelemetryScope(scope: Exclude<CollectorScope, 'global'>): void {
  useEffect(() => clientTelemetry.enterScope(scope), [scope]);
}
