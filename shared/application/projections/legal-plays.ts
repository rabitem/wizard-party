/**
 * Legal plays projection
 *
 * Which hand cards a player may play, computed from a serialized game state with
 * the same domain rule the server enforces (expansions/card-rules.ts legalPlays).
 * Clients use this instead of keeping their own copy of the follow-suit rule.
 */

import {
  GamePhase,
  getTrickLead,
  isGamePaused,
  legalPlays,
  type ICard,
  type IGameState,
} from '../../domain';

/**
 * Cards `playerId` may play now; empty when it is not their turn to play
 * (another player's turn, another phase, a special-card effect pending, or a
 * table paused while someone reconnects).
 *
 * The lead is derived from the trick's cards, never from the serialized
 * `leadSuit`, so a stale or missing value cannot change the answer.
 */
export function getLegalPlays(gameState: IGameState | null, playerId: string | null): ICard[] {
  if (!gameState || !playerId || gameState.phase !== GamePhase.PLAYING) return [];
  if (gameState.pendingEffects?.length || isGamePaused(gameState)) return [];

  const player = gameState.players.find((p) => p.id === playerId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!player || currentPlayer?.id !== playerId) return [];

  const context = { copySource: gameState.expansionState?.copySource ?? null };
  const lead = getTrickLead(gameState.currentTrick?.cards ?? [], context);
  return legalPlays(player.hand ?? [], lead);
}
