'use client';

import { GamePhase, type IGameState } from '@shared/domain';
import { TrumpSelectionUI } from '@/presentation/components/TrumpSelectionUI';
import {
  DeclarationPicker,
  SpecialCardNoticeFeed,
  SpecialEffectPrompt,
  SpecialCardRoundInfo,
  getEffectPromptModel,
  getSpecialCardRoundInfo,
  getTrumpChoiceModel,
  hasPendingEffects,
} from '@/presentation/components/special-cards';
import type { useGameClientState } from './useGameClientState';

type GameClientState = ReturnType<typeof useGameClientState>;

type SpecialCardLayerState = Pick<
  GameClientState,
  | 'selectTrump'
  | 'resolveEffect'
  | 'specialCardNotices'
  | 'pendingDeclaration'
  | 'confirmDeclaration'
  | 'cancelDeclaration'
  | 'isTrickAnimating'
  | 'trickResult'
  | 'pendingTrickResult'
>;

interface SpecialCardLayerProps {
  gameState: IGameState;
  playerId: string;
  isMobile: boolean;
  state: SpecialCardLayerState;
}

/** Trump decision UI: the dealer, or the Werewolf holder (who may declare no trump) */
function TrumpChoiceSection({ gameState, playerId, isMobile, state }: SpecialCardLayerProps) {
  if (gameState.phase !== GamePhase.TRUMP_SELECTION) return null;
  return <TrumpSelectionUI choice={getTrumpChoiceModel(gameState, playerId)} onSelectTrump={state.selectTrump} isMobile={isMobile} />;
}

/** Announce a suit/form when playing a card, then answer effects after its trick */
function SpecialCardChoiceSection({ gameState, playerId, isMobile, state }: SpecialCardLayerProps) {
  if (gameState.phase !== GamePhase.PLAYING) return null;
  if (state.pendingDeclaration) {
    return (
      <DeclarationPicker
        pending={state.pendingDeclaration}
        trumpSuit={gameState.trumpSuit}
        isMobile={isMobile}
        onDeclare={state.confirmDeclaration}
        onCancel={state.cancelDeclaration}
      />
    );
  }
  // Effect prompts wait until the trick has landed and been collected.
  const isTrickAnimationPending = state.isTrickAnimating || state.trickResult !== null || state.pendingTrickResult !== null;
  if (isTrickAnimationPending || !hasPendingEffects(gameState)) return null;
  return <SpecialEffectPrompt model={getEffectPromptModel(gameState, playerId)} isMobile={isMobile} onRespond={state.resolveEffect} />;
}

const ROUND_PHASES: ReadonlySet<GamePhase> = new Set([GamePhase.TRUMP_SELECTION, GamePhase.BIDDING, GamePhase.PLAYING]);

function isRoundInProgress(gameState: IGameState): boolean {
  return ROUND_PHASES.has(gameState.phase);
}

/**
 * Everything the trump choice and the expansion special cards add on top of the table.
 */
export function SpecialCardLayer(props: SpecialCardLayerProps) {
  return (
    <>
      <TrumpChoiceSection {...props} />
      <SpecialCardChoiceSection {...props} />
      <SpecialCardNoticeFeed notices={props.state.specialCardNotices} />
      {isRoundInProgress(props.gameState) ? (
        <SpecialCardRoundInfo lines={getSpecialCardRoundInfo(props.gameState)} isMobile={props.isMobile} />
      ) : null}
    </>
  );
}
