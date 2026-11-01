import { buildPartyRoomUrl as buildRoomUrl } from '@shared/realtime/realtime-host';

import { normalizeRealtimeHost } from '@/config/deployment.config';

/** Host input from links and saved settings; the retired PartyKit host maps to this deployment's worker. */
export const normalizePartyHostInput = normalizeRealtimeHost;

export function buildPartyRoomUrl(host: string, roomId: string): string {
  return buildRoomUrl(normalizeRealtimeHost(host), roomId);
}
