import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

function AppShell() {
  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh] bg-light-bg dark:bg-secondary-900 overflow-x-hidden">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-safe-top px-safe-left px-safe-right pb-24 touch-pan-y">
        <div className="max-w-lg mx-auto px-3 py-3">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

export default AppShell;
