import { routePartykitRequest, Server, type Connection, type ConnectionContext, type WSMessage } from 'partyserver';
import { GameRoom } from './room/game-room';
import {
  DurableObjectOutbox,
  HttpTelemetryTransport,
  extractClientInfo,
  NOOP_TELEMETRY,
  TelemetryRecorder,
  type GameTelemetry,
} from './telemetry';
import { AlarmMultiplexer } from './utils/alarm-multiplexer';
import { createTournamentMatchServices, type MatchResultOutbox, type TournamentMatchServices } from './tournament';

interface Env {
  Main: DurableObjectNamespace<Main>;
  /** The app's /api/telemetry/ingest; telemetry is disabled when unset. */
  TELEMETRY_INGEST_URL?: string;
  TELEMETRY_INGEST_SECRET?: string;
  /** Shared with the Next.js server (tickets, result signatures); tournaments are unavailable when unset. */
  TOURNAMENT_SECRET?: string;
  /** The app's /api/tournaments/match-results; tournaments are unavailable when unset. */
  TOURNAMENT_RESULT_URL?: string;
  CF_VERSION_METADATA?: WorkerVersionMetadata;
}

const ALARM_CHANNELS = {
  GAME: 'game',
  TELEMETRY: 'telemetry',
  TOURNAMENT: 'tournament',
  TOURNAMENT_RESULTS: 'tournament-results',
} as const;
/** RFC 6455 close code for a data type the endpoint cannot accept. */
const UNSUPPORTED_DATA_CLOSE_CODE = 1003;

/** Cloudflare transport and storage adapter for the game server. */
export class Main extends Server<Env> {
  private gameServer!: GameRoom;
  private outbox: DurableObjectOutbox | null = null;
  private resultOutbox: MatchResultOutbox | null = null;
  private alarms!: AlarmMultiplexer;

  async onStart(): Promise<void> {
    const storage = this.ctx.storage;
    this.alarms = new AlarmMultiplexer(storage);
    const gameAlarm = this.alarms.channel(ALARM_CHANNELS.GAME);

    this.gameServer = new GameRoom(
      {
        id: this.name,
        storage: {
          get: (key) => storage.get(key),
          put: (key, value) => storage.put(key, value),
          setAlarm: (time) => gameAlarm.setAlarm(time),
          deleteAlarm: () => gameAlarm.deleteAlarm(),
        },
        broadcast: (message, without) => this.broadcast(message, without),
        getConnections: () => this.getConnections(),
      },
      undefined,
      this.createTelemetry(),
      { tournament: this.createTournamentServices() }
    );
    await this.gameServer.onStart();
    await this.resultOutbox?.resume();
  }

  private createTournamentServices(): TournamentMatchServices {
    const { services, outbox } = createTournamentMatchServices({
      secret: this.env.TOURNAMENT_SECRET,
      resultUrl: this.env.TOURNAMENT_RESULT_URL,
      storage: this.ctx.storage,
      matchAlarm: this.alarms.channel(ALARM_CHANNELS.TOURNAMENT),
      resultsAlarm: this.alarms.channel(ALARM_CHANNELS.TOURNAMENT_RESULTS),
    });
    this.resultOutbox = outbox;
    return services;
  }

  private createTelemetry(): GameTelemetry {
    const { TELEMETRY_INGEST_URL: url, TELEMETRY_INGEST_SECRET: secret, CF_VERSION_METADATA: version } = this.env;
    if (!url || !secret) return NOOP_TELEMETRY;

    this.outbox = new DurableObjectOutbox({
      storage: this.ctx.storage,
      transport: new HttpTelemetryTransport({ url, secret, producer: 'wizard-party-worker' }),
      alarm: this.alarms.channel(ALARM_CHANNELS.TELEMETRY),
    });
    return new TelemetryRecorder({
      roomId: this.name,
      serverVersion: version?.id ?? null,
      sink: this.outbox,
    });
  }

  onConnect(connection: Connection, ctx: ConnectionContext): void {
    this.gameServer.onConnect(connection, extractClientInfo(ctx.request));
  }

  onMessage(connection: Connection, message: WSMessage): void {
    if (typeof message !== 'string') {
      this.gameServer.onInvalidFrame(connection);
      connection.close(UNSUPPORTED_DATA_CLOSE_CODE, 'Text messages required');
      return;
    }
    this.gameServer.onMessage(message, connection);
  }

  onClose(connection: Connection, code: number, reason: string, wasClean: boolean): void {
    this.gameServer.onClose(connection, { code, reason, wasClean });
  }

  async onAlarm(): Promise<void> {
    await this.alarms.dispatch({
      [ALARM_CHANNELS.GAME]: () => this.gameServer.onAlarm(),
      [ALARM_CHANNELS.TELEMETRY]: () => this.outbox?.flush(),
      [ALARM_CHANNELS.TOURNAMENT]: () => this.gameServer.onTournamentAlarm(),
      [ALARM_CHANNELS.TOURNAMENT_RESULTS]: () => this.resultOutbox?.flush(),
    });
  }

  async onRequest(request: Request): Promise<Response> {
    return this.gameServer.onRequest(request);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'wizard-party', platform: 'cloudflare-workers' });
    }
    // Preserve room availability URLs used by previously deployed clients.
    if (url.pathname.startsWith('/party/')) {
      url.pathname = url.pathname.replace('/party/', '/parties/main/');
      request = new Request(url, request);
    }
    return (await routePartykitRequest(request, env)) ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
