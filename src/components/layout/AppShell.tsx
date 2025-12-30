/**
 * AppShell - Main layout wrapper for authenticated pages
 *
 * RESPONSIVE BEHAVIOR:
 * - Desktop (lg: 1024px+): Shows Sidebar on left, content scrolls vertically
 * - Mobile (<1024px): Shows BottomNav at bottom, full-width content
 *
 * The Sidebar and BottomNav components handle their own visibility via Tailwind:
 * - Sidebar: `hidden lg:flex` (hidden on mobile, visible on desktop)
 * - BottomNav: `lg:hidden` (visible on mobile, hidden on desktop)
 */
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

function AppShell() {
  const location = useLocation();
  const isWideLayout = ['/goals', '/tasks', '/habits', '/workout'].includes(location.pathname);

  return (
    // flex-col on mobile, flex-row on desktop (lg:)
    <div className="flex flex-col lg:flex-row min-h-screen min-h-[100dvh] lg:h-screen lg:max-h-screen lg:overflow-hidden bg-light-bg dark:bg-secondary-900 overflow-x-hidden">
      {/* DESKTOP ONLY: Sidebar navigation (uses `hidden lg:flex` internally) */}
      <Sidebar />

      {/* Main content area - pb-24 on mobile for BottomNav clearance, pb-6 on desktop */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-safe-top px-safe-left px-safe-right pb-24 lg:pb-6 touch-pan-y">
        <div className={`mx-auto px-3 lg:px-8 py-3 lg:py-6 ${isWideLayout ? 'max-w-full' : 'max-w-lg lg:max-w-5xl xl:max-w-6xl'}`}>
          <Outlet />
        </div>
      </main>

      {/* MOBILE ONLY: Bottom tab navigation (uses `lg:hidden` internally) */}
      <BottomNav />
    </div>
  );
}

export default AppShell;
