'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Volume2 } from 'lucide-react';
import { GamePhase, type CustomSound, type IGameState, type IPlayer, type ITurnTimerState, type SharedCustomSound } from '@shared/domain';
import type { TurnTimerPlacement, TurnTimerSize } from '@/presentation/types/hud-layout.types';
import { NAME_SCORE_TEXT_CLASS } from '../name-score-layout';
import { loadGameSettings } from '../settings';
import { TurnTimerSoundboardPanel } from './TurnTimerSoundboardPanel';
import {
  createTimerCountdownSync,
  getTimerCountdownSeconds,
  getTimerSyncKey,
  type TimerCountdownInput,
  type TimerCountdownSync,
} from './turn-timer-countdown';
import {
  buildTimeoutSoundboardOptions,
  getTimeoutSoundCommand,
} from './timeout-soundboard-options';
import {
  applyTimeoutSoundboardPreferences,
  loadTimeoutSoundboardPreferences,
  moveSoundboardOption,
  saveTimeoutSoundboardPreferences,
  togglePinnedSoundboardOption,
  type TimeoutSoundboardPreferences,
} from './timeout-soundboard-preferences';

const TIMER_TICK_MS = 250;

/** Width per placement size; the fixed widths keep the status column of the HUD grid stable. */
const TIMER_SIZE_CLASSES: Readonly<Record<TurnTimerSize, { row: string; showPhase: boolean }>> = {
  narrow: { row: 'w-[210px] px-3', showPhase: false },
  compact: { row: 'min-w-[250px] px-3', showPhase: true },
  regular: { row: 'w-[320px] px-4', showPhase: true },
};
const EMPTY_TIMER_COUNTDOWN_STATE: TimerCountdownViewState = { sync: null, localNow: 0 };

interface TurnTimerSoundboardProps {
  gameState: IGameState;
  playerId: string;
  /** Popover direction and size from the layout policy (TURN_TIMER_PLACEMENT) */
  placement: Pick<TurnTimerPlacement, 'align' | 'opens' | 'size'>;
  sharedCustomSounds: SharedCustomSound[];
  onPlayTimeoutSound: (sound: string | { customAudio: CustomSound }) => void;
}

function getPhaseLabel(phase: GamePhase): string {
  if (phase === GamePhase.TRUMP_SELECTION) return 'Trump';
  if (phase === GamePhase.BIDDING) return 'Bid';
  return 'Play';
}

interface TimerCountdownViewState {
  sync: TimerCountdownSync | null;
  localNow: number;
}

function useTimerCountdown(timer: ITurnTimerState | null): number {
  const timerPlayerId = timer?.playerId;
  const timerSequence = timer?.sequence;
  const timerDurationMs = timer?.durationMs;
  const timerExpiresAt = timer?.expiresAt;
  const timerExpired = timer?.expired;
  const timerServerNow = timer?.serverNow;
  const timerInput = useMemo<TimerCountdownInput | null>(() => {
    if (
      !timerPlayerId ||
      timerSequence === undefined ||
      timerDurationMs === undefined ||
      timerExpiresAt === undefined ||
      timerExpired !== false
    ) {
      return null;
    }

    return {
      playerId: timerPlayerId,
      sequence: timerSequence,
      durationMs: timerDurationMs,
      expiresAt: timerExpiresAt,
      expired: false,
      serverNow: timerServerNow,
    };
  }, [
    timerDurationMs,
    timerExpired,
    timerExpiresAt,
    timerPlayerId,
    timerSequence,
    timerServerNow,
  ]);
  const [countdown, setCountdown] = useState<TimerCountdownViewState>(EMPTY_TIMER_COUNTDOWN_STATE);

  useEffect(() => {
    if (!timerInput) return undefined;

    const localNow = Date.now();
    const sync = createTimerCountdownSync(timerInput, localNow);
    const initialUpdate = window.setTimeout(() => {
      setCountdown({ sync, localNow });
    }, 0);

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current.sync?.key !== sync.key) return current;
        return { ...current, localNow: Date.now() };
      });
    }, TIMER_TICK_MS);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [timerInput]);

  const activeSync = countdown.sync?.key === (timerInput ? getTimerSyncKey(timerInput) : null)
    ? countdown.sync
    : null;

  return getTimerCountdownSeconds(activeSync, countdown.localNow);
}

function useLocalAfkCustomSounds(): CustomSound[] {
  const [sounds, setSounds] = useState<CustomSound[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadGameSettings().customSounds.filter((sound) => sound.roles.afk);
  });

  const syncSounds = useCallback(() => {
    setSounds(loadGameSettings().customSounds.filter((sound) => sound.roles.afk));
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncSounds);
    window.addEventListener('settings-changed', syncSounds);
    return () => {
      window.removeEventListener('storage', syncSounds);
      window.removeEventListener('settings-changed', syncSounds);
    };
  }, [syncSounds]);

  return sounds;
}

function getProgressPercent(timer: ITurnTimerState, remainingSeconds: number): number {
  if (timer.expired || timer.durationMs <= 0) return 0;
  const remainingMs = Math.min(timer.durationMs, remainingSeconds * 1000);
  return Math.max(0, Math.min(100, (remainingMs / timer.durationMs) * 100));
}

function getContainerBorderClass(expired: boolean): string {
  return expired ? 'border-red-700/50' : 'border-amber-700/40';
}

function getContainerBackground(expired: boolean): string {
  if (expired) {
    return 'linear-gradient(180deg, rgba(52,18,18,0.96) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 8%) 96%, transparent) 100%)';
  }
  return 'var(--surface)';
}

function getTargetPlayer(gameState: IGameState, timer: ITurnTimerState): IPlayer | null {
  return gameState.players.find((player) => player.id === timer.playerId) ?? null;
}

function canUseTimeoutSoundboard(
  timer: ITurnTimerState,
  isTargetPlayer: boolean,
  targetPlayer: IPlayer | null
): boolean {
  return timer.expired && !isTargetPlayer && targetPlayer?.isBot !== true;
}

function getTargetName(targetPlayer: IPlayer | null, timer: ITurnTimerState): string {
  return targetPlayer?.name ?? timer.playerName;
}

/** Turn timer and timeout soundboard; the HUD places it in the region the layout policy picks. */
export function TurnTimerSoundboard({
  gameState,
  playerId,
  placement,
  sharedCustomSounds,
  onPlayTimeoutSound,
}: TurnTimerSoundboardProps) {
  const [arrangeMode, setArrangeMode] = useState(false);
  const [preferences, setPreferences] = useState<TimeoutSoundboardPreferences>(() => loadTimeoutSoundboardPreferences());
  const timer = gameState.turnTimerState;
  const remainingSeconds = useTimerCountdown(timer ?? null);
  const localAfkSounds = useLocalAfkCustomSounds();
  const options = useMemo(() => buildTimeoutSoundboardOptions({
    localSounds: localAfkSounds,
    sharedSounds: sharedCustomSounds,
    localPlayerId: playerId,
  }), [localAfkSounds, playerId, sharedCustomSounds]);
  const orderedOptions = useMemo(
    () => applyTimeoutSoundboardPreferences(options, preferences),
    [options, preferences]
  );

  if (!timer) return null;

  const targetPlayer = getTargetPlayer(gameState, timer);
  const isTargetPlayer = timer.playerId === playerId;
  const canUseSoundboard = canUseTimeoutSoundboard(timer, isTargetPlayer, targetPlayer);
  const progressPercent = getProgressPercent(timer, remainingSeconds);
  const targetName = getTargetName(targetPlayer, timer);
  const sizeClasses = TIMER_SIZE_CLASSES[placement.size];
  const handlePreferencesChange = (nextPreferences: TimeoutSoundboardPreferences) => {
    setPreferences(saveTimeoutSoundboardPreferences(nextPreferences));
  };

  return (
    <div className="relative z-30">
      <div className="relative max-w-full">
        <div className={`absolute -inset-1 rounded blur-md ${timer.expired ? 'bg-red-900/25' : 'bg-amber-900/20'}`} />
        <div
          className={`relative overflow-visible rounded border-2 ${getContainerBorderClass(timer.expired)}`}
          style={{
            background: getContainerBackground(timer.expired),
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
          }}
        >
          <div className={`flex h-11 items-center gap-3 ${sizeClasses.row}`}>
            <Clock className={`h-4 w-4 flex-shrink-0 ${timer.expired ? 'text-red-300' : 'text-amber-400'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm text-amber-100 font-serif">
                  {sizeClasses.showPhase ? (
                    <>
                      <span className="text-amber-500/70">{getPhaseLabel(timer.phase)}</span>
                      <span className="text-amber-700/50"> / </span>
                    </>
                  ) : null}
                  <span className={NAME_SCORE_TEXT_CLASS}>{isTargetPlayer ? 'Your turn' : targetName}</span>
                </span>
                <span className={`flex-shrink-0 font-mono text-sm ${timer.expired ? 'text-red-200' : 'text-amber-200'}`}>
                  {timer.expired ? '00' : remainingSeconds.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-black/40">
                <div
                  className={`h-full rounded ${timer.expired ? 'bg-red-500/70' : 'bg-amber-400/80'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border ${canUseSoundboard ? 'border-red-600/40 bg-red-950/40 text-red-100' : 'border-stone-700/50 bg-stone-950/40 text-stone-500'}`}
              title={canUseSoundboard ? 'Soundboard ready' : 'Soundboard locked'}
              aria-label={canUseSoundboard ? 'Soundboard ready' : 'Soundboard locked'}
            >
              <Volume2 className="h-4 w-4" />
            </div>
          </div>
          <TurnTimerSoundboardPanel
            targetName={targetName}
            align={placement.align}
            placement={placement.opens}
            canUseSoundboard={canUseSoundboard}
            timer={timer}
            options={orderedOptions}
            preferences={preferences}
            arrangeMode={arrangeMode}
            onArrangeModeChange={setArrangeMode}
            onMoveOption={(optionId, direction) => handlePreferencesChange(moveSoundboardOption(options, preferences, optionId, direction))}
            onTogglePin={(optionId) => handlePreferencesChange(togglePinnedSoundboardOption(preferences, optionId))}
            onPlay={(option) => {
              const command = getTimeoutSoundCommand(option);
              if (command) onPlayTimeoutSound(command);
            }}
          />
        </div>
      </div>
    </div>
  );
}
