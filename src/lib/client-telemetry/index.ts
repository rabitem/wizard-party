// Browser-only client telemetry (consent gated). See shared/telemetry/client-telemetry.ts for the contract.
export { clientTelemetry } from './browser-client-telemetry';
export type { CollectorScope } from './client-telemetry';
export { RealtimeTelemetry, socketCloseInfo, type ServerMessage, type SocketCloseInfo } from './realtime-telemetry';
export { resolveAppVersion } from './session-context';
