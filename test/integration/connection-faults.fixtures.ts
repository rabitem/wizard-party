/**
 * The table both connection-fault suites start from, and what they read off the room and the
 * wire. Expected values come from the room (`table.server.game`, the frames it sent), never from
 * the client under test.
 *
 * Seats are taken in join order (Ann, Ben, the bot). Ann deals round 1 and the deal moves one seat
 * per round; the player left of the dealer bids and leads first. So round 1 is bid and led by Ben
 * (then the bot, then Ann), and round 2's first trick is led by the bot (then Ann, then Ben).
 */
import { GameEventType, GamePhase, type IGameState, type IPlayer } from '@shared/domain';
import type { WireMessage } from '../../party/test-support/room-harness';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import type { PlayerClient } from './support/player-client';
import { view } from './support/screen-model';

export const FAULTS_SEED = 23;
export const FAULTS_NETWORK = { latencyMs: 30, jitterMs: 20 } as const;
/** The longest one frame takes on FAULTS_NETWORK, one way. */
export const ONE_WAY_MAX_MS = FAULTS_NETWORK.latencyMs + FAULTS_NETWORK.jitterMs;
export const ROUND_TRIP_MAX_MS = 2 * ONE_WAY_MAX_MS;

export interface FaultsTable {
  table: FullStackTable;
  /** Ann's browser created the room and hosts it. */
  ann: PlayerClient;
  ben: PlayerClient;
}

/**
 * Ann and Ben in their own browsers and one bot, a two-round game started. `keep` gets the table
 * as soon as it exists, so the suite disposes it even when the setup fails.
 */
export async function startedTable(keep: (table: FullStackTable) => void, seed = FAULTS_SEED): Promise<FaultsTable> {
  const table = await FullStackTable.create({ seed, network: FAULTS_NETWORK });
  keep(table);
  const ann = table.open(table.browser('Ann'), 'Ann');
  await ann.join({ name: 'Faults table', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset({ rounds: 2 }) });
  const ben = table.open(table.browser('Ben'), 'Ben');
  await ben.join();
  ann.addBot(2);
  await table.settle();
  ann.start();
  await table.settle();
  return { table, ann, ben };
}

/** The seat id the room gave the player called `name`. */
export function seatOf(table: FullStackTable, name: string): string {
  const seat = table.server.game.players.find((player) => player.name === name);
  if (!seat) throw new Error(`the room seats nobody called ${name}`);
  return seat.id;
}

/** Who the room waits for now. */
export function seatOnTurn(table: FullStackTable): string | undefined {
  return table.server.game.getCurrentPlayer()?.id;
}

/** The cards a seat holds, as the room knows them. */
export function handOf(table: FullStackTable, seatId: string): string[] {
  return table.server.game.getPlayer(seatId)?.hand.map((card) => card.id) ?? [];
}

/** The cards of the room's open trick, in play order. */
export function trickInRoom(table: FullStackTable): string[] {
  return table.server.game.currentTrick?.cards.map((played) => played.card.id) ?? [];
}

/** Plays until round 2's first trick: the bot led and Ann is to play (Ben plays last). */
export async function playToRoundTwoLead(table: FullStackTable): Promise<void> {
  await table.playUntil(() => {
    const game = table.server.game;
    return game.currentRound === 2 && game.phase === GamePhase.PLAYING && trickInRoom(table).length === 1;
  });
}

/** The cards of the trick on the player's table, as it shows them. */
export function trickShownTo(client: PlayerClient): string[] {
  return view(client).table?.game.currentTrick?.cards.map((played) => played.card.id) ?? [];
}

/** The cards the player's hand shows. */
export function handShownTo(client: PlayerClient): string[] {
  const screen = view(client);
  return screen.table?.game.players.find((player) => player.id === screen.seatId)?.hand.map((card) => card.id) ?? [];
}

/** A seat as the player's table shows it. */
export function seatShownTo(client: PlayerClient, seatId: string): IPlayer | undefined {
  return view(client).table?.game.players.find((player) => player.id === seatId);
}

/** Every frame of a type the room sent this player, over all their sockets, oldest first. */
export function framesTo(client: PlayerClient, type: GameEventType): WireMessage[] {
  return client.connections.flatMap((connection) => connection.ofType(type));
}

function playedCardId(frame: WireMessage): unknown {
  const card = frame.card;
  return typeof card === 'object' && card !== null && 'id' in card ? card.id : undefined;
}

/** How often the room told this player that `cardId` was played. */
export function playsOfCard(client: PlayerClient, cardId: string): number {
  return framesTo(client, GameEventType.CARD_PLAYED).filter((frame) => playedCardId(frame) === cardId).length;
}

/** The chat lines from `seatId` the room delivered to this player, in order. */
export function chatFrom(client: PlayerClient, seatId: string): unknown[] {
  return framesTo(client, GameEventType.CHAT_MESSAGE).filter((frame) => frame.playerId === seatId).map((frame) => frame.message);
}

/** What a table is, independent of when it got there: phase, deal, trick, hands and scores. */
export function tableFacts(state: IGameState) {
  return {
    phase: state.phase,
    round: state.currentRound,
    turn: state.currentPlayerIndex,
    trump: state.trumpSuit,
    trick: state.currentTrick?.cards.map(({ playerId, card }) => `${playerId}:${card.id}`) ?? [],
    players: state.players.map(({ id, name, hand, bid, tricksWon, score, roundHistory }) => ({
      id,
      name,
      hand: hand.map((card) => card.id),
      bid,
      tricksWon,
      score,
      roundHistory,
    })),
  };
}
