import { BOT_NAMES, type Player } from '../../shared/domain';
import type { ServerContext } from '../utils/types';
import { matchTableSize, updateSeat, type TournamentMatchRecord } from './match-record';
import { seatPlayer } from './match-schedule';

/*
 * Seating a match table for its start. Members who are seated but in their lobby grace (dropped
 * moments ago, may still come back) are taken over by a bot; absent members, and members who are
 * merely remembered without a live connection or grace (e.g. restored after a worker restart),
 * become no-shows whose seats a bot plays. The descriptor's extra bots are added, and the players
 * are put in deal order (roster seat = deal order index).
 */

type StartContext = Pick<ServerContext, 'game' | 'useCases' | 'roomSettings' | 'botCounter' | 'setBotCounter' | 'broadcast'>;
type BotDifficultyLevel = NonNullable<Player['botDifficulty']>;

const TAKEOVER_NAME_PREFIX = 'Bot ';

/** At the table for the start: connected, or within the grace of a drop that may still return. */
function isPresent(game: StartContext['game'], player: Player): boolean {
  return player.isBot || player.isConnected || game.isPlayerGraced(player.id);
}

function takeOverDisconnected(ctx: StartContext, record: TournamentMatchRecord): TournamentMatchRecord {
  const difficulty = record.match.botDifficulty as BotDifficultyLevel;
  return record.seats.reduce((next, seat) => {
    const player = seatPlayer(ctx.game, seat);
    if (!player || !isPresent(ctx.game, player)) {
      if (player) ctx.game.removePlayer(player.id);
      return updateSeat(next, seat.uid, { noShow: true, playerId: null });
    }
    if (player.isBot || (player.isConnected && !ctx.game.isPlayerGraced(player.id))) return next;
    // Same takeover as a disconnect mid-game (ResumeGameUseCase): the member may still come back.
    ctx.game.removeFromGrace(player.id);
    player.isBot = true;
    player.isConnected = true;
    player.botDifficulty = difficulty;
    player.name = `${TAKEOVER_NAME_PREFIX}${seat.name}`;
    return updateSeat(next, seat.uid, { botTakeover: true });
  }, record);
}

/** Adds one bot through the regular use case, skipping bot names a member already uses. */
function addSeatBot(ctx: StartContext, botCounter: number, difficulty: BotDifficultyLevel): { botId: string; botCounter: number } {
  let counter = botCounter;
  for (let tries = 0; tries < BOT_NAMES.length && !ctx.game.isNameAvailable(BOT_NAMES[(counter + 1) % BOT_NAMES.length]); tries++) {
    counter++;
  }
  const result = ctx.useCases.addBot.execute({
    game: ctx.game,
    playerId: ctx.game.hostId,
    maxPlayers: ctx.roomSettings.maxPlayers,
    botCounter: counter,
    difficulty,
  });
  ctx.broadcast(result.playerJoinedEvent);
  return { botId: result.botId, botCounter: result.newBotCounter };
}

function fillEmptySeats(ctx: StartContext, record: TournamentMatchRecord): { record: TournamentMatchRecord; seatOrder: Map<string, number> } {
  const difficulty = record.match.botDifficulty as BotDifficultyLevel;
  const seatOrder = new Map<string, number>();
  for (const seat of record.seats) {
    if (!seat.noShow && seat.playerId !== null) seatOrder.set(seat.playerId, seat.seat);
  }
  const taken = new Set(seatOrder.values());
  // Bots seated by an earlier attempt that did not start are reused, so a retry never overfills.
  const spareBots = ctx.game.players.filter((player) => player.isBot && !seatOrder.has(player.id)).map((player) => player.id);
  let next = record;
  let botCounter = ctx.botCounter;
  for (let index = 0; index < matchTableSize(record); index++) {
    if (taken.has(index)) continue;
    let botId = spareBots.shift();
    if (botId === undefined) {
      const added = addSeatBot(ctx, botCounter, difficulty);
      botCounter = added.botCounter;
      botId = added.botId;
    }
    seatOrder.set(botId, index);
    const noShowSeat = next.seats.find((seat) => seat.seat === index);
    if (noShowSeat) next = updateSeat(next, noShowSeat.uid, { playerId: botId });
  }
  ctx.setBotCounter(botCounter);
  return { record: next, seatOrder };
}

/** The host presses "next round"; prefer a member who is actually at the table. */
function ensurePresentHost(ctx: StartContext): void {
  const host = ctx.game.getPlayer(ctx.game.hostId);
  if (host && !host.isBot && host.isConnected) return;
  // A host who was dropped as a no-show must still be replaced, by a bot if nobody else is there.
  const replacement = ctx.game.players.find((player) => !player.isBot && player.isConnected) ?? (host ? undefined : ctx.game.players[0]);
  if (replacement) ctx.game.transferHost(replacement.id);
}

/** Members present in person or by takeover; zero means the whole table is a no-show. */
export function hasSeatedMembers(ctx: Pick<ServerContext, 'game'>, record: TournamentMatchRecord): boolean {
  return record.seats.some((seat) => {
    const player = seat.noShow ? undefined : seatPlayer(ctx.game, seat);
    return player !== undefined && isPresent(ctx.game, player);
  });
}

/** Prepares the lobby for StartGameUseCase; returns the record with no-shows and takeovers marked. */
export function seatTableForStart(ctx: StartContext, record: TournamentMatchRecord): TournamentMatchRecord {
  const filled = fillEmptySeats(ctx, takeOverDisconnected(ctx, record));
  const position = (player: Player) => filled.seatOrder.get(player.id) ?? Number.MAX_SAFE_INTEGER;
  ctx.game.players.sort((a, b) => position(a) - position(b));
  ensurePresentHost(ctx);
  return filled.record;
}
