import {
  Card,
  CardType,
  DEFAULT_RULESET_CONFIG,
  Game,
  GamePhase,
  Player,
  Suit,
  isSpecialCardType,
} from '@shared/domain';
import { BotTurnUseCase, PlaceBidUseCase, SelectTrumpUseCase } from '@shared/application';
import type { SandboxTableConfig } from '@/presentation/components/sandbox/sandbox.types';
import { withSeededRandom } from './seeded-random';

export const SANDBOX_LOCAL_PLAYER_ID = 'sandbox-you';
/** The local seat's name; every loopback join plays under it. */
export const SANDBOX_LOCAL_PLAYER_NAME = 'You';
export const SANDBOX_BOT_DIFFICULTY = 2 as const;

const BOT_NAMES = ['Merlin', 'Morgana', 'Gandalf', 'Circe', 'Elminster'] as const;

export function botPlayerId(seat: number): string {
  return `sandbox-bot-${seat}`;
}

export function cardFromId(cardId: string): Card {
  const special = /^([A-Z]+)-(\d+)$/.exec(cardId);
  if (special && special[1] === CardType.WIZARD) return Card.createWizard(Number(special[2]));
  if (special && special[1] === CardType.JESTER) return Card.createJester(Number(special[2]));
  if (special && isSpecialCardType(special[1])) return Card.createSpecial(special[1], Number(special[2]));

  const numbered = /^([A-Z]+)-(\d+)$/.exec(cardId);
  if (!numbered || !Object.values(Suit).includes(numbered[1] as Suit)) {
    throw new Error(`Unknown card id "${cardId}"`);
  }
  return Card.createNumberCard(numbered[1] as Suit, Number(numbered[2]));
}

/** Moves the requested cards into a seat, swapping displaced cards to wherever the requested ones came from. */
function applyForcedHands(game: Game, hands: Partial<Record<number, string[]>>): void {
  for (const [seatKey, cardIds] of Object.entries(hands)) {
    const seat = Number(seatKey);
    const player = game.players[seat];
    if (!player || !cardIds) continue;

    const requested = new Set(cardIds);
    const displaced = player.hand.filter((card) => !requested.has(card.id));
    const kept = player.hand.filter((card) => requested.has(card.id));

    const takeCard = (cardId: string): Card => {
      const kept_ = kept.find((card) => card.id === cardId);
      if (kept_) return kept_;
      const swap = displaced.shift() ?? null;

      for (const other of game.players) {
        if (other === player) continue;
        const index = other.hand.findIndex((card) => card.id === cardId);
        if (index < 0) continue;
        const [card] = other.hand.splice(index, 1, ...(swap ? [swap] : []));
        return card;
      }
      if (game.trumpCard?.id === cardId) {
        const card = game.trumpCard;
        game.trumpCard = swap ?? null;
        return card;
      }
      return cardFromId(cardId);
    };

    player.hand = cardIds.map(takeCard);
  }
}

function placeAllBids(game: Game, random: () => number): void {
  const placeBid = new PlaceBidUseCase();
  const botTurn = new BotTurnUseCase();

  while (game.phase === GamePhase.BIDDING) {
    const player = game.getCurrentPlayer();
    let bid: number;
    if (player.isBot) {
      const action = withSeededRandom(random, () => botTurn.execute({ game, difficulty: SANDBOX_BOT_DIFFICULTY }));
      bid = action.type === 'PLACE_BID' ? action.bid : 0;
    } else {
      bid = game.getForbiddenBid() === 0 ? 1 : 0;
    }
    placeBid.execute({ game, playerId: player.id, bid });
  }
}

/** Builds a real domain Game positioned at the requested round and phase. */
export function createSandboxGame(config: SandboxTableConfig, random: () => number): Game {
  const playerCount = Math.min(6, Math.max(3, Math.round(config.playerCount)));
  const game = new Game(config.roomId, SANDBOX_LOCAL_PLAYER_ID);

  game.addPlayer(new Player(SANDBOX_LOCAL_PLAYER_ID, SANDBOX_LOCAL_PLAYER_NAME));
  for (let seat = 1; seat < playerCount; seat++) {
    game.addPlayer(new Player(botPlayerId(seat), BOT_NAMES[seat - 1], true, SANDBOX_BOT_DIFFICULTY));
  }

  if (config.customRoundCount) {
    game.setRulesetConfig({
      ...DEFAULT_RULESET_CONFIG,
      structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: config.customRoundCount },
    });
  }

  withSeededRandom(random, () => {
    game.start();
    // start() always deals round 1 with seat 0 dealing; re-deal through the regular next-round path.
    const round = Math.min(Math.max(1, Math.round(config.round)), game.maxRounds);
    const dealer = (config.leadSeat - 1 + playerCount) % playerCount;
    game.phase = GamePhase.ROUND_END;
    game.currentRound = round - 1;
    game.dealerIndex = (dealer - 1 + playerCount) % playerCount;
    game.startNextRound();
  });

  if (config.hands) applyForcedHands(game, config.hands);
  if (config.trumpSuit !== undefined) {
    game.trumpSuit = config.trumpSuit;
    if (game.phase === GamePhase.TRUMP_SELECTION) game.phase = GamePhase.BIDDING;
  }

  if (config.startPhase === 'TRUMP_SELECTION') return game;

  if (game.phase === GamePhase.TRUMP_SELECTION) {
    const dealer = game.getDealer();
    const suit = game.trumpSuit ?? Suit.GIANTS;
    new SelectTrumpUseCase().execute({ game, playerId: dealer.id, suit });
  }
  if (config.startPhase === 'BIDDING') return game;

  placeAllBids(game, random);
  return game;
}
