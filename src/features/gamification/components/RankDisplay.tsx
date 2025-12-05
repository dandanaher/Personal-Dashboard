import { getRankFromXP } from '../utils';
import { LayoutGrid } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface RankDisplayProps {
  totalXP: number;
  isLoading?: boolean;
  previewXP?: number | null; // Optional XP override for preview mode
  onViewRanks?: () => void; // Optional callback for viewing all ranks
  showRanks?: boolean; // Whether ranks view is currently shown
}

/**
 * Get the image path for a rank based on name and tier
 */
function getRankImagePath(rankName: string, tier: 'I' | 'II' | 'III'): string {
  const tierNumber = tier === 'I' ? 1 : tier === 'II' ? 2 : 3;
  return `/Personal-Dashboard/images/ranks/${rankName.toLowerCase()}${tierNumber}.png`;
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
export function RankDisplay({ totalXP, isLoading = false, previewXP = null, onViewRanks, showRanks = false }: RankDisplayProps) {
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

  // Use preview XP if provided, otherwise use actual XP
  const displayXP = previewXP !== null ? previewXP : totalXP;
  const rankInfo = getRankFromXP(displayXP);
  const isPreviewMode = previewXP !== null;
  const imagePath = getRankImagePath(rankInfo.rankName, rankInfo.tier);
  const glowEffect = getRankGlow(rankInfo.rankName, rankInfo.tier);

  return (
    <div className="pb-4">
      {/* Preview Badge */}
      {isPreviewMode && (
        <div className="flex justify-center mb-2">
          <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-2 py-0.5 rounded font-medium">
            PREVIEW MODE
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Rank Image - Smaller and on the left */}
        <div className="flex-shrink-0">
          <img
            src={imagePath}
            alt={`${rankInfo.rankName} ${rankInfo.tier}`}
            className="w-24 h-24 md:w-28 md:h-28 object-contain transition-all duration-500"
            style={{ filter: glowEffect }}
          />
        </div>

        {/* Rank Info - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-xl md:text-2xl font-bold" style={{ color: rankInfo.color }}>
              {rankInfo.rankName.toUpperCase()}
            </h3>
            {onViewRanks && (
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
                <LayoutGrid size={14} />
                {showRanks ? 'Hide Ranks' : 'View Ranks'}
              </button>
            )}
          </div>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
            Tier {rankInfo.tier} • Level {rankInfo.level} • {displayXP.toLocaleString()} XP
          </p>

          {/* Progress Bar */}
          {rankInfo.level < 30 && (
            <div>
              <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${rankInfo.progressToNextTier}%`,
                    backgroundColor: rankInfo.color,
                  }}
                />
              </div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                {Math.round(rankInfo.progressToNextTier)}% to next tier
              </p>
            </div>
          )}
          {rankInfo.level === 30 && (
            <p className="text-xs font-semibold" style={{ color: rankInfo.color }}>
              MAX RANK ACHIEVED
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankDisplay;
