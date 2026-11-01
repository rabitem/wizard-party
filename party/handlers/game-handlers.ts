import type * as Party from "../runtime";
import {
  shouldShowBids,
  type CardPhysicsState,
  type ClientPhysicsState,
  type Suit,
} from "../../shared/domain";
import type { ServerContext } from "../utils/types";
import {
  getPlayerId,
  generatePhysicsSeed,
  normalizeCustomCardAudioChoice,
  normalizeCardSoundChoice,
} from "../utils/helpers";
import { broadcastPlayCardOutput, broadcastResolveEffectOutput } from "./game-result-broadcast";
import { rematchRequestedFact } from "../telemetry";

// Handlers change the game and announce it; when the transaction ends the room arms the next
// bot turn and its alarm from the resulting state (party/room/room-clockwork.ts).

export function handleStartGame(ctx: ServerContext, sender: Party.Connection): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.startGame.execute({
    game: ctx.game,
    playerId,
  });

  ctx.broadcast(result.gameStartedEvent);
  ctx.broadcast(result.trumpRevealedEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handleSelectTrump(
  ctx: ServerContext,
  suit: Suit | null,
  sender: Party.Connection
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.selectTrump.execute({
    game: ctx.game,
    playerId,
    suit,
  });

  ctx.broadcast(result.trumpSelectedEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handlePlaceBid(
  ctx: ServerContext,
  bid: number,
  sender: Party.Connection
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.placeBid.execute({
    game: ctx.game,
    playerId,
    bid,
  });

  if (shouldShowBids(ctx.game.rulesetConfig.bidding, result.allBidsPlaced)) {
    ctx.broadcast(result.bidPlacedEvent);
  }
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

interface PlayCardHandlerOptions {
  clientPhysicsState?: ClientPhysicsState;
  customAudio?: unknown;
  /** Suit (Cloud/Juggler) or form (Shapeshifter) announced with the card. */
  declaration?: unknown;
}

export function handlePlayCard(
  ctx: ServerContext,
  cardId: string,
  soundChoice: string | undefined,
  sender: Party.Connection,
  options: PlayCardHandlerOptions = {}
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);
  const card = ctx.game.getPlayer(playerId)?.hand.find((candidate) => candidate.id === cardId);
  const { clientPhysicsState, customAudio, declaration } = options;

  const physicsState: CardPhysicsState | undefined = clientPhysicsState && {
    throwVelocity: clientPhysicsState.throwVelocity,
    landingPosition: clientPhysicsState.landingPosition,
    startPosition: clientPhysicsState.startPosition,
    physicsSeed: generatePhysicsSeed(cardId),
  };

  const result = ctx.useCases.playCard.execute({
    game: ctx.game,
    playerId,
    cardId,
    declaration,
    soundChoice: normalizeCardSoundChoice(soundChoice),
    customAudio: normalizeCustomCardAudioChoice(customAudio, card?.type),
    physicsState,
  });

  broadcastPlayCardOutput(ctx, result);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

/** The answer to a pending special-card effect (Juggler, Cloud, Witch). */
export function handleResolveEffect(
  ctx: ServerContext,
  response: unknown,
  sender: Party.Connection
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.resolveEffect.execute({
    game: ctx.game,
    playerId,
    response,
  });

  broadcastResolveEffectOutput(ctx, result);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handleNextRound(ctx: ServerContext, sender: Party.Connection): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.nextRound.execute({
    game: ctx.game,
    playerId,
  });

  ctx.broadcast(result.trumpRevealedEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handleRequestRematch(ctx: ServerContext, sender: Party.Connection): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);
  ctx.telemetry.record(rematchRequestedFact(playerId, ctx.game), ctx.game);

  const result = ctx.useCases.requestRematch.execute({
    game: ctx.game,
    playerId,
  });

  ctx.setGame(result.newGame);

  ctx.broadcast(result.rematchStartedEvent);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}
