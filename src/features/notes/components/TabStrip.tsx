import { X, Home, FileText, Layout, Menu } from 'lucide-react';
import { useWorkspaceStore, type TabType } from '@/stores/workspaceStore';
import { useThemeStore } from '@/stores/themeStore';

function getTabIcon(type: TabType) {
  switch (type) {
    case 'home':
      return <Home className="h-4 w-4" />;
    case 'canvas':
      return <Layout className="h-4 w-4" />;
    case 'note':
      return <FileText className="h-4 w-4" />;
    default:
      return null;
  }
}

interface TabStripProps {
  onOpenLibrary?: () => void;
}

export function TabStrip({ onOpenLibrary }: TabStripProps) {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkspaceStore();
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div className="h-[60px] flex items-end gap-2 bg-secondary-100 dark:bg-secondary-900 px-2 border-b border-secondary-200 dark:border-secondary-800 overflow-hidden">
      {onOpenLibrary && (
        <button
          onClick={onOpenLibrary}
          className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white/80 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 shadow-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors min-h-touch flex-shrink-0"
          aria-label="Open notes library"
        >
          <Menu className="h-4 w-4" style={{ color: accentColor }} />
          <span className="text-xs font-semibold">Library</span>
        </button>
      )}

      <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-thin min-w-0 flex-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isHome = tab.type === 'home';

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group relative flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium
                transition-colors duration-150 min-w-[100px] max-w-[200px] border-t border-x
                ${
                  isActive
                    ? 'bg-secondary-50 dark:bg-black text-secondary-900 dark:text-white border-secondary-200 dark:border-secondary-800 border-b-secondary-50 dark:border-b-black -mb-[1px] z-10'
                    : 'bg-transparent text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-800 border-transparent'
                }
              `}
              style={
                isActive
                  ? { borderTopColor: accentColor, borderTopWidth: '2px' }
                  : undefined
              }
            >
              {/* Icon */}
              <span
                className={isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}
                style={isActive ? { color: accentColor } : undefined}
              >
                {getTabIcon(tab.type)}
              </span>

              {/* Title */}
              <span className="truncate flex-1 text-left">{tab.title}</span>

              {/* Close button (never shown for home/dashboard tab) */}
              {!isHome && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`
                    ml-1 p-0.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700
                    ${isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'}
                    transition-opacity
                  `}
                  role="button"
                  aria-label={`Close ${tab.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TabStrip;
