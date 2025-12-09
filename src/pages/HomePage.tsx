import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStats, useProfile, useRankDecay } from '@/features/gamification/hooks';
import { RankDisplay, SettingsMenu, RankOverview } from '@/features/gamification/components';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DayOverview } from '@/components/DayOverview';

function HomePage() {
  const { user } = useAuthStore();
  const { attributes, loading: statsLoading, error: statsError } = useProfileStats();
  const { profile, loading: profileLoading } = useProfile();
  const { processing: decayProcessing } = useRankDecay();
  const [showRankOverview, setShowRankOverview] = useState(false);

  // Get username with fallbacks: username -> email prefix -> "Traveler"
  const userName = profile?.username || user?.email?.split('@')[0] || 'Traveler';
  const greeting = getGreeting();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  if (statsLoading || profileLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-2">Failed to load profile</p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{statsError}</p>
        </div>
      </div>
    );
  }

  // Calculate total XP for rank system (future-proof: sums ALL attributes)
  const totalXP = attributes.reduce((sum, attr) => sum + attr.current_xp, 0);

  return (
    <div className="min-h-full pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-4">
        {/* Header with Settings */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
              {greeting}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mt-1">
              {userName}
            </p>
          </div>
          <SettingsMenu />
        </div>

        {/* Rank Display */}
        <div className="mb-6">
          <RankDisplay
            totalXP={totalXP}
            isLoading={statsLoading || decayProcessing}
            onViewRanks={() => setShowRankOverview(!showRankOverview)}
            showRanks={showRankOverview}
          />
        </div>

        {/* Conditional View */}
        {showRankOverview ? (
          <RankOverview totalXP={totalXP} />
        ) : (
          <DayOverview />
        )}
      </div>
    </div>
  );
}

export default HomePage;
