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
        <div className="flex-1 flex flex-col overflow-hidden relative bg-secondary-50 dark:bg-black">
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
              <div className="flex flex-col items-center justify-center h-full text-secondary-400">
                <p>Select a note or canvas to view</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NotesPage;
