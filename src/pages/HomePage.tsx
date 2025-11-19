import { useAuthStore } from '@/stores/authStore';
import { useProfileStats, useProfile } from '@/features/gamification/hooks';
import { FloraGrowth, StatCard, SettingsMenu } from '@/features/gamification/components';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function HomePage() {
  const { user } = useAuthStore();
  const { attributes, loading: statsLoading, error: statsError } = useProfileStats();
  const { profile, loading: profileLoading } = useProfile();

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

  // Calculate total level for display
  const totalLevel = attributes.reduce((sum, attr) => sum + attr.level, 0);

  return (
    <div className="min-h-full pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header with Settings */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
              {greeting}, {userName}
            </h1>
            <p className="text-secondary-500 dark:text-secondary-400">
              Total Level: {totalLevel}
            </p>
          </div>
          <SettingsMenu />
        </div>

        {/* Flora Growth */}
        <div className="mb-4">
          <FloraGrowth totalLevel={totalLevel} />
        </div>

        {/* Stat Cards Grid */}
        <div className="space-y-3">
          <h2 className="font-semibold text-secondary-900 dark:text-white">
            Your Stats
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {attributes.map(attr => (
              <StatCard key={attr.id} attribute={attr} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
