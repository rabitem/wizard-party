import {
  CardType,
  TrickEffectKind,
  DEFAULT_ROOM_SETTINGS,
  ensureRoomSettings,
  type Game,
  type IGameState,
  type IRoomSettings,
  type PendingTrickEffect,
} from '../../domain';

/** Card id shown in place of another player's private choice. */
const HIDDEN_CARD_ID = 'hidden';

/**
 * Hide the cards other players chose to pass (Juggler) - only that they chose.
 */
function hideOtherPlayersChoices(effects: PendingTrickEffect[], playerId: string): PendingTrickEffect[] {
  return effects.map((effect) => {
    if (effect.kind !== TrickEffectKind.PASS_LEFT) return effect;
    const selections = Object.fromEntries(
      Object.entries(effect.selections).map(([id, cardId]) => [id, id === playerId ? cardId : HIDDEN_CARD_ID])
    );
    return { ...effect, selections };
  });
}

/**
 * Create a personalized game state for a specific player.
 *
 * Every field that carries private information is filtered through a rule:
 * - other players' hands: card backs only
 * - bids and the forbidden bid: the game's bid visibility policy (hidden-bids rule)
 * - other players' Juggler selections: hidden
 * - kicked ids: never sent
 */
export function createPersonalizedState(
  game: Game,
  playerId: string,
  roomSettings: IRoomSettings,
  serverNow: number = Date.now()
): IGameState {
  const baseState = game.toJSON();
  // Kicked ids are server-side bookkeeping (they are reconnect identities), never sent to clients.
  delete baseState.kickedPlayerIds;
  const publicRoomSettings = ensureRoomSettings(roomSettings, {
    ...DEFAULT_ROOM_SETTINGS,
    name: game.id,
    rulesetConfig: game.rulesetConfig,
  });
  const visibility = game.getBidVisibility(playerId);

  baseState.players = baseState.players.map((p) => {
    const playerState = visibility.canSeeBid(p.id) ? p : { ...p, bid: null };
    if (p.id === playerId) return playerState;
    return {
      ...playerState,
      hand: p.hand.map(() => ({ id: HIDDEN_CARD_ID, type: CardType.NUMBER, suit: null, value: null })),
    };
  });
  // The forbidden bid reveals the sum of the other bids: only for the player it restricts.
  if (!visibility.canSeeForbiddenBid()) {
    baseState.forbiddenBid = null;
  }

  if (baseState.pendingEffects?.length) {
    baseState.pendingEffects = hideOtherPlayersChoices(baseState.pendingEffects, playerId);
  }

  // Room settings: only the fields the lobby shows (the ruleset travels on the game itself)
  baseState.roomSettings = {
    name: publicRoomSettings.name,
    isPublic: publicRoomSettings.isPublic,
    maxPlayers: publicRoomSettings.maxPlayers,
  };

  if (baseState.turnTimerState) {
    baseState.turnTimerState = {
      ...baseState.turnTimerState,
      serverNow,
    };
  }

  return baseState;
}
