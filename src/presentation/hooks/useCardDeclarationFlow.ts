'use client';

import { useCallback, useState } from 'react';
import { GamePhase, type ICard, type ICardDeclaration, type IGameState } from '@shared/domain';
import {
  getDeclarationCardLabel,
  getPlayDeclarationKind,
  type PendingDeclaration,
} from '@/presentation/components/special-cards';
import type { DropInfo } from './useDragToPlay';

interface PendingPlay extends PendingDeclaration {
  dropInfo?: DropInfo;
}

export type SendCardPlay = (card: ICard, dropInfo: DropInfo | undefined, declaration?: ICardDeclaration) => void;

/**
 * Card plays that need an announcement first (Cloud/Juggler suit, Shapeshifter
 * form, or a Vampire copying one): the play is held until the player declares,
 * or dropped when they cancel. Every other card is sent straight away.
 */
export function useCardDeclarationFlow(gameState: IGameState | null, sendPlay: SendCardPlay) {
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

  const requestPlay = useCallback((card: ICard, dropInfo?: DropInfo) => {
    const kind = getPlayDeclarationKind(gameState, card);
    if (kind === null) {
      sendPlay(card, dropInfo);
      return;
    }
    setPendingPlay({ card, kind, label: getDeclarationCardLabel(gameState, card), dropInfo });
  }, [gameState, sendPlay]);

  const confirmDeclaration = useCallback((declaration: ICardDeclaration) => {
    if (!pendingPlay) return;
    sendPlay(pendingPlay.card, pendingPlay.dropInfo, declaration);
    setPendingPlay(null);
  }, [pendingPlay, sendPlay]);

  const cancelDeclaration = useCallback(() => setPendingPlay(null), []);

  // A held play is void once play has moved on (round over, game paused)
  const isStillPlayable = !!pendingPlay && gameState?.phase === GamePhase.PLAYING;
  return {
    pendingDeclaration: isStillPlayable ? pendingPlay : null,
    requestPlay,
    confirmDeclaration,
    cancelDeclaration,
  };
}
