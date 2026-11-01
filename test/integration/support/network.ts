/**
 * The network between the players' clients and the room in the level-4 harness: every frame in
 * either direction is delivered asynchronously and in order per socket, like a WebSocket, with
 * seeded latency and jitter on the fake clock. Faults: a stall (frames to the clients are held,
 * then arrive as one burst), a blackholed socket (a zombie: frames are swallowed, the socket stays
 * open) and connection attempts that fail before the socket opens.
 */
import { createSeededRandom, hashSeed } from '@/infrastructure/sandbox/seeded-random';

export interface NetworkConditions {
  /** One-way delay of every frame. */
  latencyMs: number;
  /** Extra delay in [0, jitterMs), seeded; frames of one socket never overtake each other. */
  jitterMs: number;
}

const INSTANT: NetworkConditions = { latencyMs: 0, jitterMs: 0 };

type Direction = 'toClient' | 'toServer';

/** One socket's path through the network, both directions. */
export class NetworkLink {
  private blackholed = false;
  private readonly lastDeliveryAt: Record<Direction, number> = { toClient: 0, toServer: 0 };

  constructor(private readonly network: Network) {}

  get isBlackholed(): boolean {
    return this.blackholed;
  }

  /** From now on nothing gets through, in either direction; neither side sees a close. */
  blackhole(): void {
    this.blackholed = true;
  }

  /** A frame (or the close) the room sends to this socket's client. */
  toClient(deliver: () => void): void {
    this.send('toClient', deliver);
  }

  /** A frame (or the close) the client sends to the room. */
  toServer(deliver: () => void): void {
    this.send('toServer', deliver);
  }

  private send(direction: Direction, deliver: () => void): void {
    if (this.blackholed) return;
    this.lastDeliveryAt[direction] = this.network.schedule(deliver, this.lastDeliveryAt[direction], direction === 'toClient');
  }
}

export class Network {
  private conditions: NetworkConditions;
  private readonly random: () => number;
  private stalledUntil = 0;
  private inFlight = 0;
  private failingConnects = 0;

  constructor(seed: number, conditions: Partial<NetworkConditions> = {}) {
    this.conditions = { ...INSTANT, ...conditions };
    this.random = createSeededRandom(hashSeed('net', seed));
  }

  /** Frames on their way (scheduled, not yet delivered). */
  get pending(): number {
    return this.inFlight;
  }

  set(conditions: Partial<NetworkConditions>): void {
    this.conditions = { ...this.conditions, ...conditions };
  }

  /** Holds every frame to the clients for `ms`, then delivers them as one burst (a congested link). */
  stall(ms: number): void {
    this.stalledUntil = Math.max(this.stalledUntil, Date.now() + ms);
  }

  /** The next `count` sockets fail before they open (the host cannot be reached). */
  failNextConnects(count: number): void {
    this.failingConnects += count;
  }

  /** True when the socket being opened is one of the failing ones. */
  takeConnectFailure(): boolean {
    if (this.failingConnects === 0) return false;
    this.failingConnects -= 1;
    return true;
  }

  link(): NetworkLink {
    return new NetworkLink(this);
  }

  /** Delivers after the shaped delay, never before `notBefore`; returns the delivery time. */
  schedule(deliver: () => void, notBefore: number, held: boolean): number {
    const now = Date.now();
    const delay = this.conditions.latencyMs + this.random() * this.conditions.jitterMs;
    const deliverAt = Math.max(now + delay, notBefore, held ? this.stalledUntil : 0);
    this.inFlight += 1;
    // A real socket never delivers inside the sender's call.
    setTimeout(() => {
      this.inFlight -= 1;
      deliver();
    }, deliverAt - now);
    return deliverAt;
  }
}
