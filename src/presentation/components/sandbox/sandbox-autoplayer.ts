import { Suit } from '@shared/domain';
import { canPlayLocally } from './sandbox-conditions';
import type { SandboxGameHandles } from './sandbox.types';

/** Trump the local seat names when it must choose (a Wizard turned up while it deals). */
export const SANDBOX_DEFAULT_TRUMP_SUIT = Suit.GIANTS;

/**
 * Plays the local seat like an attentive player: a card whenever input allows it, trump when a
 * Wizard turns up on its deal, a legal bid on its bidding turn, and the next round once the
 * round has settled. Each action is sent once and not repeated until the game state moves on,
 * as a player would not click twice.
 */
export class SandboxAutoplayer {
  private actedOn: string | null = null;

  constructor(private readonly isIdle: () => boolean) {}

  reset(): void {
    this.actedOn = null;
  }

  act(handles: SandboxGameHandles): void {
    const stateKey = `${handles.phase}:${handles.isLocalTurn}:${handles.localHand.length}`;
    if (this.actedOn === stateKey) return;
    this.actedOn = null;

    if (handles.phase === 'ROUND_END' && this.isIdle()) {
      this.actedOn = stateKey;
      handles.nextRound();
    } else if (handles.phase === 'TRUMP_SELECTION' && handles.isLocalTurn) {
      this.actedOn = stateKey;
      handles.selectTrump(SANDBOX_DEFAULT_TRUMP_SUIT);
    } else if (handles.phase === 'BIDDING' && handles.isLocalTurn) {
      this.actedOn = stateKey;
      handles.placeBid(handles.forbiddenBid === 0 ? 1 : 0);
    } else if (canPlayLocally(handles)) {
      const cardId = handles.localHand.find((card) => handles.playableCardIds.includes(card.id))?.id;
      if (!cardId) return;
      this.actedOn = stateKey;
      handles.playCard(cardId);
    }
  }
}
