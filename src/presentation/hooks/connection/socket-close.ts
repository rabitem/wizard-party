import { ConnectionCloseCode } from '@shared/domain';
import { socketCloseInfo } from '@/lib/client-telemetry';

/** Why a socket that the client did not close itself went away. */
export type SocketCloseKind = 'superseded' | 'kicked' | 'transient';

/**
 * Classifies a close by its code. The server's application codes (4000 superseded, 4001 kicked)
 * end the connection for good; everything else (network loss, server restart, a dead proxy) is
 * transient and reconnected. PartySocket may nest the original close event in `reason`, which
 * socketCloseInfo unwraps.
 */
export function classifySocketClose(event: unknown): SocketCloseKind {
  const { code } = socketCloseInfo((event ?? {}) as Parameters<typeof socketCloseInfo>[0], false);
  if (code === ConnectionCloseCode.SUPERSEDED) return 'superseded';
  if (code === ConnectionCloseCode.KICKED) return 'kicked';
  return 'transient';
}
