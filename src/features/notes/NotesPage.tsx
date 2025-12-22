import { useEffect, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import {
  TabStrip,
  NotesLibrarySidebar,
  CanvasView,
  StandaloneNoteEditor,
} from './components';

function NotesPage() {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();
  const { tabs, activeTabId } = useWorkspaceStore();

  // Find the active tab
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const { closeTab } = useWorkspaceStore();
  const [isLibraryOpen, setIsLibraryOpen] = useState(!activeTab);

  // Remove any legacy home/dashboard tabs
  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.type === 'home') {
        closeTab(tab.id);
      }
    });
  }, [tabs, closeTab]);

  useEffect(() => {
    if (activeTab) {
      setIsLibraryOpen(false);
      return;
    }
    setIsLibraryOpen(true);
  }, [activeTab]);

  // If no user, don't render anything
  if (!user) {
    return null;
  }

  const pageClasses = `fixed inset-0 bottom-16 lg:bottom-0 ${
    isCollapsed ? 'lg:left-20' : 'lg:left-64'
  } transition-all duration-300 flex`;

  return (
    <div className={pageClasses}>
      {/* Notes Library Sidebar */}
      <div className="hidden lg:flex w-72 flex-shrink-0 h-full">
        <NotesLibrarySidebar />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-secondary-50 dark:bg-black">
        {/* Tab Bar */}
        <TabStrip onOpenLibrary={() => setIsLibraryOpen(true)} />

        {/* View Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Canvas View */}
          {activeTab?.type === 'canvas' && activeTab.entityId && (
            <ReactFlowProvider key={activeTab.entityId}>
              <CanvasView canvasId={activeTab.entityId} />
            </ReactFlowProvider>
          )}

          {/* Standalone Note View */}
          {activeTab?.type === 'note' && activeTab.entityId && (
            <StandaloneNoteEditor key={activeTab.entityId} noteId={activeTab.entityId} />
          )}

          {/* Empty State */}
          {!activeTab && (
            <div className="flex flex-col items-center justify-center h-full text-secondary-400">
              <p>Select a note or canvas to view</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Library Overlay */}
      {isLibraryOpen && (
        <div className="fixed inset-0 bottom-16 z-40 bg-secondary-50 dark:bg-black lg:hidden">
          <NotesLibrarySidebar onClose={() => setIsLibraryOpen(false)} />
        </div>
      )}
    </div>
  );
}

export default NotesPage;
