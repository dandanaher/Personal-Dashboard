import type { HabitStats as HabitStatsType } from '../hooks';

interface HabitStatsProps {
  stats: HabitStatsType;
}

export function HabitStats({ stats }: HabitStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-3">
        <span className="text-secondary-500 dark:text-secondary-400 text-xs">
          Current Streak
        </span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-1">
          <span className="mr-1" aria-hidden="true">🔥</span>
          {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
        </p>
      </div>

      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-3">
        <span className="text-secondary-500 dark:text-secondary-400 text-xs">
          Longest Streak
        </span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-1">
          <span className="mr-1" aria-hidden="true">🏆</span>
          {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}
        </p>
      </div>

      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-3">
        <span className="text-secondary-500 dark:text-secondary-400 text-xs">
          Completion Rate
        </span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-1">
          <span className="mr-1" aria-hidden="true">📊</span>
          {stats.completionRate}%
        </p>
      </div>

      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-3">
        <span className="text-secondary-500 dark:text-secondary-400 text-xs">
          Total Completed
        </span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-1">
          <span className="mr-1" aria-hidden="true">✅</span>
          {stats.completedDays} {stats.completedDays === 1 ? 'day' : 'days'}
        </p>
      </div>
    </div>
  );
}
