import { X, Home, FileText, Layout } from 'lucide-react';
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

export function TabStrip() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkspaceStore();
  const accentColor = useThemeStore((state) => state.accentColor);

  return (
    <div className="flex items-end gap-0.5 overflow-x-auto bg-secondary-100 dark:bg-secondary-800 px-2 pt-2 min-h-[42px] scrollbar-thin">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isHome = tab.type === 'home';

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              group relative flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium
              transition-colors duration-150 min-w-[100px] max-w-[200px]
              ${
                isActive
                  ? 'bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white border-t border-x border-secondary-200 dark:border-secondary-700'
                  : 'bg-secondary-50 dark:bg-secondary-700/50 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 border-transparent'
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
                  ml-1 p-0.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-600
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
  );
}

export default TabStrip;
