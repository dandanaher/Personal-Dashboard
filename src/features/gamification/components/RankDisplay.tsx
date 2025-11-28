import { Shield, AlertCircle } from 'lucide-react';
import { getRankFromXP } from '../utils';

interface RankDisplayProps {
  totalXP: number;
  isLoading?: boolean;
}

/**
 * Display user's current material rank with tier progression
 */
export function RankDisplay({ totalXP, isLoading = false }: RankDisplayProps) {
  if (isLoading) {
    return (
      <div className="pb-4">
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded mb-4 w-32"></div>
          <div className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
        </div>
      </div>
    );
  }

  const rankInfo = getRankFromXP(totalXP);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-secondary-900 dark:text-white">Your Rank</h2>
        <div className="text-right">
          <span className="text-sm text-secondary-500 dark:text-secondary-400">
            {rankInfo.rankName}
          </span>
          <div className="text-lg font-bold text-secondary-900 dark:text-white">
            Tier {rankInfo.tier}
          </div>
        </div>
      </div>

      {/* Rank Display Card */}
      <div className="bg-white dark:bg-secondary-800 rounded-lg border-2 border-secondary-200 dark:border-secondary-700 p-6">
        {/* Rank Badge */}
        <div className="flex items-center justify-center mb-4">
          <div
            className="relative flex items-center justify-center w-32 h-32 rounded-full shadow-lg"
            style={{
              backgroundColor: rankInfo.color,
              boxShadow: `0 0 30px ${rankInfo.color}40`,
            }}
          >
            <Shield className="w-16 h-16 text-white drop-shadow-md" strokeWidth={2} />
            <div className="absolute bottom-2 bg-white dark:bg-secondary-900 px-3 py-1 rounded-full">
              <span className="text-xs font-bold text-secondary-900 dark:text-white">
                {rankInfo.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Rank Name */}
        <div className="text-center mb-6">
          <h3
            className="text-2xl font-bold mb-1"
            style={{ color: rankInfo.color }}
          >
            {rankInfo.rankName.toUpperCase()}
          </h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Level {rankInfo.level} • {totalXP.toLocaleString()} XP
          </p>
        </div>

        {/* Progress Bar */}
        {rankInfo.level < 30 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-secondary-500 dark:text-secondary-400 mb-1">
              <span>Progress to Tier {rankInfo.level + 1 <= 30 ? getRomanNumeral(rankInfo.level + 1) : 'MAX'}</span>
              <span>{Math.floor(rankInfo.progressToNextTier)}%</span>
            </div>
            <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${rankInfo.progressToNextTier}%`,
                  backgroundColor: rankInfo.color,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              <span>{totalXP.toLocaleString()} XP</span>
              <span>{rankInfo.nextTierXP.toLocaleString()} XP</span>
            </div>
          </div>
        )}

        {/* Daily Tax Warning */}
        {rankInfo.dailyTax > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Daily Upkeep
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                -{rankInfo.dailyTax} XP per missed day
              </p>
            </div>
          </div>
        )}

        {/* Max Rank Achievement */}
        {rankInfo.level === 30 && (
          <div className="text-center py-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
              🏆 Maximum Rank Achieved! 🏆
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              You've reached the pinnacle of progression!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper to get Roman numeral representation for tier display
 */
function getRomanNumeral(level: number): string {
  const tierInRank = ((level - 1) % 3) + 1;
  return ['I', 'II', 'III'][tierInRank - 1] || 'I';
}

export default RankDisplay;
