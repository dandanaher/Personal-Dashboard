import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useNotesStore } from '@/stores/notesStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { NotesCanvas, NoteEditor } from './components';
import { LoadingSpinner } from '@/components/ui';

function NotesPage() {
  const { user } = useAuthStore();
  const { loading, error, fetchNotes, selectedNoteId } = useNotesStore();
  const { isCollapsed } = useSidebarStore();

  // Fetch notes on mount
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, fetchNotes]);

  const canvasClasses = `fixed inset-0 bottom-16 lg:bottom-0 ${
    isCollapsed ? 'lg:left-20' : 'lg:left-64'
  } transition-all duration-300`;

  if (loading) {
    return (
      <div className={`${canvasClasses} flex items-center justify-center bg-light-bg dark:bg-secondary-900`}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${canvasClasses} flex items-center justify-center bg-light-bg dark:bg-secondary-900`}>
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load notes</p>
          <p className="text-secondary-500 text-sm">{error}</p>
          <button
            onClick={fetchNotes}
            className="mt-4 px-4 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className={canvasClasses}>
        <NotesCanvas />
        {selectedNoteId && <NoteEditor />}
      </div>
    </ReactFlowProvider>
  );
}

export default NotesPage;
