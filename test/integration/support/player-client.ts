/**
 * One player's headless game client: the production composition (createGameClient with its
 * GameSession, store, TrickPresentation and TableFeeds) on a loopback socket, an InstantTable in
 * place of the 3D table, the router's page and the HUD's held standings. The driver methods call
 * the same GameCommands and ConnectionActions the UI calls, and only with what the player's screen
 * offers (offers.ts); `commands` stays open for scenarios that send what a stale screen still shows.
 */
import { ALL_SUITS, type ICardDeclaration, type IRulesetConfig, type Suit } from '@shared/domain';
import { CONNECTION_LIVENESS } from '@/presentation/config/connection.config';
import { ConnectionTelemetry } from '@/presentation/hooks/connection/connection-telemetry';
import {
  createConnectionActions,
  createGameClient,
  type ConnectionActions,
  type GameClient,
} from '@/presentation/hooks/connection/game-client';
import type { GameCommands } from '@/presentation/hooks/connection/game-commands';
import type { GameClientState } from '@/presentation/hooks/connection/game-client-state';
import type { GameSocketFactory } from '@/presentation/hooks/connection/game-socket';
import { TableFeeds } from '@/presentation/hooks/connection/table-feeds';
import type { BotDifficulty } from '@/presentation/components/lobby/table/lobby-view.types';
import type { RoomSettings } from '@/presentation/types';
import type { DisplayStandings } from '@/presentation/hooks/useDisplayStandings';
import type { TestConnection } from '../../../party/test-support/room-harness';
import type { BrowserProfile } from './browser-profile';
import { InstantTable, type InstantTableTiming } from './instant-table';
import * as offers from './offers';
import { displayedGame, followPage, liveStandings, view, type ClientSurface } from './screen-model';

/** The host name the client is given; the loopback ignores it. */
const LOOPBACK_HOST = 'loopback.test';
const APP_VERSION = 'integration';

const SILENT_REALTIME: ConstructorParameters<typeof ConnectionTelemetry>[0] = {
  connecting: () => {},
  opened: () => {},
  closed: () => {},
  connectTimedOut: () => {},
  commandSent: () => {},
  messageReceived: () => {},
};
const NO_ROOM_CONTEXT: ConstructorParameters<typeof ConnectionTelemetry>[1] = { setRoomId: () => {} };

/** This client's side of the network: its sockets as the room saw them, and the faults of the open one. */
export interface ClientWire {
  /** Every connection this client opened to the room, oldest first (their wire logs). */
  readonly connections: readonly TestConnection[];
  /** The network loses the open socket: both sides see it close (1006), the client reconnects. */
  drop(): void;
  /** The open socket turns into a zombie: it stays open and nothing gets through. */
  blackhole(): void;
}

export interface PlayerClientDeps {
  roomId: string;
  socketFactory: GameSocketFactory;
  wire: ClientWire;
  /** The client's reconnect jitter. */
  random: () => number;
  tableTiming: InstantTableTiming;
  /** Runs the table until it is quiet (FullStackTable.settle). */
  settle: () => Promise<void>;
}

export class PlayerClient {
  /** The commands the UI sends; for moves the driver methods would refuse as not offered. */
  readonly commands: GameCommands;
  readonly table: InstantTable;
  /** Every error the player was shown, in order. */
  readonly notices: string[] = [];
  private readonly client: GameClient;
  private readonly connection: ConnectionActions;
  private readonly expected = new Set<string>();
  private readonly unsubscribe: (() => void)[];
  private readonly liveness: ReturnType<typeof setInterval>;
  private page = '/';
  private held: DisplayStandings = liveStandings(null);
  private shownError: string | null = null;
  private closed = false;

  constructor(readonly name: string, readonly profile: BrowserProfile, private readonly deps: PlayerClientDeps) {
    this.client = createGameClient({
      socketFactory: deps.socketFactory,
      seatTokens: profile.seatTokens,
      telemetry: new ConnectionTelemetry(SILENT_REALTIME, NO_ROOM_CONTEXT),
      persistentId: () => profile.persistentId,
      appVersion: () => APP_VERSION,
      random: deps.random,
      feeds: new TableFeeds({ ticketStorage: profile.tickets }),
    });
    this.connection = createConnectionActions(this.client);
    this.commands = this.client.commands;
    this.table = new InstantTable(this.client.trick, {
      round: () => this.state.serverState?.currentRound ?? 0,
      isInOwnHand: (cardId) => !!this.state.serverState?.players
        .find((player) => player.id === this.state.playerId)?.hand.some((card) => card.id === cardId),
    }, deps.tableTiming);
    this.unsubscribe = [this.client.store.subscribe(this.observe), this.client.trick.subscribe(this.observe)];
    // The page checks a quiet line periodically while it is visible (useSessionWakeups).
    this.liveness = setInterval(() => this.client.session.checkLiveness(), CONNECTION_LIVENESS.CHECK_INTERVAL_MS);
  }

  get state(): GameClientState {
    return this.client.store.getState();
  }

  get seatId(): string | null {
    return this.state.playerId;
  }

  get connections(): readonly TestConnection[] {
    return this.deps.wire.connections;
  }

  /** Refusals (ERROR codes or messages, shown errors) this scenario expects this player to get. */
  get expectedRefusals(): ReadonlySet<string> {
    return this.expected;
  }

  /** The tab was closed (or the table disposed): the client does nothing any more. */
  get isClosed(): boolean {
    return this.closed;
  }

  /** No flight, landing, collection, reconnect or undecided play is under way. */
  get isSettled(): boolean {
    return this.unsettledBy().length === 0;
  }

  /** What keeps this client from rest, for the table's timeout message. */
  unsettledBy(): string[] {
    if (this.closed) return [];
    const { status, pendingPlay } = this.state;
    const trick = this.client.trick.getState();
    const reasons: string[] = [];
    if (status === 'connecting' || status === 'reconnecting') reasons.push(status);
    if (pendingPlay !== null) reasons.push(`pending play ${pendingPlay.cardId}`);
    if (!this.table.isIdle) reasons.push(`table busy (${this.table.busyDetail})`);
    if (this.client.trick.isBusy()) {
      reasons.push(`trick busy (pending result ${trick.pendingTrickResult ? 'yes' : 'no'}, result ${trick.trickResult ? 'yes' : 'no'}, visible ${trick.visiblePlayedCardIds.size})`);
    }
    if (trick.backlog > 0) reasons.push(`backlog ${trick.backlog}`);
    return reasons;
  }

  surface(): ClientSurface {
    return {
      state: this.state,
      presentation: this.client.trick.getState(),
      feeds: this.client.feeds.store.getState(),
      page: this.page,
      heldStandings: this.held,
    };
  }

  expectRefusal(codeOrMessage: string): void {
    this.expected.add(codeOrMessage);
  }

  /** Opens the table's room from the lobby page; the first joiner creates it with `roomSettings`. */
  async join(roomSettings?: RoomSettings): Promise<void> {
    this.page = `/lobby/${this.deps.roomId}`;
    this.connection.connect(LOOPBACK_HOST, this.deps.roomId, this.name, roomSettings);
    await this.deps.settle();
  }

  ready(ready = true): void {
    offers.lobbyOf(this.name, view(this), 'the ready toggle');
    this.commands.setReady(ready);
  }

  addBot(level: BotDifficulty = 3): void {
    offers.lobbyOf(this.name, view(this), 'adding a bot', true);
    this.commands.addBot(level);
  }

  removeBot(name: string): void {
    this.commands.removeBot(offers.lobbySeatNamed(this.name, view(this), name, 'removing a bot').id);
  }

  kick(name: string): void {
    this.commands.kickPlayer(offers.lobbySeatNamed(this.name, view(this), name, 'kicking').id);
  }

  makeHost(name: string): void {
    this.commands.transferHost(offers.lobbySeatNamed(this.name, view(this), name, 'handing over the host').id);
  }

  setRules(rules: IRulesetConfig): void {
    offers.lobbyOf(this.name, view(this), 'the table settings', true);
    this.commands.setRuleset(rules);
  }

  start(): void {
    const lobby = offers.lobbyOf(this.name, view(this), 'the start button', true);
    if (!lobby.readiness.canStart) throw new offers.NotOfferedError(this.name, `the start button (${lobby.readiness.reason})`);
    this.commands.startGame();
  }

  chooseTrump(suit: Suit | null): void {
    this.commands.selectTrump(offers.chooseTrump(this.name, view(this), suit));
  }

  bid(choice: offers.BidChoice = 'lowest-allowed'): void {
    this.commands.placeBid(offers.chooseBid(this.name, view(this), choice));
  }

  play(choice: offers.CardChoice = 'first-legal', declaration?: ICardDeclaration): void {
    const move = offers.chooseCard(this.name, view(this), choice, declaration);
    this.commands.playCard(move.cardId, undefined, undefined, undefined, move.declaration);
  }

  resolve(choice: offers.EffectChoice = 'first-offered'): void {
    this.commands.resolveEffect(offers.chooseEffect(this.name, view(this), choice));
  }

  nextRound(): void {
    if (!offers.canMoveRoundOn(view(this))) throw new offers.NotOfferedError(this.name, 'the next round');
    this.commands.nextRound();
  }

  rematch(): void {
    if (!this.page.startsWith('/results/')) throw new offers.NotOfferedError(this.name, 'a rematch');
    this.commands.requestRematch();
  }

  chat(text: string): void {
    if (!this.seatId) throw new offers.NotOfferedError(this.name, 'the chat');
    this.commands.sendChat(text);
  }

  emote(emoteId: string): void {
    if (!this.seatId) throw new offers.NotOfferedError(this.name, 'emotes');
    this.commands.sendEmote(emoteId);
  }

  /** A timeout sound at the player whose turn timer ran out. */
  heckle(sound: string): void {
    const timer = offers.tableOf(this.name, view(this), 'heckling').game.turnTimerState;
    if (!timer?.expired || timer.playerId === this.seatId) throw new offers.NotOfferedError(this.name, 'heckling');
    this.commands.playTimeoutSound(sound);
  }

  /**
   * The simplest move this screen offers now, if any: the first trump suit, the first effect
   * option, the lowest allowed bid, the first playable card, the next round (host only).
   * True when a move was made.
   */
  autoMove(): boolean {
    const screen = view(this);
    if (screen.status !== 'connected' || !screen.table || screen.table.game.pauseState) return false;
    if (offers.canChooseTrump(screen)) this.chooseTrump(ALL_SUITS[0]);
    else if (offers.canResolveEffect(screen)) this.resolve();
    else if (offers.canBid(this.name, screen)) this.bid();
    else if (screen.table.playableCardIds.length > 0 && !screen.table.interactionsDisabled) this.play();
    else if (offers.canMoveRoundOn(screen)) this.nextRound();
    else return false;
    return true;
  }

  /** "Leave game": the seat goes to a bot in a running game, the player goes home. */
  async leave(): Promise<void> {
    this.page = '/';
    await this.connection.leaveGame();
    await this.deps.settle();
  }

  /** The tab closes: the page unloads (socket closed) and this client is gone. */
  closeTab(): void {
    this.client.session.unload();
    this.dispose();
  }

  dropConnection(): void {
    this.deps.wire.drop();
  }

  blackholeConnection(): void {
    this.deps.wire.blackhole();
  }

  /** The network came back or the page was shown again. */
  wake(): void {
    this.connection.retryConnection();
  }

  /** "Play here" after the seat was opened in another tab. */
  playHere(): void {
    this.connection.takeOverSeat();
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.liveness);
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.table.dispose();
    this.client.session.suspend();
  }

  /** What React would re-render on: the shown errors, the HUD's held standings, the route. */
  private readonly observe = (): void => {
    const state = this.state;
    const presentation = this.client.trick.getState();
    if (state.error !== null && state.error !== this.shownError) this.notices.push(state.error);
    this.shownError = state.error;
    if (presentation.pendingTrickResult === null) this.held = liveStandings(displayedGame({ state, presentation }));
    this.page = followPage(this.page, { state, presentation });
  };
}
