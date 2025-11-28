// XP and Level calculation utilities for gamification

export const XP_PER_LEVEL_CONSTANT = 0.1;

/**
 * Calculate the level from XP using the formula: Level = floor(0.1 * sqrt(XP))
 * Zero-based: 0 XP = Level 0
 * This creates a curve where higher levels require more XP
 */
export function getLevelFromXP(xp: number): number {
  if (!xp || xp < 0) return 0;
  return Math.floor(XP_PER_LEVEL_CONSTANT * Math.sqrt(xp));
}

/**
 * Calculate the XP required to reach a specific level
 * Inverse of the level formula
 */
export function getXPForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.pow(level / XP_PER_LEVEL_CONSTANT, 2);
}

/**
 * Calculate progress percentage to the next level
 * Returns a value between 0 and 100
 */
export function getProgressToNextLevel(xp: number): number {
  const currentLevel = getLevelFromXP(xp);
  const nextLevel = currentLevel + 1;

  const xpStart = getXPForLevel(currentLevel);
  const xpNext = getXPForLevel(nextLevel);

  if (xpNext === xpStart) return 0;
  return Math.min(100, Math.max(0, ((xp - xpStart) / (xpNext - xpStart)) * 100));
}

/**
 * XP rewards for different actions
 */
export const XP_REWARDS = {
  HABIT_COMPLETE: 5, // Consistency (nerfed to prevent farming)
  WORKOUT_COMPLETE: 50, // Vitality
  TASK_COMPLETE: 20, // Focus
  GOAL_COMPLETE: 100, // Drive
} as const;

/**
 * Attribute ID mapping for actions
 */
export const ACTION_TO_ATTRIBUTE = {
  habit: 'consistency',
  workout: 'vitality',
  task: 'focus',
  goal: 'drive',
} as const;

/**
 * Material Rank System Definitions
 * Each rank has 3 tiers (I, II, III), totaling 30 levels
 */
export interface RankDefinition {
  name: string;
  color: string;
  dailyTax: number;
  minLevel: number;
  maxLevel: number;
}

export const RANK_DEFINITIONS: RankDefinition[] = [
  { name: 'Wood', color: '#8B4513', dailyTax: 0, minLevel: 1, maxLevel: 3 },
  { name: 'Stone', color: '#708090', dailyTax: 5, minLevel: 4, maxLevel: 6 },
  { name: 'Bronze', color: '#CD7F32', dailyTax: 10, minLevel: 7, maxLevel: 9 },
  { name: 'Iron', color: '#808080', dailyTax: 20, minLevel: 10, maxLevel: 12 },
  { name: 'Silver', color: '#C0C0C0', dailyTax: 40, minLevel: 13, maxLevel: 15 },
  { name: 'Gold', color: '#FFD700', dailyTax: 75, minLevel: 16, maxLevel: 18 },
  { name: 'Ruby', color: '#E0115F', dailyTax: 125, minLevel: 19, maxLevel: 21 },
  { name: 'Platinum', color: '#E5E4E2', dailyTax: 175, minLevel: 22, maxLevel: 24 },
  { name: 'Diamond', color: '#B9F2FF', dailyTax: 225, minLevel: 25, maxLevel: 27 },
  { name: 'Palladium', color: '#CED0DD', dailyTax: 300, minLevel: 28, maxLevel: 30 },
];

export interface RankInfo {
  rankName: string;
  tier: 'I' | 'II' | 'III';
  level: number;
  color: string;
  dailyTax: number;
  currentXP: number;
  nextTierXP: number;
  progressToNextTier: number;
}

/**
 * Calculate level from total XP using quadratic curve
 * Formula: Level = floor(sqrt(XP / 50))
 * This makes higher ranks progressively harder to reach
 */
export function getLevelFromTotalXP(totalXP: number): number {
  if (!totalXP || totalXP < 0) return 1;
  const level = Math.floor(Math.sqrt(totalXP / 50));
  return Math.max(1, Math.min(30, level)); // Clamp between 1 and 30
}

/**
 * Calculate XP required to reach a specific level
 * Inverse of the level formula
 */
export function getXPForTotalLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level, 2) * 50;
}

/**
 * Get rank information from total XP
 */
export function getRankFromXP(totalXP: number): RankInfo {
  const level = getLevelFromTotalXP(totalXP);

  // Find the rank that contains this level
  const rankDef = RANK_DEFINITIONS.find(
    (rank) => level >= rank.minLevel && level <= rank.maxLevel
  ) || RANK_DEFINITIONS[0];

  // Determine tier within the rank (I, II, or III)
  const tierIndex = (level - rankDef.minLevel) % 3;
  const tier = (['I', 'II', 'III'] as const)[tierIndex];

  // Calculate progress to next tier
  const currentTierLevel = level;
  const nextTierLevel = Math.min(level + 1, 30);
  const currentXP = totalXP;
  const nextTierXP = getXPForTotalLevel(nextTierLevel);
  const xpForCurrentLevel = getXPForTotalLevel(currentTierLevel);

  const progressToNextTier =
    nextTierXP > xpForCurrentLevel
      ? Math.min(100, ((currentXP - xpForCurrentLevel) / (nextTierXP - xpForCurrentLevel)) * 100)
      : 100;

  return {
    rankName: rankDef.name,
    tier,
    level,
    color: rankDef.color,
    dailyTax: rankDef.dailyTax,
    currentXP,
    nextTierXP,
    progressToNextTier,
  };
}

/**
 * Get daily tax amount based on total XP
 */
export function getDailyTax(totalXP: number): number {
  const rankInfo = getRankFromXP(totalXP);
  return rankInfo.dailyTax;
}
