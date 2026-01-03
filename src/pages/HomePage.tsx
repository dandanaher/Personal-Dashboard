import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DayOverview } from '@/components/DayOverview';
import { DynamicLogo } from '@/components/ui/DynamicLogo';
import { EditModeButton } from '@/features/homepage/components/EditModeButton';
import { SettingsMenu } from '@/components/layout/SettingsMenu';

function HomePage() {
  const user = useAuthStore((state) => state.user);
  const { profile, loading: profileLoading, error: profileError } = useProfile();

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

  if (profileLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-2">Failed to load profile</p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{profileError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* MOBILE ONLY: Logo shown here since Sidebar (which has logo) is hidden on mobile */}
          <div className="lg:hidden">
            <DynamicLogo size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{greeting}</h1>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-0.5">{userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditModeButton />
          <div className="lg:hidden">
            <SettingsMenu />
          </div>
        </div>
      </div>

      <DayOverview />
    </div>
  );
}

export default HomePage;
