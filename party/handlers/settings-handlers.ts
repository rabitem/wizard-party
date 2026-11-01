import type * as Party from "../runtime";
import {
  GamePhase,
  ensureRoomSettings,
  type IRoomSettings,
  type IRulesetConfig,
} from "../../shared/domain";
import type { ServerContext } from "../utils/types";
import { roomSettingsChangedFact, rulesetChangedFact } from "../telemetry";

/**
 * Normalizes and applies room settings (and the ruleset they may carry) to the room and the game.
 */
export function applyRoomSettings(ctx: ServerContext, settings: IRoomSettings, playerId: string | null): void {
  const previousRoomSettings = ctx.roomSettings;
  const previousRuleset = ctx.game.rulesetConfig;
  const nextRoomSettings = ensureRoomSettings({ ...ctx.roomSettings, ...settings }, ctx.roomSettings);
  if (Object.prototype.hasOwnProperty.call(settings, 'rulesetConfig')) {
    ctx.game.setRulesetConfig(nextRoomSettings.rulesetConfig);
  }
  nextRoomSettings.rulesetConfig = ctx.game.rulesetConfig;
  ctx.setRoomSettings(nextRoomSettings);

  const settingsFact = roomSettingsChangedFact(playerId, previousRoomSettings, nextRoomSettings);
  if (settingsFact) ctx.telemetry.record(settingsFact, ctx.game);
  // Ruleset history lives in ruleset.changed, whichever command changed it (incl. room creation).
  const rulesetFact = rulesetChangedFact(playerId, previousRuleset, ctx.game.rulesetConfig);
  if (rulesetFact) ctx.telemetry.record(rulesetFact, ctx.game);
}

export function handleSetRoomSettings(
  ctx: ServerContext,
  settings: IRoomSettings,
  sender: Party.Connection
): void {
  const playerId = ctx.connectionToPlayer.get(sender.id);

  if (playerId !== ctx.game.hostId) {
    throw new Error('Only host can change room settings');
  }

  if (ctx.game.phase !== GamePhase.LOBBY) {
    throw new Error('Cannot change room settings after game started');
  }

  applyRoomSettings(ctx, settings, playerId);
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}

export function handleSetRuleset(
  ctx: ServerContext,
  rulesetConfig: IRulesetConfig,
  sender: Party.Connection
): void {
  const playerId = ctx.connectionToPlayer.get(sender.id);

  if (playerId !== ctx.game.hostId) {
    throw new Error('Only host can change ruleset configuration');
  }

  if (ctx.game.phase !== GamePhase.LOBBY) {
    throw new Error('Cannot change ruleset after game started');
  }

  const previousRuleset = ctx.game.rulesetConfig;
  ctx.game.setRulesetConfig(rulesetConfig);
  const fact = rulesetChangedFact(playerId, previousRuleset, ctx.game.rulesetConfig);
  if (fact) ctx.telemetry.record(fact, ctx.game);
  ctx.setRoomSettings(ensureRoomSettings(
    { ...ctx.roomSettings, rulesetConfig: ctx.game.rulesetConfig },
    ctx.roomSettings
  ));
  ctx.broadcastPersonalizedState();
  ctx.saveState();
}
