import { useEffect, useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import {
  TabStrip,
  NotesLibrarySidebar,
  CanvasView,
  StandaloneNoteEditor,
  MobileNotesView,
  MobileNoteEditor,
  MobileCanvasView,
} from './components';

type MobileView = 'list' | { type: 'note'; id: string } | { type: 'canvas'; id: string };

function NotesPage() {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();
  const { tabs, activeTabId, closeTab, addTab } = useWorkspaceStore();

  // Find the active tab
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Mobile-specific state
  const [mobileView, setMobileView] = useState<MobileView>('list');

  // Remove any legacy home/dashboard tabs
  useEffect(() => {
    tabs.forEach((tab) => {
      if (tab.type === 'home') {
        closeTab(tab.id);
      }
    });
  }, [tabs, closeTab]);

  // Handle mobile navigation
  const handleNoteClick = useCallback((noteId: string) => {
    setMobileView({ type: 'note', id: noteId });
    // Also open in desktop tabs for consistency
    addTab('note', noteId, 'Note');
  }, [addTab]);

  const handleCanvasClick = useCallback((canvasId: string) => {
    setMobileView({ type: 'canvas', id: canvasId });
    // Also open in desktop tabs for consistency
    addTab('canvas', canvasId, 'Canvas');
  }, [addTab]);

  const handleMobileClose = useCallback(() => {
    setMobileView('list');
  }, []);

  // If no user, don't render anything
  if (!user) {
    return null;
  }

  // Desktop classes - using fixed positioning for desktop experience
  const desktopPageClasses = `hidden lg:flex fixed inset-0 bottom-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'
    } transition-all duration-300`;

  return (
    <>
      {/* Mobile View - shown on small screens */}
      <div className="lg:hidden">
        {mobileView === 'list' && (
          <MobileNotesView
            onNoteClick={handleNoteClick}
            onCanvasClick={handleCanvasClick}
          />
        )}

        {typeof mobileView === 'object' && mobileView.type === 'note' && (
          <MobileNoteEditor
            noteId={mobileView.id}
            onClose={handleMobileClose}
          />
        )}

        {typeof mobileView === 'object' && mobileView.type === 'canvas' && (
          <MobileCanvasView
            canvasId={mobileView.id}
            onClose={handleMobileClose}
            onEditNote={(noteId) => setMobileView({ type: 'note', id: noteId })}
          />
        )}
      </div>

      {/* Desktop View - kept for larger screens */}
      <div className={desktopPageClasses}>
        {/* Notes Library Sidebar */}
        <div className="w-72 flex-shrink-0 h-full">
          <NotesLibrarySidebar />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-light-bg dark:bg-secondary-900">
          {/* Tab Bar */}
          <TabStrip />

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
              <div className="flex flex-col items-center justify-center h-full text-secondary-500 dark:text-secondary-400">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-secondary-100 dark:bg-secondary-800">
                    <svg className="w-6 h-6 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary-100 dark:bg-secondary-800">
                    <svg className="w-6 h-6 text-secondary-400 dark:text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                </div>
                <p className="text-base font-medium mb-1">No open tabs</p>
                <p className="text-sm text-secondary-400 dark:text-secondary-500">
                  Open a note or canvas from the library to start editing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NotesPage;
