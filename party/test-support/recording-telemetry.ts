/**
 * The room's real TelemetryRecorder with a sink that keeps every envelope in memory, for suites
 * that assert what a room records (RoomHarness `telemetry` option). Not part of the worker.
 */
import type { AnyTelemetryEnvelope, TelemetryEventType, TelemetryPayloads } from '../../shared/telemetry';
import { INITIAL_TELEMETRY_CURSOR, TelemetryRecorder } from '../telemetry/telemetry-recorder';

export class RecordingTelemetry {
  /** Every envelope the recorder appended, in order. */
  readonly events: AnyTelemetryEnvelope[] = [];
  readonly recorder: TelemetryRecorder;

  constructor(roomId: string) {
    this.recorder = new TelemetryRecorder({
      roomId,
      serverVersion: null,
      sink: {
        loadCursor: () => Promise.resolve(INITIAL_TELEMETRY_CURSOR),
        append: (batch) => {
          this.events.push(...batch);
        },
      },
    });
  }

  ofType<T extends TelemetryEventType>(type: T): Extract<AnyTelemetryEnvelope, { type: T }>[] {
    return this.events.filter((event): event is Extract<AnyTelemetryEnvelope, { type: T }> => event.type === type);
  }

  payloadsOf<T extends TelemetryEventType>(type: T): TelemetryPayloads[T][] {
    return this.ofType(type).map((event) => event.payload as TelemetryPayloads[T]);
  }
}
