import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

function AppShell() {
  const location = useLocation();
  const isWideLayout = ['/goals', '/tasks', '/habits', '/workout'].includes(location.pathname);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen min-h-[100dvh] lg:h-screen lg:max-h-screen lg:overflow-hidden bg-light-bg dark:bg-secondary-900 overflow-x-hidden">
      {/* Sidebar for desktop - fixed height, no scroll */}
      <Sidebar />

      {/* Main content area - scrollable on desktop */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-safe-top px-safe-left px-safe-right pb-24 lg:pb-6 touch-pan-y">
        <div className={`mx-auto px-3 lg:px-8 py-3 lg:py-6 ${isWideLayout ? 'max-w-full' : 'max-w-lg lg:max-w-5xl xl:max-w-6xl'}`}>
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation - mobile only */}
      <BottomNav />
    </div>
  );
}

export default AppShell;
