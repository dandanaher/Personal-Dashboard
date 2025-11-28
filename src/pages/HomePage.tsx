import { useAuthStore } from '@/stores/authStore';
import { useProfileStats, useProfile, useRankDecay } from '@/features/gamification/hooks';
import { RankDisplay, StatCard, SettingsMenu } from '@/features/gamification/components';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function HomePage() {
  const { user } = useAuthStore();
  const { attributes, loading: statsLoading, error: statsError } = useProfileStats();
  const { profile, loading: profileLoading } = useProfile();
  const { processing: decayProcessing } = useRankDecay();

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
      <div className="max-w-lg mx-auto px-4 pt-2 pb-4">
        {/* Header with Settings */}
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {greeting}, {userName}
          </h1>
          <SettingsMenu />
        </div>

        {/* Rank Display */}
        <div className="mb-4">
          <RankDisplay totalXP={totalXP} isLoading={statsLoading || decayProcessing} />
        </div>

        {/* Stat Cards Grid */}
        <div className="space-y-3">
          <h2 className="font-semibold text-secondary-900 dark:text-white">Your Stats</h2>
          <div className="grid grid-cols-1 gap-3">
            {attributes.map((attr) => (
              <StatCard key={attr.id} attribute={attr} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
