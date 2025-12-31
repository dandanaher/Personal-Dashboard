import { getRankFromXP } from '../utils';
import { LayoutGrid } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { ProgressBar } from '@/features/goals/components/ProgressBar';

interface RankDisplayProps {
  totalXP: number;
  isLoading?: boolean;
  onViewRanks?: () => void; // Optional callback for viewing all ranks
  showRanks?: boolean; // Whether ranks view is currently shown
  vertical?: boolean; // Stack image above info (default: horizontal)
}

/**
 * Get the image path for a rank based on name and tier
 */
function getRankImagePath(rankName: string, tier: 'I' | 'II' | 'III'): string {
  const tierNumber = tier === 'I' ? 1 : tier === 'II' ? 2 : 3;
  return `${import.meta.env.BASE_URL}images/ranks/${rankName.toLowerCase()}${tierNumber}.png`;
}

/**
 * Get glow effect for specific rank/tier combinations
 */
function getRankGlow(rankName: string, tier: 'I' | 'II' | 'III'): string {
  const key = `${rankName}-${tier}`;
  const glowMap: Record<string, string> = {
    'Silver-III': 'drop-shadow(0 0 8px rgba(0, 50, 150, 0.4))', // subtle deep blue
    'Gold-II': 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.4))', // subtle gold
    'Gold-III': 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.6))', // moderate gold
    'Ruby-II': 'drop-shadow(0 0 8px rgba(224, 17, 95, 0.4))', // subtle red
    'Ruby-III': 'drop-shadow(0 0 12px rgba(224, 17, 95, 0.6))', // moderate red
    'Platinum-II': 'drop-shadow(0 0 8px rgba(135, 206, 250, 0.4))', // subtle light blue
    'Platinum-III': 'drop-shadow(0 0 12px rgba(135, 206, 250, 0.6))', // moderate light blue
    'Diamond-II': 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.6))', // moderate white
    'Diamond-III': 'drop-shadow(0 0 16px rgba(255, 255, 255, 0.8))', // significant white
    'Palladium-II': 'drop-shadow(0 0 12px rgba(147, 51, 234, 0.6))', // moderate purple
    'Palladium-III': 'drop-shadow(0 0 16px rgba(255, 215, 0, 0.8))', // significant gold
  };

  return glowMap[key] || 'none';
}

/**
 * Display user's current material rank with tier progression
 */
export function RankDisplay({ totalXP, isLoading = false, onViewRanks, showRanks = false, vertical = false }: RankDisplayProps) {
  const { accentColor } = useThemeStore();
  if (isLoading) {
    return (
      <div className="pb-4">
        <div className="animate-pulse">
          <div className="h-48 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
        </div>
      </div>
    );
  }

  const rankInfo = getRankFromXP(totalXP);
  const imagePath = getRankImagePath(rankInfo.rankName, rankInfo.tier);
  const glowEffect = getRankGlow(rankInfo.rankName, rankInfo.tier);

  return (
    <div className="pb-2">

      <div className={`flex ${vertical ? 'flex-col items-center' : 'items-center'} gap-3`}>
        {/* Rank Image */}
        <div className={`flex-shrink-0 ${vertical ? 'w-full flex justify-center py-2' : ''}`}>
          <img
            src={imagePath}
            alt={`${rankInfo.rankName} ${rankInfo.tier}`}
            className={`${vertical ? 'w-48 h-48' : 'w-20 h-20 md:w-28 md:h-28'} object-contain transition-all duration-500`}
            style={{ filter: glowEffect }}
          />
        </div>

        {/* Rank Info - Takes remaining space */}
        <div className={`${vertical ? 'w-full px-2' : 'flex-1 min-w-0'}`}>
          {vertical ? (
            // Vertical layout: row-based stack
            <div className="flex flex-col gap-2">
              {/* Row 1: Rank Name & Tier */}
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold" style={{ color: rankInfo.color }}>
                  {rankInfo.rankName.toUpperCase()}
                </h3>
                <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
                  Tier {rankInfo.tier}
                </span>
              </div>

              {/* Row 2: Progress Bar */}
              {rankInfo.level < 30 && (
                <div className="w-full">
                  <ProgressBar
                    progress={rankInfo.progressToNextTier}
                    color={rankInfo.color}
                    height="h-2"
                    showLabel={false}
                  />
                </div>
              )}

              {/* Row 3: Percent & XP */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: rankInfo.color }}>
                  {Math.round(rankInfo.progressToNextTier)}%
                </span>
                <span className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                  {totalXP.toLocaleString()} XP
                </span>
              </div>

              {rankInfo.level === 30 && (
                <p className="text-xs font-semibold text-center mt-1" style={{ color: rankInfo.color }}>
                  MAX RANK ACHIEVED
                </p>
              )}

              {/* Row 4: View Ranks button (right aligned) */}
              {onViewRanks && (
                <div className="flex justify-end mt-1">
                  <button
                    onClick={onViewRanks}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                      ${showRanks
                        ? 'text-white shadow-md'
                        : 'hover:opacity-90'
                      }
                    `}
                    style={{
                      backgroundColor: showRanks ? accentColor : `${accentColor}20`,
                      color: showRanks ? 'white' : accentColor,
                    }}
                  >
                    <LayoutGrid size={12} />
                    {showRanks ? 'Hide Ranks' : 'View Ranks'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Horizontal layout: original layout
            <>
              <div className="flex items-start justify-between mb-0.5">
                <h3 className="text-lg md:text-2xl font-bold" style={{ color: rankInfo.color }}>
                  {rankInfo.rankName.toUpperCase()}
                </h3>
                {onViewRanks && (
                  <button
                    onClick={onViewRanks}
                    className={`
                      flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all
                      ${showRanks
                        ? 'text-white shadow-md'
                        : 'hover:opacity-90'
                      }
                    `}
                    style={{
                      backgroundColor: showRanks ? accentColor : `${accentColor}20`,
                      color: showRanks ? 'white' : accentColor,
                    }}
                  >
                    <LayoutGrid size={12} />
                    {showRanks ? 'Hide' : 'Ranks'}
                  </button>
                )}
              </div>
              <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-2">
                Tier {rankInfo.tier}
              </p>

              {/* Progress Bar */}
              {rankInfo.level < 30 && (
                <div className="relative">
                  <ProgressBar
                    progress={rankInfo.progressToNextTier}
                    color={rankInfo.color}
                    height="h-1.5"
                    showLabel={false}
                  />
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      {Math.round(rankInfo.progressToNextTier)}% to next tier
                    </p>
                    <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                      {totalXP.toLocaleString()} XP
                    </p>
                  </div>
                </div>
              )}
              {rankInfo.level === 30 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: rankInfo.color }}>
                    MAX RANK ACHIEVED
                  </p>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                    {totalXP.toLocaleString()} XP
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankDisplay;
