import { DEFAULT_RULESET_CONFIG, type IPlayer, type IRulesetConfig } from '@shared/domain';
import { CONSTANTS } from '@/presentation/config/constants';
import type { LobbySeatView, RuleChip, StartReadiness } from './lobby-view.types';

const BOT_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert', 5: 'Master' };

export interface SeatAccount {
  avatar: string | null;
  level: number;
}

interface BuildSeatsInput {
  players: IPlayer[];
  hostId: string;
  localPlayerId: string;
  localAvatarId: string;
  /** The local player plays without an account. Only known for the local seat (see LobbySeatView.isGuest). */
  localIsGuest: boolean;
  fallbackAvatarIds: readonly string[];
  accounts: ReadonlyMap<string, SeatAccount>;
  /** playerId -> epoch ms when their reconnect window closes */
  graceEndsAt: ReadonlyMap<string, number>;
}

/** Turns server players into the seats the round table draws, in seating order. */
export function buildSeatViews({ players, hostId, localPlayerId, localAvatarId, localIsGuest, fallbackAvatarIds, accounts, graceEndsAt }: BuildSeatsInput): LobbySeatView[] {
  return players.map((player, index) => {
    const isLocal = player.id === localPlayerId;
    const account = accounts.get(player.id);
    return {
      id: player.id,
      name: player.name,
      avatarId: isLocal ? localAvatarId : account?.avatar ?? fallbackAvatarIds[index % fallbackAvatarIds.length],
      level: account?.level,
      isHost: player.id === hostId,
      isLocal,
      isBot: player.isBot,
      botLabel: player.isBot ? BOT_LABELS[player.botDifficulty ?? 3] : undefined,
      isReady: player.isBot || player.isReady === true,
      isConnected: player.isBot || player.isConnected,
      graceEndsAt: graceEndsAt.get(player.id) ?? null,
      hasAccount: Boolean(account),
      isGuest: isLocal && localIsGuest,
    };
  });
}

/** Short, scannable chips for the rules in play; house rules (non-default) are flagged. */
export function summarizeRules(ruleset: IRulesetConfig): RuleChip[] {
  const chips: RuleChip[] = [];
  const { structure, bidding, scoring, card, turn } = ruleset;
  const d = DEFAULT_RULESET_CONFIG;

  chips.push(structure.customRoundCount ? { id: 'rounds', label: `${structure.customRoundCount} ${structure.customRoundCount === 1 ? 'round' : 'rounds'}`, isHouseRule: true } : { id: 'rounds', label: 'Full game', isHouseRule: false });
  if (structure.descendingRounds) chips.push({ id: 'descending', label: 'Descending rounds', isHouseRule: true });
  if (bidding.hiddenBids) chips.push({ id: 'hidden', label: 'Hidden bids', isHouseRule: true });
  if (bidding.allowEqualBids) chips.push({ id: 'equal', label: 'Bids may add up', isHouseRule: true });
  const scoringChanged = scoring.baseBidPoints !== d.scoring.baseBidPoints || scoring.pointsPerTrick !== d.scoring.pointsPerTrick || scoring.penaltyPerMiss !== d.scoring.penaltyPerMiss;
  chips.push({ id: 'scoring', label: scoringChanged ? `Scoring ${scoring.baseBidPoints}/${scoring.pointsPerTrick}/−${scoring.penaltyPerMiss}` : 'Classic scoring', isHouseRule: scoringChanged });
  if (card.lastWizardWins) chips.push({ id: 'last-wizard', label: 'Last wizard wins', isHouseRule: true });
  if (card.lastJesterWins) chips.push({ id: 'last-jester', label: 'Last jester wins', isHouseRule: true });
  if (turn.playTimerSeconds) chips.push({ id: 'timer', label: `${turn.playTimerSeconds} s turns`, isHouseRule: true, icon: 'timer' });
  return chips;
}

/** Whether the host can start, and the one line that explains what the table is waiting for. */
export function startReadiness(seats: LobbySeatView[], hostName: string, isHost: boolean): StartReadiness {
  const needed = CONSTANTS.GAME.MIN_PLAYERS - seats.length;
  if (needed > 0) {
    return { canStart: false, reason: `Waiting for ${needed} more ${needed === 1 ? 'player' : 'players'} · add a bot to start now` };
  }
  const away = seats.filter((seat) => !seat.isConnected);
  const unready = seats.filter((seat) => !seat.isHost && seat.isConnected && !seat.isReady);
  if (!isHost) {
    return { canStart: true, reason: unready.length || away.length ? `${hostName} starts once everyone is ready` : `Everyone is ready · waiting for ${hostName}` };
  }
  if (away.length) return { canStart: true, reason: `Waiting for ${away[0].name} to reconnect · you can start anyway` };
  if (unready.length) return { canStart: true, reason: `${unready.map((seat) => seat.name).join(', ')} not ready yet · you can start anyway` };
  return { canStart: true, reason: 'Everyone is ready' };
}
