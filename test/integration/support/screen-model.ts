/**
 * What one player's screen shows, derived from their headless client with the production pure
 * selectors: the page the router would be on, the lobby view model,
 * the table as displayed, the playable hand, the trump and effect prompts, the HUD standings and
 * the feeds. A UI decision without an exported selector is not modelled here; scenarios assert
 * the client's store fields for it instead.
 */
import { DEFAULT_RULESET_CONFIG, GamePhase, type IGameState } from '@shared/domain';
import { calcDerivedState } from '@/app/game/[id]/game-client-view';
import { checkIsTrickAnimationPending, resolvePlayableCardIds } from '@/app/game/[id]/useGameClientState';
import { resolveGameRedirectTarget } from '@/app/game/[id]/useGameRedirect';
import { resolveResultsRedirect } from '@/app/results/[id]/results-redirect';
import { buildSeatViews, startReadiness, summarizeRules, type SeatAccount } from '@/presentation/components/lobby/table/lobby-view';
import type { LobbySeatView, RuleChip, StartReadiness } from '@/presentation/components/lobby/table/lobby-view.types';
import {
  getEffectPromptModel,
  getTrumpChoiceModel,
  hasPendingEffects,
  type EffectPromptModel,
  type TrumpChoiceModel,
} from '@/presentation/components/special-cards/special-card-view-model';
import { selectDisplayState } from '@/presentation/hooks/connection/display-state';
import type { GameClientState } from '@/presentation/hooks/connection/game-client-state';
import type { TableFeedsState } from '@/presentation/hooks/connection/table-feeds';
import type { TrickPresentationView } from '@/presentation/hooks/connection/trick-presentation';
import { resolveDisplayStandings, type DisplayStandings } from '@/presentation/hooks/useDisplayStandings';
import { getRouteForPhase, isGameRoute } from '@/presentation/providers/game-provider.utils';
import { shouldFollowPhase } from '@/presentation/providers/useGameNavigation';

/** Everything of one client a screen is drawn from. */
export interface ClientSurface {
  state: GameClientState;
  presentation: TrickPresentationView;
  feeds: TableFeedsState;
  /** The page the client's router is on. */
  page: string;
  /** The standings the HUD held while no trick result was pending (useDisplayStandings). */
  heldStandings: DisplayStandings;
}

export interface LobbyScreen {
  seats: LobbySeatView[];
  isHost: boolean;
  readiness: StartReadiness;
  rules: RuleChip[];
}

export interface TableScreen {
  /** The game as the table shows it (presented trick, unconfirmed local play). */
  game: IGameState;
  /** Cards the hand lets the player play now. */
  playableCardIds: string[];
  interactionsDisabled: boolean;
  showRoundEndUI: boolean;
  /** A trick is landing, showing its winner or being collected. */
  isTrickAnimationPending: boolean;
  /** Scores, bids and tricks as the HUD shows them (held back until the trick banner). */
  standings: DisplayStandings;
  /** The trump decision, during trump selection. */
  trumpChoice: TrumpChoiceModel | null;
  /** The special-card effect prompt, once the trick that caused it was collected. */
  effectPrompt: EffectPromptModel | null;
}

export interface ScreenModel {
  page: string;
  status: GameClientState['status'];
  error: string | null;
  seatId: string | null;
  lobby: LobbyScreen | null;
  table: TableScreen | null;
  feeds: TableFeedsState;
  timeoutSounds: GameClientState['timeoutSoundEvents'];
}

const HARNESS_AVATAR = 'harness-avatar';
const NO_ACCOUNTS: ReadonlyMap<string, SeatAccount> = new Map();
const NO_GRACE: ReadonlyMap<string, number> = new Map();

/** The standings the HUD reads from a game (players and whose turn it is). */
export function liveStandings(game: IGameState | null): DisplayStandings {
  return { players: game?.players ?? [], currentPlayerIndex: game?.currentPlayerIndex ?? 0 };
}

function lobbyScreen(game: IGameState, seatId: string): LobbyScreen {
  const seats = buildSeatViews({
    players: game.players,
    hostId: game.hostId,
    localPlayerId: seatId,
    localAvatarId: HARNESS_AVATAR,
    fallbackAvatarIds: [HARNESS_AVATAR],
    accounts: NO_ACCOUNTS,
    graceEndsAt: NO_GRACE,
  });
  const isHost = game.hostId === seatId;
  const hostName = game.players.find((player) => player.id === game.hostId)?.name ?? '';
  return { seats, isHost, readiness: startReadiness(seats, hostName, isHost), rules: summarizeRules(game.rulesetConfig ?? DEFAULT_RULESET_CONFIG) };
}

function tableScreen(surface: ClientSurface, game: IGameState, seatId: string): TableScreen {
  const { state, presentation } = surface;
  const isTrickAnimationPending = checkIsTrickAnimationPending(presentation);
  const { showRoundEndUI, interactionsDisabled } = calcDerivedState({
    phase: game.phase,
    isConnected: state.status === 'connected',
    isTrickAnimating: presentation.isTrickAnimating,
    hasTrickResult: presentation.trickResult !== null,
    hasPendingTrickResult: presentation.pendingTrickResult !== null,
  });
  const effectShown = game.phase === GamePhase.PLAYING && !isTrickAnimationPending && hasPendingEffects(game);
  return {
    game,
    playableCardIds: resolvePlayableCardIds({
      // The provider offers no card while the local play is undecided (game-client-context.tsx).
      legalCardIds: state.pendingPlay ? [] : state.legalCardIds,
      isWaitingForTrickResult: isTrickAnimationPending,
      trickBacklog: presentation.backlog,
    }),
    interactionsDisabled,
    showRoundEndUI,
    isTrickAnimationPending,
    standings: resolveDisplayStandings(liveStandings(game), surface.heldStandings, presentation.pendingTrickResult !== null),
    trumpChoice: game.phase === GamePhase.TRUMP_SELECTION ? getTrumpChoiceModel(game, seatId) : null,
    effectPrompt: effectShown ? getEffectPromptModel(game, seatId) : null,
  };
}

/** The game as the client's table shows it (the provider's `gameState`). */
export function displayedGame({ state, presentation }: Pick<ClientSurface, 'state' | 'presentation'>): IGameState | null {
  return selectDisplayState({
    serverState: state.serverState,
    playerId: state.playerId,
    frozenTrick: presentation.frozenTrick,
    pendingPlay: state.pendingPlay,
  });
}

/** One client's screen now. */
export function view(client: { surface(): ClientSurface }): ScreenModel {
  const surface = client.surface();
  const { state } = surface;
  const game = displayedGame(surface);
  const seatId = state.playerId;
  const inLobby = game?.phase === GamePhase.LOBBY;
  return {
    page: surface.page,
    status: state.status,
    error: state.error,
    seatId,
    lobby: game && seatId && inLobby ? lobbyScreen(game, seatId) : null,
    table: game && seatId && !inLobby ? tableScreen(surface, game, seatId) : null,
    feeds: surface.feeds,
    timeoutSounds: state.timeoutSoundEvents,
  };
}

/** One navigation the router makes from `page`: the provider follows the phase, then the page's own redirect. */
function navigate(page: string, { state, presentation }: Pick<ClientSurface, 'state' | 'presentation'>): string {
  const { serverState, playerId, status, error } = state;
  if (serverState && playerId && shouldFollowPhase(status) && isGameRoute(page)) {
    const route = getRouteForPhase(serverState.phase, serverState.id);
    if (route !== page) return route;
  }
  const [, section, roomId = ''] = page.split('/');
  const seen = {
    sessionLoaded: true,
    status,
    hasError: error !== null,
    gameState: serverState,
    playerId,
    isCorrectRoom: serverState?.id === roomId,
  };
  if (section === 'game') {
    return resolveGameRedirectTarget({ ...seen, roomId, isTrickAnimationPending: checkIsTrickAnimationPending(presentation) }) ?? page;
  }
  if (section === 'results') return resolveResultsRedirect({ ...seen, isLeaving: false }) ?? page;
  return page;
}

/** Where the router ends up from `page` once every redirect has run. */
export function followPage(page: string, surface: Pick<ClientSurface, 'state' | 'presentation'>): string {
  let current = page;
  for (let hop = 0; hop < 4; hop++) {
    const next = navigate(current, surface);
    if (next === current) return current;
    current = next;
  }
  return current;
}
