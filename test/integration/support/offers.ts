/**
 * What a player's screen offers, read from their screen model: the scenario driver picks its moves
 * only from these, so it acts on what the player sees. A move the screen does not offer throws
 * here (the scenario asked for something the player could not do); a move the screen offers that
 * the room then refuses fails the refusal invariant (I5) unless the scenario expected it.
 */
import {
  DeclarationKind,
  GamePhase,
  TrickEffectKind,
  getDeclarationOptions,
  type CardForm,
  type ICardDeclaration,
  type Suit,
  type TrickEffectResponse,
} from '@shared/domain';
import { shouldSendCardPlay } from '@/app/game/[id]/useGameClientState';
import { canSubmitBid, resolveSelectableBid } from '@/presentation/components/bidding/bid-rules';
import type { LobbySeatView } from '@/presentation/components/lobby/table/lobby-view.types';
import { getPlayDeclarationKind } from '@/presentation/components/special-cards/special-card-view-model';
import type { LobbyScreen, ScreenModel, TableScreen } from './screen-model';

export type CardChoice = string | 'first-legal' | 'last-legal';
export type BidChoice = number | 'lowest-allowed';
export type EffectChoice = TrickEffectResponse | 'first-offered';

export class NotOfferedError extends Error {
  constructor(player: string, what: string) {
    super(`${player}'s screen does not offer ${what}`);
    this.name = 'NotOfferedError';
  }
}

function seatOf(screen: ScreenModel): string {
  if (!screen.seatId) throw new Error('no seat');
  return screen.seatId;
}

export function lobbyOf(player: string, screen: ScreenModel, what: string, hostOnly = false): LobbyScreen {
  const { lobby } = screen;
  if (!lobby || (hostOnly && !lobby.isHost)) throw new NotOfferedError(player, what);
  return lobby;
}

export function tableOf(player: string, screen: ScreenModel, what: string): TableScreen {
  const { table } = screen;
  if (!table || table.game.pauseState) throw new NotOfferedError(player, what);
  return table;
}

/** Another seat in the host's lobby, by its shown name. */
export function lobbySeatNamed(player: string, screen: ScreenModel, name: string, what: string): LobbySeatView {
  const seat = lobbyOf(player, screen, what, true).seats.find((candidate) => candidate.name === name && !candidate.isLocal);
  if (!seat) throw new NotOfferedError(player, `${what} (no seat named ${name})`);
  return seat;
}

/** The bid range the bidding panel offers (GameHud: the hand size and the forbidden bid it was sent). */
function bidRange(player: string, screen: ScreenModel) {
  const table = tableOf(player, screen, 'bidding');
  const { game } = table;
  const me = seatOf(screen);
  const isMyBid = game.phase === GamePhase.BIDDING && game.players[game.currentPlayerIndex]?.id === me;
  const hand = game.players.find((p) => p.id === me)?.hand ?? [];
  if (!isMyBid || table.interactionsDisabled) throw new NotOfferedError(player, 'bidding');
  return { maxBid: hand.length, forbiddenBid: game.forbiddenBid };
}

export function canBid(player: string, screen: ScreenModel): boolean {
  try {
    bidRange(player, screen);
    return true;
  } catch {
    return false;
  }
}

export function chooseBid(player: string, screen: ScreenModel, choice: BidChoice): number {
  const range = bidRange(player, screen);
  const bid = choice === 'lowest-allowed' ? resolveSelectableBid(0, range) : choice;
  if (!canSubmitBid({ selectedBid: bid, ...range })) throw new NotOfferedError(player, `the bid ${bid}`);
  return bid;
}

/** A card the hand lets the player play now, with the declaration the picker would ask for (its first option). */
export function chooseCard(
  player: string,
  screen: ScreenModel,
  choice: CardChoice,
  declaration?: ICardDeclaration
): { cardId: string; declaration?: ICardDeclaration } {
  const table = tableOf(player, screen, 'a card play');
  const playable = table.playableCardIds;
  let cardId: string | undefined = choice;
  if (choice === 'first-legal') cardId = playable[0];
  if (choice === 'last-legal') cardId = playable.at(-1);
  const offered = !!cardId && !table.interactionsDisabled
    && shouldSendCardPlay({ cardId, playableCardIds: playable, isWaitingForTrickResult: table.isTrickAnimationPending });
  if (!cardId || !offered) throw new NotOfferedError(player, `the card ${cardId ?? choice}`);
  const card = table.game.players.find((p) => p.id === screen.seatId)?.hand.find((held) => held.id === cardId);
  const kind = getPlayDeclarationKind(table.game, card);
  if (kind === null) return { cardId };
  if (declaration) return { cardId, declaration };
  const [option] = getDeclarationOptions(kind);
  return { cardId, declaration: kind === DeclarationKind.SUIT ? { suit: option as Suit } : { form: option as CardForm } };
}

export function canChooseTrump(screen: ScreenModel): boolean {
  return !!screen.table?.trumpChoice?.canChoose && !screen.table.game.pauseState;
}

export function chooseTrump(player: string, screen: ScreenModel, suit: Suit | null): Suit | null {
  const choice = tableOf(player, screen, 'the trump choice').trumpChoice;
  if (!choice?.canChoose || (suit === null && !choice.allowNoTrump)) throw new NotOfferedError(player, `the trump ${suit ?? 'no trump'}`);
  return suit;
}

export function canResolveEffect(screen: ScreenModel): boolean {
  const mode = screen.table?.effectPrompt?.mode;
  return mode === TrickEffectKind.PASS_LEFT || mode === TrickEffectKind.ADJUST_BID || mode === TrickEffectKind.SWAP_WITH_TRICK;
}

/** The effect answer; 'first-offered' is the prompt's first option (first card, raise, first pile card). */
export function chooseEffect(player: string, screen: ScreenModel, choice: EffectChoice): TrickEffectResponse {
  const prompt = tableOf(player, screen, 'an effect choice').effectPrompt;
  if (!prompt || !canResolveEffect(screen)) throw new NotOfferedError(player, 'an effect choice');
  if (choice !== 'first-offered') {
    if (choice.kind !== prompt.mode) throw new NotOfferedError(player, `a ${choice.kind} choice`);
    return choice;
  }
  switch (prompt.mode) {
    case TrickEffectKind.PASS_LEFT:
      return { kind: TrickEffectKind.PASS_LEFT, cardId: prompt.hand[0].id };
    case TrickEffectKind.ADJUST_BID:
      return { kind: TrickEffectKind.ADJUST_BID, delta: 1 };
    case TrickEffectKind.SWAP_WITH_TRICK:
      return { kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId: prompt.hand[0].id, trickCardId: prompt.pile[0].id };
    default:
      throw new NotOfferedError(player, 'an effect choice');
  }
}

export function canMoveRoundOn(screen: ScreenModel): boolean {
  const table = screen.table;
  return !!table && table.showRoundEndUI && table.game.hostId === screen.seatId && !table.game.pauseState;
}
