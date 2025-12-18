import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useNotesStore } from '@/stores/notesStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import {
  TabStrip,
  NotesDashboard,
  CanvasView,
  StandaloneNoteEditor,
  NoteEditor,
} from './components';

function NotesPage() {
  const { user } = useAuthStore();
  const { isCollapsed } = useSidebarStore();
  const { tabs, activeTabId, addTab } = useWorkspaceStore();
  const { selectedNoteId } = useNotesStore();

  // Find the active tab
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Ensure there's always a home/dashboard tab
  useEffect(() => {
    const hasHomeTab = tabs.some((t) => t.type === 'home');
    if (!hasHomeTab) {
      addTab('home');
    }
  }, [tabs, addTab]);

  // If no user, don't render anything
  if (!user) {
    return null;
  }

  const pageClasses = `fixed inset-0 bottom-16 lg:bottom-0 ${
    isCollapsed ? 'lg:left-20' : 'lg:left-64'
  } transition-all duration-300 flex flex-col`;

  return (
    <div className={pageClasses}>
      {/* Tab Bar */}
      <TabStrip />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Home/Dashboard View */}
        {activeTab?.type === 'home' && <NotesDashboard />}

        {/* Canvas View */}
        {activeTab?.type === 'canvas' && activeTab.entityId && (
          <ReactFlowProvider key={activeTab.entityId}>
            <CanvasView canvasId={activeTab.entityId} />
            {/* Note editor overlay for canvas notes */}
            {selectedNoteId && <NoteEditor />}
          </ReactFlowProvider>
        )}

        {/* Standalone Note View */}
        {activeTab?.type === 'note' && activeTab.entityId && (
          <StandaloneNoteEditor key={activeTab.entityId} noteId={activeTab.entityId} />
        )}
      </div>
    </div>
  );
}

export default NotesPage;
