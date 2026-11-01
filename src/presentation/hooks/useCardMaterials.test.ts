import { describe, expect, it } from 'vitest';
import { CardType, Suit, type ICard } from '@shared/domain';
import { getCardMaterialsKey } from './useCardMaterials';

const ELVES_7: ICard = { id: 'ELVES-7', type: CardType.NUMBER, suit: Suit.ELVES, value: 7 };

describe('getCardMaterialsKey', () => {
  it('should be equal for a re-parsed card object with the same content', () => {
    const fromNextGameState: ICard = JSON.parse(JSON.stringify(ELVES_7));
    expect(fromNextGameState).not.toBe(ELVES_7);
    expect(getCardMaterialsKey(fromNextGameState, false, 'fantasy-medium'))
      .toBe(getCardMaterialsKey(ELVES_7, false, 'fantasy-medium'));
  });

  it('should change when the card theme or number size changes', () => {
    expect(getCardMaterialsKey(ELVES_7, false, 'classic-medium'))
      .not.toBe(getCardMaterialsKey(ELVES_7, false, 'fantasy-medium'));
    expect(getCardMaterialsKey(ELVES_7, false, 'fantasy-large'))
      .not.toBe(getCardMaterialsKey(ELVES_7, false, 'fantasy-medium'));
  });

  it('should change when the card is turned face down', () => {
    expect(getCardMaterialsKey(ELVES_7, true, 'fantasy-medium'))
      .not.toBe(getCardMaterialsKey(ELVES_7, false, 'fantasy-medium'));
  });

  it('should change when a hidden placeholder is revealed under the same id', () => {
    const hidden: ICard = { id: 'hidden', type: CardType.NUMBER, suit: null, value: null };
    const revealed: ICard = { id: 'hidden', type: CardType.NUMBER, suit: Suit.GIANTS, value: 3 };
    expect(getCardMaterialsKey(revealed, false, 'fantasy-medium'))
      .not.toBe(getCardMaterialsKey(hidden, false, 'fantasy-medium'));
  });

  it('should distinguish different cards', () => {
    const wizard: ICard = { id: 'wizard-1', type: CardType.WIZARD, suit: null, value: null };
    expect(getCardMaterialsKey(wizard, false, 'fantasy-medium'))
      .not.toBe(getCardMaterialsKey(ELVES_7, false, 'fantasy-medium'));
  });
});
