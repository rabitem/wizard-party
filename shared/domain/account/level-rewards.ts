import { CHARACTER_PARTS, type CharacterPart } from '../character';
import { LEVEL_TITLES, getProgression, titleForLevel } from './progression';

/*
 * The rewards track. Every reward is a declarative entry unlocked by reaching a level, so adding a
 * reward means adding an entry to one of the catalogs below (or a level-unlocked character part to
 * CHARACTER_PARTS); the helpers and the UI pick it up.
 * Cosmetics are derived from the level (never stored), so they apply retroactively like titles.
 */

export type LevelRewardKind = 'title' | 'frame' | 'banner' | 'part';

export interface LevelReward {
  /** Unique across all kinds, e.g. `frame:gold`, `part:head:knight`. */
  id: string;
  kind: LevelRewardKind;
  /** Level at which the reward unlocks. */
  level: number;
  name: string;
}

export interface Cosmetic<Id extends string = string> {
  id: Id;
  name: string;
  /** Level that unlocks it; 1 means available from the start (not shown as a reward). */
  level: number;
}

/** Avatar frames, ordered by level. Rendering lives in the presentation layer, keyed by id. */
export const AVATAR_FRAMES = [
  { id: 'plain', name: 'Plain Frame', level: 1 },
  { id: 'bronze', name: 'Bronze Frame', level: 5 },
  { id: 'silver', name: 'Silver Frame', level: 10 },
  { id: 'gold', name: 'Gold Frame', level: 20 },
  { id: 'arcane', name: 'Arcane Frame', level: 30 },
  { id: 'legendary', name: 'Legendary Frame', level: 50 },
] as const satisfies readonly Cosmetic[];

/** Profile banner gradients, ordered by level. */
export const PROFILE_BANNERS = [
  { id: 'parchment', name: 'Parchment Banner', level: 1 },
  { id: 'ember', name: 'Ember Banner', level: 8 },
  { id: 'twilight', name: 'Twilight Banner', level: 15 },
  { id: 'aurora', name: 'Aurora Banner', level: 25 },
  { id: 'starfall', name: 'Starfall Banner', level: 40 },
] as const satisfies readonly Cosmetic[];

export type AvatarFrameId = (typeof AVATAR_FRAMES)[number]['id'];
export type ProfileBannerId = (typeof PROFILE_BANNERS)[number]['id'];

const KIND_ORDER: Record<LevelRewardKind, number> = { title: 0, frame: 1, banner: 2, part: 3 };

/** Heads and palettes share names with other parts (Knight, Knight Armour …), so say which. */
function partRewardName(part: CharacterPart): string {
  if (part.slot === 'head') return `${part.name} head`;
  if (part.slot === 'palette') return `${part.name} palette`;
  if (part.slot === 'familiar') return `${part.name} familiar`;
  return part.name;
}

/** Every reward on the track, sorted by level (then title, frame, banner). */
export const LEVEL_REWARDS: readonly LevelReward[] = [
  ...LEVEL_TITLES.filter((entry) => entry.minLevel > 1).map((entry) => ({
    id: `title:${entry.title.toLowerCase().replace(/\s+/g, '-')}`,
    kind: 'title' as const,
    level: entry.minLevel,
    name: `${entry.title} title`,
  })),
  ...AVATAR_FRAMES.filter((frame) => frame.level > 1).map((frame) => ({ id: `frame:${frame.id}`, kind: 'frame' as const, level: frame.level, name: frame.name })),
  ...PROFILE_BANNERS.filter((banner) => banner.level > 1).map((banner) => ({ id: `banner:${banner.id}`, kind: 'banner' as const, level: banner.level, name: banner.name })),
  // Character parts unlocked by level (achievement parts unlock with their achievement instead).
  ...CHARACTER_PARTS.flatMap((part) => (part.unlock.kind === 'level' ? [{ id: `part:${part.id}`, kind: 'part' as const, level: part.unlock.level, name: partRewardName(part) }] : [])),
].sort((a, b) => a.level - b.level || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

export interface RewardMilestone {
  level: number;
  rewards: LevelReward[];
}

/** The track grouped by level: one milestone per level that unlocks something. */
export function rewardMilestones(): RewardMilestone[] {
  const milestones: RewardMilestone[] = [];
  for (const reward of LEVEL_REWARDS) {
    const last = milestones[milestones.length - 1];
    if (last && last.level === reward.level) last.rewards.push(reward);
    else milestones.push({ level: reward.level, rewards: [reward] });
  }
  return milestones;
}

/** Rewards unlocked exactly when `level` is reached. */
function rewardsUnlockedAt(level: number): LevelReward[] {
  return LEVEL_REWARDS.filter((reward) => reward.level === level);
}

/** The first reward still ahead of `level`, or null when the track is complete. */
export function nextReward(level: number): LevelReward | null {
  return LEVEL_REWARDS.find((reward) => reward.level > level) ?? null;
}

function highestUnlocked<T extends Cosmetic>(catalog: readonly T[], level: number): T {
  let best = catalog[0];
  for (const entry of catalog) if (level >= entry.level) best = entry;
  return best;
}

export interface EquippedCosmetics {
  frameId: AvatarFrameId;
  bannerId: ProfileBannerId;
}

/** Default cosmetics for a level: the highest unlocked frame and banner. */
export function equippedCosmetics(level: number): EquippedCosmetics {
  return { frameId: highestUnlocked(AVATAR_FRAMES, level).id, bannerId: highestUnlocked(PROFILE_BANNERS, level).id };
}

export function isAvatarFrameId(value: unknown): value is AvatarFrameId {
  return AVATAR_FRAMES.some((frame) => frame.id === value);
}

export function isProfileBannerId(value: unknown): value is ProfileBannerId {
  return PROFILE_BANNERS.some((banner) => banner.id === value);
}

export interface LevelUp {
  level: number;
  title: string;
  rewards: LevelReward[];
}

/** Levels crossed when total XP goes from `prevXp` to `nextXp`, with what each unlocked. */
export function levelsGained(prevXp: number, nextXp: number): LevelUp[] {
  const from = getProgression(prevXp).level;
  const to = getProgression(nextXp).level;
  const gained: LevelUp[] = [];
  for (let level = from + 1; level <= to; level += 1) gained.push({ level, title: titleForLevel(level), rewards: rewardsUnlockedAt(level) });
  return gained;
}

/** Collapses several level-ups (e.g. a synced batch of games) into one announcement. */
export function summarizeLevelUps(levelUps: readonly LevelUp[]): LevelUp | null {
  if (levelUps.length === 0) return null;
  const last = levelUps[levelUps.length - 1];
  return { level: last.level, title: last.title, rewards: levelUps.flatMap((levelUp) => levelUp.rewards) };
}
