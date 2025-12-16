import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

function AppShell() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen min-h-[100dvh] bg-light-bg dark:bg-secondary-900 overflow-x-hidden">
      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-safe-top px-safe-left px-safe-right pb-24 lg:pb-6 touch-pan-y">
        <div className="max-w-lg lg:max-w-5xl xl:max-w-6xl mx-auto px-3 lg:px-8 py-3 lg:py-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation - mobile only */}
      <BottomNav />
    </div>
  );
}

export default AppShell;
