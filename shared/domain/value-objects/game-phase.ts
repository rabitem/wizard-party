/**
 * Game Phase (value object) and its state machine
 *
 * LOBBY -> DEALING -> TRUMP_SELECTION/BIDDING -> PLAYING -> ROUND_END -> (DEALING | GAME_END)
 *
 * A pause is not a phase: while the table waits for a disconnected player the game keeps its
 * phase and carries a pause state beside it (see game-pause.ts). `PAUSED` survives only as the
 * phase legacy (protocol 1) clients are shown while a game is paused, and as the phase rooms
 * persisted before the change may still hold; the aggregate never enters it.
 *
 * The Game aggregate changes phase only through this table, so an impossible
 * transition is a typed error instead of a silently corrupted game.
 */

export enum GamePhase {
  LOBBY = 'LOBBY',
  DEALING = 'DEALING',
  TRUMP_SELECTION = 'TRUMP_SELECTION',
  BIDDING = 'BIDDING',
  PLAYING = 'PLAYING',
  ROUND_END = 'ROUND_END',
  GAME_END = 'GAME_END',
  /** Wire-only: how a paused game is shown to legacy clients. Never a phase of the aggregate. */
  PAUSED = 'PAUSED',
}

/**
 * Allowed transitions: from -> to.
 */
const PHASE_TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  [GamePhase.LOBBY]: [GamePhase.DEALING],
  [GamePhase.DEALING]: [GamePhase.TRUMP_SELECTION, GamePhase.BIDDING],
  [GamePhase.TRUMP_SELECTION]: [GamePhase.BIDDING],
  [GamePhase.BIDDING]: [GamePhase.PLAYING],
  [GamePhase.PLAYING]: [GamePhase.ROUND_END],
  [GamePhase.ROUND_END]: [GamePhase.DEALING, GamePhase.GAME_END],
  [GamePhase.GAME_END]: [GamePhase.LOBBY],
  [GamePhase.PAUSED]: [],
};

export function canTransitionPhase(from: string, to: string): boolean {
  const allowed = PHASE_TRANSITIONS[from as GamePhase] as readonly string[] | undefined;
  return allowed?.includes(to) ?? false;
}
