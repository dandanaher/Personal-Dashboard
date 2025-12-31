import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useProfileStats, useProfile, useRankDecay } from '@/features/gamification/hooks';
import { RankDisplay, SettingsMenu, RankOverview } from '@/features/gamification/components';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DayOverview } from '@/components/DayOverview';
import { DynamicLogo } from '@/components/ui/DynamicLogo';

function HomePage() {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();
  const { attributes, loading: statsLoading, error: statsError } = useProfileStats();
  const { profile, loading: profileLoading } = useProfile();
  const { processing: decayProcessing } = useRankDecay();
  const [showRankOverview, setShowRankOverview] = useState(false);

  // Scroll to top on mount to align with other pages
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  // Get username with fallbacks: username -> email prefix -> "Traveler"
  const userName = profile?.username || user?.email?.split('@')[0] || 'Traveler';
  const greeting = getGreeting();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  // Calculate total XP for rank system (future-proof: sums ALL attributes)
  const totalXP = attributes.reduce((sum, attr) => sum + attr.current_xp, 0);

  // Desktop layout classes
  const desktopPageClasses = `hidden lg:flex fixed inset-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'} transition-all duration-300`;

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

  return (
    <>
      {/* Mobile View - shown on small screens */}
      <div className="lg:hidden min-h-full">
        {/* Header with Settings */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* MOBILE ONLY: Logo shown here since Sidebar (which has logo) is hidden on mobile */}
            <DynamicLogo size={40} />
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{greeting}</h1>
              <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-0.5">{userName}</p>
            </div>
          </div>
          {/* MOBILE ONLY: Settings button here since Sidebar (which has settings) is hidden on mobile */}
          <SettingsMenu />
        </div>

        {/* Rank Display */}
        <div className="mb-4">
          <RankDisplay
            totalXP={totalXP}
            isLoading={statsLoading || decayProcessing}
            onViewRanks={() => setShowRankOverview(!showRankOverview)}
            showRanks={showRankOverview}
          />
        </div>

        {/* Conditional View */}
        {showRankOverview ? <RankOverview totalXP={totalXP} /> : <DayOverview />}
      </div>

      {/* Desktop View - two-panel layout */}
      <div className={desktopPageClasses}>
        {/* Left Panel - User Info & Rank */}
        <div className="w-64 flex-shrink-0 h-full border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-6 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
            <div>
              <h1 className="text-xl font-bold text-secondary-900 dark:text-white">{greeting}</h1>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">{userName}</p>
            </div>
          </div>

          {/* Rank Display */}
          <div className="p-4 flex-1 overflow-y-auto">
            <RankDisplay
              totalXP={totalXP}
              isLoading={statsLoading || decayProcessing}
              onViewRanks={() => setShowRankOverview(!showRankOverview)}
              showRanks={showRankOverview}
              vertical
            />

            {/* Rank Overview in sidebar when active */}
            {showRankOverview && (
              <div className="mt-4">
                <RankOverview totalXP={totalXP} />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-light-bg dark:bg-secondary-900">
          {/* Header */}
          <div className="h-[60px] flex items-center px-6 border-b border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex-shrink-0">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {showRankOverview ? 'Rank Progress' : "Today's Overview"}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <DayOverview />
          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
