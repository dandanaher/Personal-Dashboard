import type { HabitStats as HabitStatsType } from '../hooks';

interface HabitStatsProps {
  stats: HabitStatsType;
}

export function HabitStats({ stats }: HabitStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 text-xs">
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-2 text-center">
        <span className="text-secondary-500 dark:text-secondary-400 block">Streak</span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-0.5">
          <span className="mr-0.5" aria-hidden="true">
            🔥
          </span>
          {stats.currentStreak}
        </p>
      </div>

      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-2 text-center">
        <span className="text-secondary-500 dark:text-secondary-400 block">Best</span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-0.5">
          <span className="mr-0.5" aria-hidden="true">
            🏆
          </span>
          {stats.longestStreak}
        </p>
      </div>

      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-2 text-center">
        <span className="text-secondary-500 dark:text-secondary-400 block">Rate</span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-0.5">
          <span className="mr-0.5" aria-hidden="true">
            📊
          </span>
          {stats.completionRate}%
        </p>
      </div>

      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-lg p-2 text-center">
        <span className="text-secondary-500 dark:text-secondary-400 block">Total</span>
        <p className="font-semibold text-secondary-900 dark:text-white mt-0.5">
          <span className="mr-0.5" aria-hidden="true">
            ✅
          </span>
          {stats.completedDays}
        </p>
      </div>
    </div>
  );
}
