import { useState } from 'react';
import { RANK_DEFINITIONS, getRankFromXP } from '../utils';
import { X } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface RankOverviewProps {
  totalXP: number;
  className?: string;
}

interface RankDetail {
  rankName: string;
  tier: 'I' | 'II' | 'III';
  level: number;
  color: string;
  isUnlocked: boolean;
  isCurrent: boolean;
}

interface RankGroup {
  rankName: string;
  color: string;
  tiers: RankDetail[];
}

/**
 * Get the image path for a rank based on name and tier
 */
function getRankImagePath(rankName: string, tier: 'I' | 'II' | 'III'): string {
  const tierNumber = tier === 'I' ? 1 : tier === 'II' ? 2 : 3;
  return `/Personal-Dashboard/images/ranks/${rankName.toLowerCase()}${tierNumber}.png`;
}

/**
 * Generate all rank groups (10 ranks with 3 tiers each)
 */
function getAllRanks(currentLevel: number): RankGroup[] {
  const rankGroups: RankGroup[] = [];

  RANK_DEFINITIONS.forEach((rankDef) => {
    const tiers: RankDetail[] = [];

    // Each rank has 3 tiers (I, II, III)
    for (let i = 0; i < 3; i++) {
      const tier = (['I', 'II', 'III'] as const)[i];
      const level = rankDef.minLevel + i;

      tiers.push({
        rankName: rankDef.name,
        tier,
        level,
        color: rankDef.color,
        isUnlocked: level <= currentLevel,
        isCurrent: level === currentLevel,
      });
    }

    rankGroups.push({
      rankName: rankDef.name,
      color: rankDef.color,
      tiers,
    });
  });

  return rankGroups;
}

/**
 * Display all ranks in a 6x5 grid with unlock status
 */
export function RankOverview({ totalXP, className = '' }: RankOverviewProps) {
  const [selectedRank, setSelectedRank] = useState<RankDetail | null>(null);
  const { accentColor } = useThemeStore();
  const currentRank = getRankFromXP(totalXP);
  const rankGroups = getAllRanks(currentRank.level);

  // Calculate total unlocked ranks
  const totalUnlocked = rankGroups.reduce(
    (sum, group) => sum + group.tiers.filter((t) => t.isUnlocked).length,
    0
  );

  const handleRankClick = (rank: RankDetail) => {
    if (rank.isUnlocked) {
      setSelectedRank(rank);
    }
  };

  const closeModal = () => {
    setSelectedRank(null);
  };

  // Arrange ranks in pairs for 2-column layout
  const rankPairs: [RankGroup, RankGroup | null][] = [];
  for (let i = 0; i < rankGroups.length; i += 2) {
    rankPairs.push([rankGroups[i], rankGroups[i + 1] || null]);
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-secondary-900 dark:text-white">All Ranks</h2>
        <p className="text-sm text-secondary-600 dark:text-secondary-400">
          {totalUnlocked} / 30 unlocked
        </p>
      </div>

      {/* 6x5 Grid: 5 rows × 2 columns, each with 3 tiers */}
      <div className="space-y-3">
        {rankPairs.map(([leftRank, rightRank], rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-2 gap-4">
            {/* Left Rank */}
            <div className="space-y-1">
              <h3
                className="text-xs font-semibold uppercase text-center mb-2"
                style={{ color: leftRank.color }}
              >
                {leftRank.rankName}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {leftRank.tiers.map((tier) => (
                  <button
                    key={`${tier.rankName}-${tier.tier}`}
                    onClick={() => handleRankClick(tier)}
                    disabled={!tier.isUnlocked}
                    className={`
                      relative aspect-square overflow-hidden rounded-lg
                      transition-all duration-200 group
                      ${tier.isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                    style={tier.isCurrent ? { backgroundColor: `${accentColor}30` } : undefined}
                  >
                    {/* Rank Image */}
                    <div className="w-full h-full flex items-center justify-center relative z-10">
                      <img
                        src={getRankImagePath(tier.rankName, tier.tier)}
                        alt={`${tier.rankName} ${tier.tier}`}
                        className={`
                          w-full h-full object-contain
                          transition-all duration-200
                          ${tier.isUnlocked
                            ? 'opacity-100 group-hover:scale-110'
                            : 'opacity-5 grayscale brightness-50'
                          }
                        `}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Rank */}
            {rightRank && (
              <div className="space-y-1">
                <h3
                  className="text-xs font-semibold uppercase text-center mb-2"
                  style={{ color: rightRank.color }}
                >
                  {rightRank.rankName}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {rightRank.tiers.map((tier) => (
                    <button
                      key={`${tier.rankName}-${tier.tier}`}
                      onClick={() => handleRankClick(tier)}
                      disabled={!tier.isUnlocked}
                      className={`
                        relative aspect-square overflow-hidden rounded-lg
                        transition-all duration-200 group
                        ${tier.isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}
                      `}
                      style={tier.isCurrent ? { backgroundColor: `${accentColor}30` } : undefined}
                    >
                      {/* Rank Image */}
                      <div className="w-full h-full flex items-center justify-center relative z-10">
                        <img
                          src={getRankImagePath(tier.rankName, tier.tier)}
                          alt={`${tier.rankName} ${tier.tier}`}
                          className={`
                            w-full h-full object-contain
                            transition-all duration-200
                            ${tier.isUnlocked
                              ? 'opacity-100 group-hover:scale-110'
                              : 'opacity-5 grayscale brightness-50'
                            }
                          `}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rank Detail Modal */}
      {selectedRank && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-secondary-800 rounded-lg p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={getRankImagePath(selectedRank.rankName, selectedRank.tier)}
                  alt={`${selectedRank.rankName} ${selectedRank.tier}`}
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ color: selectedRank.color }}
                  >
                    {selectedRank.rankName.toUpperCase()}
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Tier {selectedRank.tier} • Level {selectedRank.level}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-600 dark:text-secondary-400">Status:</span>
                <span
                  className="font-semibold"
                  style={{ color: selectedRank.isCurrent ? selectedRank.color : undefined }}
                >
                  {selectedRank.isCurrent ? 'Current Rank' : 'Previously Achieved'}
                </span>
              </div>

              {/* Placeholder for rank history - to be implemented when database table is created */}
              <div className="pt-3 border-t border-secondary-200 dark:border-secondary-700">
                <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center italic">
                  Rank history tracking coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RankOverview;
