import {
  GameEventType,
  PlayerKickedError,
  SessionRejectedError,
  toOrthogonalPause,
  type CardPhysicsState,
  type CustomSound,
  type CustomTrickWinAudio,
  type ICard,
  type IGameState,
  type SharedCustomSound,
  type Suit,
  type TrickEffectOutcome,
} from '@shared/domain';
import type { GameTraceEvent } from '@/lib/game-trace';
import type { ExternalStore } from '@/presentation/state/external-store';

import type { ErrorNotice } from './error-notice';
import { withSharedSounds, withSnapshot, withTimeoutSound, withoutRoom, type GameClientState } from './game-client-state';
import type { WireEvent } from './session-trace';
import type { LobbyFeedHandlers, NoticeFeedHandlers, SocialFeedHandlers, TournamentSeatHandlers } from './table-feeds';
import type { TrickPresentation } from './trick-presentation';

export interface EventMeta {
  receivedAt: number;
  lagMs?: number;
}

/** Everything a server message may update on the client. */
export interface GameEventContext {
  store: ExternalStore<GameClientState>;
  trick: TrickPresentation;
  session: { readonly roomId: string | null; kicked(): void; refused(): void };
  errors: ErrorNotice;
  social: SocialFeedHandlers;
  lobby: LobbyFeedHandlers;
  notices: NoticeFeedHandlers;
  tournament: TournamentSeatHandlers;
  trace(event: GameTraceEvent): void;
}

type EventHandler = (event: WireEvent, ctx: GameEventContext, meta: EventMeta) => void;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const stampOf = (event: WireEvent): number => (typeof event.timestamp === 'number' ? event.timestamp : Date.now());

/** Errors the lobby shows as a screen of their own: they stay until dismissed. */
const STICKY_ERRORS: ReadonlySet<string> = new Set([PlayerKickedError.MESSAGE]);

function localPlayerId(ctx: GameEventContext): string | null {
  return ctx.store.getState().playerId;
}

function serverState(ctx: GameEventContext): IGameState | null {
  return ctx.store.getState().serverState;
}

function applyGameState(event: WireEvent, ctx: GameEventContext, meta: EventMeta): void {
  // Servers of the previous release send a paused game as phase PAUSED: keep the real phase.
  const snapshot = toOrthogonalPause(event.state as IGameState);
  const playerId = text(event.yourPlayerId);
  const previous = serverState(ctx);
  const next = withSnapshot(ctx.store.getState(), snapshot, playerId);
  const presented = ctx.trick.applySnapshot(previous, next.serverState ?? snapshot, stampOf(event), playerId);
  traceReplays(ctx, event, meta, next.serverState ?? snapshot, presented);
  ctx.lobby.handleLobbyStateChange(previous, next.serverState ?? snapshot);
  // Only servers older than protocol 2 put the shared sounds in snapshots (see SHARED_SOUNDS).
  const sounds = event.sharedCustomSounds;
  ctx.store.update(() => (Array.isArray(sounds) ? withSharedSounds(next, sounds as SharedCustomSound[]) : next));
  ctx.tournament.onGameState(event, meta.receivedAt);
}

function traceReplays(
  ctx: GameEventContext,
  event: WireEvent,
  meta: EventMeta,
  state: IGameState,
  presented: { recoveredMissedTrick: boolean; replayedCardCount: number }
): void {
  const common = { roomId: state.id, playerId: text(event.yourPlayerId), eventType: event.type, serverTimestamp: event.timestamp, lagMs: meta.lagMs };
  if (presented.recoveredMissedTrick) {
    ctx.trace({
      ...common,
      type: 'animation.replay.missed_trick_complete',
      severity: 'warn',
      replayedCardCount: state.completedTricks.at(-1)?.cards.length,
      reason: 'completed_trick_advanced_without_trick_complete_event',
    });
  }
  if (presented.replayedCardCount > 0) {
    ctx.trace({
      ...common,
      type: 'animation.replay.current_trick',
      severity: 'info',
      replayedCardCount: presented.replayedCardCount,
      reason: 'snapshot_without_card_play_event',
    });
  }
}

/**
 * No seat for us in this room: stop the reconnect loop, which would only be refused again. Nothing
 * of the refused room stays valid (a stale table or lobby would otherwise stay up, or reappear on
 * the next visit); the pages route on the missing state and explain the refusal.
 */
function refuseRoom(ctx: GameEventContext): void {
  ctx.session.refused();
  ctx.trick.reset({ forgetPresentedTricks: true });
  ctx.store.update(withoutRoom);
}

function handleError(event: WireEvent, ctx: GameEventContext): void {
  const message = text(event.message);
  if (ctx.tournament.onError(event.code, message, ctx.session.roomId ?? '')) {
    refuseRoom(ctx);
    ctx.tournament.clearMatch();
    return;
  }
  if (message === SessionRejectedError.MESSAGE) {
    // The seat belongs to another session; retrying with the same credential cannot succeed.
    refuseRoom(ctx);
    ctx.errors.show(message, { sticky: true });
    return;
  }
  ctx.errors.show(message, { sticky: STICKY_ERRORS.has(message) });
}

function handleCardPlayed(event: WireEvent, ctx: GameEventContext): void {
  const card = event.card as Partial<ICard> | undefined;
  const playerId = localPlayerId(ctx);
  ctx.trick.cardPlayed({
    cardId: card?.id,
    soundChoice: typeof event.soundChoice === 'string' ? event.soundChoice : undefined,
    physicsState: event.physicsState as CardPhysicsState | undefined,
    customAudio: event.customAudio as CustomSound | undefined,
    isLocalPlayer: !!playerId && event.playerId === playerId,
  });
}

function handleTrickComplete(event: WireEvent, ctx: GameEventContext): void {
  const state = serverState(ctx);
  const winnerId = text(event.winnerId);
  const voided = event.voided === true;
  const timestamp = stampOf(event);
  ctx.notices.handleSpecialCardEvent({ type: GameEventType.TRICK_COMPLETE, winnerId, voided, timestamp }, state?.players ?? [], localPlayerId(ctx));
  const winner = state?.players.find((player) => player.id === winnerId);
  if (!winner) return;
  ctx.trick.trickCompleted({
    winnerId,
    winnerName: winner.name,
    voided,
    soundChoice: typeof event.soundChoice === 'string' ? event.soundChoice : undefined,
    customTrickWinAudio: event.customTrickWinAudio as CustomTrickWinAudio | undefined,
    trickCards: event.trickCards as { playerId: string; card: ICard }[] | undefined,
    trickIndex: typeof event.trickIndex === 'number' ? event.trickIndex : undefined,
    currentState: state,
    timestamp,
  });
}

function handleTimeoutSound(event: WireEvent, ctx: GameEventContext): void {
  const soundName = typeof event.soundName === 'string' ? event.soundName : undefined;
  const customAudio = event.customAudio as CustomSound | undefined;
  const timestamp = stampOf(event);
  const soundKey = soundName ?? customAudio?.id ?? 'unknown';
  ctx.store.update((state) => withTimeoutSound(state, {
    id: `timeout-sound-${timestamp}-${text(event.senderPlayerId)}-${soundKey}`,
    targetPlayerId: text(event.targetPlayerId),
    targetPlayerName: text(event.targetPlayerName),
    senderPlayerId: text(event.senderPlayerId),
    senderPlayerName: text(event.senderPlayerName),
    soundName,
    customAudio,
    timestamp,
  }));
}

function handleLobbyEvent(event: WireEvent, ctx: GameEventContext): void {
  ctx.lobby.handleLobbyEvent(event, serverState(ctx), localPlayerId(ctx));
}

function handleRematchStarted(_event: WireEvent, ctx: GameEventContext): void {
  ctx.social.handleRematchStarted();
  ctx.lobby.resetLobbyActivity();
  ctx.notices.clearSpecialCardNotices();
  ctx.trick.reset({ forgetPresentedTricks: true });
  ctx.store.update((state) => ({ ...state, timeoutSoundEvents: [] }));
}

/** One handler per server message the client reacts to (open for new events, closed for change). */
const HANDLERS: Partial<Record<GameEventType, EventHandler>> = {
  [GameEventType.GAME_STATE]: applyGameState,
  [GameEventType.SHARED_SOUNDS]: (event, ctx) => {
    ctx.store.update((state) => withSharedSounds(state, Array.isArray(event.sounds) ? event.sounds as SharedCustomSound[] : []));
  },
  [GameEventType.ERROR]: handleError,
  [GameEventType.PLAYER_JOINED]: handleLobbyEvent,
  [GameEventType.PLAYER_LEFT]: handleLobbyEvent,
  [GameEventType.HOST_CHANGED]: handleLobbyEvent,
  [GameEventType.PLAYER_KICKED]: (event, ctx) => {
    const playerId = localPlayerId(ctx);
    if (playerId && event.playerId === playerId) ctx.session.kicked();
    else handleLobbyEvent(event, ctx);
  },
  [GameEventType.EMOTE]: (event, ctx) => {
    ctx.social.handleEmote(text(event.playerId), text(event.playerName), text(event.emoteId), stampOf(event));
  },
  [GameEventType.CHAT_MESSAGE]: (event, ctx) => {
    ctx.social.handleChatMessage(text(event.playerId), text(event.playerName), text(event.message), stampOf(event));
  },
  [GameEventType.BID_PLACED]: (event, ctx) => {
    ctx.social.handleBidPlaced(text(event.playerId), event.bid as number, stampOf(event));
  },
  [GameEventType.TRICK_EFFECT_RESOLVED]: (event, ctx) => {
    const outcome = event.outcome as TrickEffectOutcome;
    ctx.notices.handleSpecialCardEvent({ type: GameEventType.TRICK_EFFECT_RESOLVED, outcome, timestamp: stampOf(event) }, serverState(ctx)?.players ?? [], localPlayerId(ctx));
  },
  [GameEventType.TRUMP_SELECTED]: (event, ctx) => {
    const trumpEvent = {
      type: GameEventType.TRUMP_SELECTED as const,
      trumpSuit: (event.trumpSuit as Suit | null | undefined) ?? null,
      playerId: typeof event.playerId === 'string' ? event.playerId : undefined,
      timestamp: stampOf(event),
    };
    ctx.notices.handleSpecialCardEvent(trumpEvent, serverState(ctx)?.players ?? [], localPlayerId(ctx));
  },
  [GameEventType.TIMEOUT_SOUND_PLAYED]: handleTimeoutSound,
  [GameEventType.CARD_PLAYED]: handleCardPlayed,
  [GameEventType.TRICK_COMPLETE]: handleTrickComplete,
  [GameEventType.REMATCH_STARTED]: handleRematchStarted,
};

/** Hands one server message to the client state it concerns. */
export function routeGameEvent(event: WireEvent, ctx: GameEventContext, meta: EventMeta): void {
  HANDLERS[event.type as GameEventType]?.(event, ctx, meta);
}
