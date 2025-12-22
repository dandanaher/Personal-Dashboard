import type { Goal } from '@/lib/types';

export function isGoalHabitLinked(goal: Goal): boolean {
  return Boolean(goal.linked_habit_id && goal.target_completions);
}

export function getGoalDisplayProgress(goal: Goal, habitCompletions: number = 0): number {
  if (isGoalHabitLinked(goal) && goal.target_completions) {
    return Math.min(100, Math.round((habitCompletions / goal.target_completions) * 100));
  }
  return goal.completed ? 100 : goal.progress;
}
