import { getRankFromXP } from '../utils';

interface RankDisplayProps {
  totalXP: number;
  isLoading?: boolean;
  previewXP?: number | null; // Optional XP override for preview mode
}

/**
 * Get the image path for a rank based on name and tier
 */
function getRankImagePath(rankName: string, tier: 'I' | 'II' | 'III'): string {
  const tierNumber = tier === 'I' ? 1 : tier === 'II' ? 2 : 3;
  return `/Personal-Dashboard/images/ranks/${rankName.toLowerCase()}${tierNumber}.png`;
}

/**
 * Display user's current material rank with tier progression
 */
export function RankDisplay({ totalXP, isLoading = false, previewXP = null }: RankDisplayProps) {
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

  return (
    <div className="pb-4">
      {/* Preview Badge */}
      {isPreviewMode && (
        <div className="flex justify-center mb-3">
          <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-3 py-1 rounded font-medium">
            PREVIEW MODE
          </span>
        </div>
      )}

      {/* Rank Image */}
      <div className="flex items-center justify-center mb-6">
        <img
          src={imagePath}
          alt={`${rankInfo.rankName} ${rankInfo.tier}`}
          className="w-full max-w-sm h-auto object-contain"
        />
      </div>

      {/* Progress Bar */}
      {rankInfo.level < 30 && (
        <div className="mb-4">
          <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${rankInfo.progressToNextTier}%`,
                backgroundColor: rankInfo.color,
              }}
            />
          </div>
        </div>
      )}

      {/* Rank Info Below Progress Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: rankInfo.color }}>
          {rankInfo.rankName.toUpperCase()} - TIER {rankInfo.tier}
        </h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Level {rankInfo.level} • {displayXP.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}

export default RankDisplay;
