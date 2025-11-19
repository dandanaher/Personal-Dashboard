// XP and Level calculation utilities for gamification

export const XP_PER_LEVEL_CONSTANT = 0.1;

/**
 * Calculate the level from XP using the formula: Level = floor(0.1 * sqrt(XP)) + 1
 * This creates a curve where higher levels require more XP
 */
export function getLevelFromXP(xp: number): number {
  if (xp === 0) return 1;
  return Math.floor(XP_PER_LEVEL_CONSTANT * Math.sqrt(xp)) + 1;
}

/**
 * Calculate the XP required to reach a specific level
 * Inverse of the level formula
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow((level - 1) / XP_PER_LEVEL_CONSTANT, 2);
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
  HABIT_COMPLETE: 15,     // Consistency
  WORKOUT_COMPLETE: 50,   // Vitality
  TASK_COMPLETE: 20,      // Focus
  GOAL_COMPLETE: 100,     // Drive
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
