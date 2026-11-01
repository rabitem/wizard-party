'use client';

import { Check, Globe, Lock, Minus, Plus } from 'lucide-react';
import { countNonDefaultRules, DEFAULT_RULESET_CONFIG, type IRulesetConfig } from '@shared/domain';
import { CONSTANTS } from '@/presentation/config/constants';
import { RulesetSection } from '../../settings';
import { LobbySheet } from './LobbySheet';
import { SERIF } from './lobby-styles';

interface TableSettingsSheetProps {
  isHost: boolean;
  isPublic: boolean;
  maxPlayers: number;
  seatedCount: number;
  rulesetConfig: IRulesetConfig;
  onVisibilityChange: (isPublic: boolean) => void;
  onMaxPlayersChange: (maxPlayers: number) => void;
  onRulesetChange: (config: IRulesetConfig) => void;
  onClose: () => void;
}

function VisibilityOption({ active, icon, title, hint, disabled, onClick }: { active: boolean; icon: React.ReactNode; title: string; hint: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`p-3 rounded-xl text-left transition-colors ${active ? 'border-2 border-amber-500/80 bg-amber-700/20' : 'border border-amber-800/60 hover:border-amber-600/60'} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      style={SERIF}
    >
      <span className={`block mb-1 ${active ? 'text-amber-300' : 'text-amber-500/90'}`}>{icon}</span>
      <span className={`block text-sm ${active ? 'text-amber-50' : 'text-amber-200'}`}>{title}</span>
      <span className="block text-xs text-amber-500/90">{hint}</span>
    </button>
  );
}

/** Room settings plus the full rule editor. Guests see the same sheet read-only. */
export function TableSettingsSheet({
  isHost, isPublic, maxPlayers, seatedCount, rulesetConfig, onVisibilityChange, onMaxPlayersChange, onRulesetChange, onClose,
}: TableSettingsSheetProps) {
  const minSeats = Math.max(CONSTANTS.GAME.MIN_PLAYERS, seatedCount);
  const isClassic = countNonDefaultRules(rulesetConfig) === 0;

  return (
    <LobbySheet
      skinVariant="rules"
      title={isHost ? 'Table settings' : 'Table rules'}
      subtitle={isHost ? undefined : 'Only the host can change these'}
      onClose={onClose}
      footer={
        isHost ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-amber-500/90 flex items-center gap-1.5" style={SERIF}>
              <Check className="w-3.5 h-3.5 text-emerald-400" />Changes apply instantly for everyone
            </p>
            {!isClassic ? (
              <button type="button" onClick={() => onRulesetChange(DEFAULT_RULESET_CONFIG)} className="h-10 px-4 rounded-xl border border-amber-700/50 text-amber-200 text-sm cursor-pointer" style={SERIF}>
                Reset to classic
              </button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Who can join">
        <VisibilityOption active={!isPublic} disabled={!isHost} icon={<Lock className="w-4 h-4" />} title="Private" hint="Code or invite only" onClick={() => onVisibilityChange(false)} />
        <VisibilityOption active={isPublic} disabled={!isHost} icon={<Globe className="w-4 h-4" />} title="Public" hint="Open for quick play" onClick={() => onVisibilityChange(true)} />
      </div>

      <div className="flex items-center gap-3 py-3 mb-3 border-y border-amber-800/30">
        <div className="flex-1">
          <p className="text-amber-100 text-sm" style={SERIF}>Seats</p>
          <p className="text-xs text-amber-500/90" style={SERIF}>{CONSTANTS.GAME.MIN_PLAYERS} to {CONSTANTS.GAME.MAX_PLAYERS} players</p>
        </div>
        <div className="flex items-center rounded-xl border border-amber-700/50">
          <button type="button" aria-label="Fewer seats" disabled={!isHost || maxPlayers <= minSeats} onClick={() => onMaxPlayersChange(maxPlayers - 1)} className="w-10 h-10 flex items-center justify-center text-amber-300 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed">
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-amber-50" style={SERIF} aria-live="polite">{maxPlayers}</span>
          <button type="button" aria-label="More seats" disabled={!isHost || maxPlayers >= CONSTANTS.GAME.MAX_PLAYERS} onClick={() => onMaxPlayersChange(maxPlayers + 1)} className="w-10 h-10 flex items-center justify-center text-amber-300 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <RulesetSection rulesetConfig={rulesetConfig} onRulesetChange={onRulesetChange} isHost={isHost} />
    </LobbySheet>
  );
}
