import { type GameRecord } from '@/lib/player-stats';
import { PlacementBadge } from './PlacementBadge';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface RecentBattlesProps {
  gameHistory: GameRecord[];
}

export function RecentBattles({ gameHistory }: RecentBattlesProps) {
  if (gameHistory.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-amber-800/30 overflow-hidden"
      style={{ background: THEME_SURFACE.CARD_BG_SOFT }}
    >
      <div className="px-4 py-2.5 border-b border-amber-800/20 bg-amber-900/20">
        <span className="text-xs text-amber-500/70 uppercase tracking-wider font-serif">
          Recent Battles
        </span>
      </div>
      <div className="max-h-36 overflow-y-auto">
        {gameHistory
          .slice(-5)
          .reverse()
          .map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between px-4 py-2.5 border-b border-amber-800/10 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <PlacementBadge placement={game.placement} />
                <div>
                  <div className="text-sm text-amber-200/90 font-serif">
                    {game.score} glory
                  </div>
                  <div className="text-[10px] text-amber-600/50">{game.playerCount} wizards</div>
                </div>
              </div>
              <div className="text-[10px] text-amber-700/40">{new Date(game.date).toLocaleDateString()}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
