'use client';

import { IPlayer } from '@shared/domain';
import { PlayerStats, PLAYER_COLORS } from './types';
import { NAME_SCORE_TEXT_CLASS } from '../name-score-layout';

// Stable IDs for SVG elements
const RING_IDS = ['ring-0', 'ring-1', 'ring-2', 'ring-3'] as const;
const RING_SCALES = [0.25, 0.5, 0.75, 1];
const AXIS_IDS = ['axis-0', 'axis-1', 'axis-2', 'axis-3', 'axis-4'] as const;
const POINT_IDS = ['point-0', 'point-1', 'point-2', 'point-3', 'point-4'] as const;
const LABEL_IDS = ['label-0', 'label-1', 'label-2', 'label-3', 'label-4'] as const;

interface StatsTabProps {
  players: IPlayer[];
  sortedPlayers: IPlayer[];
  localPlayerId: string;
  stats: Record<string, PlayerStats>;
}

interface RadarChartData {
  numAxes: number;
  centerX: number;
  centerY: number;
  maxRadius: number;
}

const RADAR_CONFIG: RadarChartData = { numAxes: 5, centerX: 100, centerY: 90, maxRadius: 65 };
const STAT_LABELS = ['Accuracy', 'Best Rnd', 'Tricks', 'Streak', 'Score'];

/** Calculate polygon points for radar chart */
function getPolygonPoints(values: number[], config: RadarChartData): string {
  return values.map((value, i) => {
    const angle = (Math.PI * 2 * i) / config.numAxes - Math.PI / 2;
    const radius = value * config.maxRadius;
    return `${config.centerX + Math.cos(angle) * radius},${config.centerY + Math.sin(angle) * radius}`;
  }).join(' ');
}

/** Award card component */
function AwardCard({ icon, iconColor, label, playerName }: { icon: string; iconColor: string; label: string; playerName: string }) {
  return (
    <div className="rounded-lg p-2.5 text-center min-w-0" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), white 6%) 60%, transparent)', border: '1px solid var(--surface-border)' }}>
      <i className={`ra ${icon} text-lg mb-1`} style={{ color: iconColor }} />
      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--accent-dim)' }}>{label}</div>
      <div className={`text-xs font-semibold ${NAME_SCORE_TEXT_CLASS}`} style={{ color: 'var(--accent-parchment)' }}>{playerName}</div>
    </div>
  );
}

/** Player legend item */
function PlayerLegendItem({ player, idx, isLocal }: { player: IPlayer; idx: number; isLocal: boolean }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0 max-w-full">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] }} />
      <span className={`text-xs font-medium ${NAME_SCORE_TEXT_CLASS}`} style={{ color: isLocal ? 'var(--color-amber-100)' : 'var(--accent-dim)' }}>{player.name}</span>
    </div>
  );
}

/** Render background rings */
function BackgroundRings({ numAxes, centerX, centerY, maxRadius }: RadarChartData) {
  return (<>{RING_IDS.map((id, i) => (
    <polygon key={id} points={Array.from({ length: numAxes }, (_, j) => {
      const angle = (Math.PI * 2 * j) / numAxes - Math.PI / 2;
      const radius = RING_SCALES[i] * maxRadius;
      return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
    }).join(' ')} fill="none" stroke="rgba(139, 115, 85, 0.2)" strokeWidth="1" />
  ))}</>);
}

/** Render axis lines */
function AxisLines({ numAxes, centerX, centerY, maxRadius }: RadarChartData) {
  return (<>{AXIS_IDS.map((id, i) => {
    const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
    return <line key={id} x1={centerX} y1={centerY} x2={centerX + Math.cos(angle) * maxRadius} y2={centerY + Math.sin(angle) * maxRadius} stroke="rgba(139, 115, 85, 0.3)" strokeWidth="1" />;
  })}</>);
}

/** Render stat labels */
function StatLabels({ numAxes, centerX, centerY, maxRadius }: RadarChartData) {
  return (<>{LABEL_IDS.map((id, i) => {
    const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
    const labelRadius = maxRadius + 16;
    return <text key={id} x={centerX + Math.cos(angle) * labelRadius} y={centerY + Math.sin(angle) * labelRadius} textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">{STAT_LABELS[i]}</text>;
  })}</>);
}

interface CalcValuesParams {
  playerId: string; stats: Record<string, PlayerStats>; players: IPlayer[];
  maxValues: { accuracy: number; bestRound: number; tricks: number; streak: number };
  minScore: number; scoreRange: number;
}

/** Get player radar values */
function calcPlayerValues({ playerId, stats, players, maxValues, minScore, scoreRange }: CalcValuesParams): number[] {
  const s = stats[playerId];
  const player = players.find((p) => p.id === playerId);
  if (!s || !player) return [0, 0, 0, 0, 0];
  const accuracy = s.totalBids > 0 ? (s.perfectBids / s.totalBids) * 100 : 0;
  const normalizedScore = ((player.score - minScore) / scoreRange) * 0.9 + 0.1;
  return [accuracy / maxValues.accuracy, s.bestRound / maxValues.bestRound, s.totalTricksWon / maxValues.tricks, s.longestStreak / maxValues.streak, normalizedScore];
}

export function StatsTab({ players, sortedPlayers, localPlayerId, stats }: StatsTabProps) {
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const { numAxes, centerX, centerY, maxRadius } = RADAR_CONFIG;

  const allScores = players.map((p) => p.score);
  const minScore = Math.min(...allScores);
  const scoreRange = Math.max(...allScores) - minScore || 1;
  const maxValues = { accuracy: 100, bestRound: Math.max(...players.map((p) => stats[p.id]?.bestRound || 0), 1), tricks: Math.max(...players.map((p) => stats[p.id]?.totalTricksWon || 0), 1), streak: Math.max(...players.map((p) => stats[p.id]?.longestStreak || 0), 1) };
  const getValues = (playerId: string) => calcPlayerValues({ playerId, stats, players, maxValues, minScore, scoreRange });

  const mostPerfectBids = [...players].sort((a, b) => (stats[b.id]?.perfectBids || 0) - (stats[a.id]?.perfectBids || 0))[0];
  const bestSingleRound = players.reduce((best, p) => { const s = stats[p.id]?.bestRound || 0; return s > best.score ? { player: p, score: s } : best; }, { player: players[0], score: 0 });
  const mostTricks = [...players].sort((a, b) => (stats[b.id]?.totalTricksWon || 0) - (stats[a.id]?.totalTricksWon || 0))[0];

  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4" style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--surface-border)' }}>
        <div className="flex items-center justify-center">
          <svg width="200" height="180" viewBox="0 0 200 180">
            <BackgroundRings {...RADAR_CONFIG} />
            <AxisLines {...RADAR_CONFIG} />
            {sortedPlayers.filter((p) => p.id !== localPlayerId).map((player) => {
              const idx = sortedPlayers.findIndex((p) => p.id === player.id);
              return <polygon key={`poly-${player.id}`} points={getPolygonPoints(getValues(player.id), RADAR_CONFIG)} fill={PLAYER_COLORS[idx % PLAYER_COLORS.length]} fillOpacity="0.1" stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length]} strokeWidth="1.5" strokeOpacity="0.3" />;
            })}
            {localPlayer ? (() => {
              const idx = sortedPlayers.findIndex((p) => p.id === localPlayerId);
              const values = getValues(localPlayerId);
              const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
              return (<>
                <polygon points={getPolygonPoints(values, RADAR_CONFIG)} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
                {POINT_IDS.map((id, i) => {
                  const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
                  return <circle key={id} cx={centerX + Math.cos(angle) * values[i] * maxRadius} cy={centerY + Math.sin(angle) * values[i] * maxRadius} r="4" fill={color} stroke="#1a1510" strokeWidth="2" />;
                })}
              </>);
            })() : null}
            <StatLabels {...RADAR_CONFIG} />
          </svg>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2 min-w-0">{sortedPlayers.map((player, idx) => <PlayerLegendItem key={player.id} player={player} idx={idx} isLocal={player.id === localPlayerId} />)}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <AwardCard icon="ra-target-arrows" iconColor="#4ade80" label="Accurate" playerName={mostPerfectBids?.name || ''} />
        <AwardCard icon="ra-lightning-bolt" iconColor="#ffd700" label="Best Round" playerName={bestSingleRound.player?.name || ''} />
        <AwardCard icon="ra-trophy" iconColor="#4a9eff" label="Most Tricks" playerName={mostTricks?.name || ''} />
      </div>
    </div>
  );
}
