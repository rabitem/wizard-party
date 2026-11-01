import { CONNECTION_LIVENESS } from '@/presentation/config/connection.config';

/**
 * Detects "zombie" sockets: connections the network or the OS dropped without the browser ever
 * firing `close` (typical on iOS Safari after the app was backgrounded, or after a network switch).
 * Such a socket keeps `readyState === OPEN`, so sends "succeed" into the void and the normal
 * close-driven reconnect never runs.
 *
 * The check is a probe: a message the server always answers (PING -> PONG; REQUEST_STATE for
 * servers older than protocol 2). If no message at all arrives within PROBE_TIMEOUT_MS, the socket
 * is declared dead. A probe is sent after a quiet period, when the page comes back, and shortly
 * after a command that saw no answer at all.
 */
export interface ConnectionLivenessDeps {
  now: () => number;
  /** The socket claims to be open (readyState OPEN). */
  isOpen: () => boolean;
  /** When the last message of any kind arrived on the current socket. */
  lastMessageAt: () => number;
  sendProbe: () => void;
  /** The current socket is dead: drop it and reconnect. */
  onDead: () => void;
}

export class ConnectionLiveness {
  private probeSentAt: number | null = null;
  private probeTimer: ReturnType<typeof setTimeout> | null = null;
  private answerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: ConnectionLivenessDeps) {}

  /** Commands should wait for a probe instead of going out on a line that may be dead. */
  isSuspect(): boolean {
    if (!this.deps.isOpen()) return false;
    return this.probeSentAt !== null || this.deps.now() - this.deps.lastMessageAt() >= CONNECTION_LIVENESS.QUIET_MS;
  }

  /**
   * Probes when the line has been quiet (or always with `force`, e.g. the page just came back to
   * the foreground). At most one probe is in flight.
   */
  check(force = false): void {
    if (!this.deps.isOpen() || this.probeSentAt !== null) return;
    if (!force && this.deps.now() - this.deps.lastMessageAt() < CONNECTION_LIVENESS.QUIET_MS) return;
    this.probeSentAt = this.deps.now();
    this.deps.sendProbe();
    // Any message cancels this timer (messageReceived), so firing means the probe went unanswered.
    this.probeTimer = setTimeout(() => {
      this.probeTimer = null;
      this.probeSentAt = null;
      this.deps.onDead();
    }, CONNECTION_LIVENESS.PROBE_TIMEOUT_MS);
  }

  /**
   * A command went out on an open socket. If not a single message arrives within
   * COMMAND_ANSWER_MS, the line is probed at once instead of after the quiet period.
   */
  commandSent(): void {
    if (this.answerTimer !== null || !this.deps.isOpen()) return;
    this.answerTimer = setTimeout(() => {
      this.answerTimer = null;
      this.check(true);
    }, CONNECTION_LIVENESS.COMMAND_ANSWER_MS);
  }

  /** Any message proves the line is alive. */
  messageReceived(): void {
    if (this.probeTimer) clearTimeout(this.probeTimer);
    if (this.answerTimer) clearTimeout(this.answerTimer);
    this.probeTimer = null;
    this.answerTimer = null;
    this.probeSentAt = null;
  }

  /** A new socket replaced the old one (or the connection was closed on purpose). */
  reset(): void {
    this.messageReceived();
  }
}
